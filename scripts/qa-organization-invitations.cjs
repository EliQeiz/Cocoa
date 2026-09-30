const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

function readEnvironmentValue(name) {
  const line = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).find((entry) => entry.trim().startsWith(`${name}=`));
  if (!line) throw new Error(`${name} is missing from .env.local`);
  return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
}

async function expectSqlError(client, query, parameters, expectedCode, label) {
  await client.query('SAVEPOINT expected_failure');
  try {
    await client.query(query, parameters);
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT expected_failure');
    if (error.code !== expectedCode) throw new Error(`${label} returned unexpected SQLSTATE ${error.code || 'unknown'}.`);
    return;
  }
  await client.query('ROLLBACK TO SAVEPOINT expected_failure');
  throw new Error(`${label} unexpectedly succeeded.`);
}

async function setIdentity(client, id, email, fullName) {
  await client.query('select set_config(\'request.jwt.claim.sub\', $1, true)', [id]);
  await client.query('select set_config(\'request.jwt.claims\', $1, true)', [JSON.stringify({
    sub: id,
    email,
    role: 'authenticated',
    user_metadata: { full_name: fullName },
  })]);
}

async function main() {
  const client = new Client({
    connectionString: readEnvironmentValue('SUPABASE_DB_URL'),
    password: readEnvironmentValue('SUPABASE_DB_PASSWORD'),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  let transactionOpen = false;
  let stage = 'connecting';

  try {
    await client.query('begin');
    transactionOpen = true;
    const ownerResult = await client.query(`
      select m.organization_id, u.id as user_id, lower(u.email) as email
      from public.organization_memberships m
      join auth.users u on u.id = m.user_id
      where m.status = 'active' and m.role in ('organization_owner', 'organization_admin')
      order by (m.role = 'organization_owner') desc, m.created_at asc
      limit 1;
    `);
    if (!ownerResult.rowCount) throw new Error('No active organization owner/admin is available for rollback-only QA.');
    const owner = ownerResult.rows[0];
    stage = 'create invitation';
    const inviteEmail = `qa-${randomUUID()}@example.invalid`;
    const acceptedUserId = randomUUID();

    await client.query('set local role authenticated');
    await setIdentity(client, owner.user_id, owner.email, 'BuildProof QA Owner');
    const firstInvite = await client.query(
      'select * from public.create_organization_invitation($1, $2, $3::public.membership_role)',
      [owner.organization_id, inviteEmail, 'engineer'],
    );
    const invite = firstInvite.rows[0];
    if (!invite?.invite_token || invite.invite_token.length < 60) throw new Error('Invitation creation did not return a strong bearer token.');

    await client.query('reset role');
    const digest = await client.query(
      'select token_hash = encode(sha256(convert_to($1, \'UTF8\')), \'hex\') as matches from public.organization_invitations where id = $2',
      [invite.invite_token, invite.invitation_id],
    );
    if (!digest.rows[0]?.matches) throw new Error('Invitation bearer token was not stored as its SHA-256 digest.');
    const privileges = await client.query("select not has_column_privilege('authenticated', 'public.organization_invitations', 'token_hash', 'select') as hidden");
    if (!privileges.rows[0]?.hidden) throw new Error('Invitation token digest is readable by browser sessions.');

    stage = 'reject email mismatch';
    await client.query('set local role authenticated');
    await setIdentity(client, owner.user_id, owner.email, 'BuildProof QA Owner');
    await expectSqlError(
      client,
      'select public.accept_organization_invitation($1)',
      [invite.invite_token],
      '42501',
      'Email-mismatch acceptance check',
    );

    await client.query('reset role');
    const sourceUser = await client.query('select * from auth.users where id = $1', [owner.user_id]);
    stage = 'create rollback-only synthetic auth user';
    const source = sourceUser.rows[0];
    const syntheticUser = {
      ...source,
      id: acceptedUserId,
      email: inviteEmail,
      email_confirmed_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sign_in_at: null,
      phone: null,
      phone_confirmed_at: null,
      raw_app_meta_data: { provider: 'email', providers: ['email'] },
      raw_user_meta_data: { full_name: 'BuildProof QA Member' },
      confirmation_token: randomUUID(),
      recovery_token: randomUUID(),
      email_change_token_new: randomUUID(),
      email_change_token_current: randomUUID(),
      reauthentication_token: randomUUID(),
      phone_change: '',
      phone_change_token: randomUUID(),
      is_super_admin: false,
      is_anonymous: false,
      deleted_at: null,
      banned_until: null,
    };
    const userColumns = await client.query(`
      select attname from pg_attribute
      where attrelid = 'auth.users'::regclass and attnum > 0
        and not attisdropped and attgenerated = ''
      order by attnum;
    `);
    const insertColumns = userColumns.rows.map((row) => `"${row.attname}"`).join(', ');
    const legacyHook = await client.query(`
      select exists (
        select 1 from pg_trigger
        where tgrelid = 'auth.users'::regclass and tgname = 'provision_invited_user_on_auth_signup'
          and not tgisinternal
      ) as present;
    `);
    if (legacyHook.rows[0].present) throw new Error('Obsolete signup trigger still intercepts invitation signup.');
    await client.query(`insert into auth.users (${insertColumns}) select ${insertColumns} from jsonb_populate_record(null::auth.users, $1::jsonb)`, [JSON.stringify(syntheticUser)]);

    await client.query('set local role authenticated');
    stage = 'accept invitation and verify membership';
    await setIdentity(client, acceptedUserId, inviteEmail, 'BuildProof QA Member');
    const accepted = await client.query('select public.accept_organization_invitation($1) as organization_id', [invite.invite_token]);
    if (accepted.rows[0]?.organization_id !== owner.organization_id) throw new Error('Acceptance returned the wrong tenant.');
    await expectSqlError(
      client,
      'select * from public.create_organization_invitation($1, $2, $3::public.membership_role)',
      [owner.organization_id, `qa-escalation-${randomUUID()}@example.invalid`, 'engineer'],
      '42501',
      'Non-admin invitation authorization check',
    );
    await expectSqlError(
      client,
      'select public.accept_organization_invitation($1)',
      [invite.invite_token],
      '22023',
      'Single-use acceptance check',
    );
    await client.query('reset role');
    const membership = await client.query(`
      select m.status, m.role, i.accepted_at is not null as accepted
      from public.organization_memberships m
      join public.organization_invitations i on i.organization_id = m.organization_id and i.email = $1
      where m.organization_id = $2 and m.user_id = $3 and i.id = $4;
    `, [inviteEmail, owner.organization_id, acceptedUserId, invite.invitation_id]);
    if (membership.rows[0]?.status !== 'active' || membership.rows[0]?.role !== 'engineer' || !membership.rows[0]?.accepted) {
      throw new Error('Acceptance did not activate the expected tenant membership and consume the invitation.');
    }

    await client.query('set local role authenticated');
    stage = 'revoke invitation';
    await setIdentity(client, owner.user_id, owner.email, 'BuildProof QA Owner');
    const revokeEmail = `qa-revoke-${randomUUID()}@example.invalid`;
    const secondInvite = await client.query(
      'select * from public.create_organization_invitation($1, $2, $3::public.membership_role)',
      [owner.organization_id, revokeEmail, 'site_receiver'],
    );
    await client.query('select public.revoke_organization_invitation($1)', [secondInvite.rows[0].invitation_id]);
    await expectSqlError(
      client,
      'select public.accept_organization_invitation($1)',
      [secondInvite.rows[0].invite_token],
      '22023',
      'Revoked-link acceptance check',
    );

    console.log('Invitation QA passed: signup-hook safety, create, digest privacy, email binding, accept, non-admin denial, single-use enforcement, revoke and revoked-link rejection.');
    console.log('All QA records (including the synthetic auth user and memberships) are being rolled back.');
  } catch (error) {
    error.stage = stage;
    throw error;
  } finally {
    if (transactionOpen) await client.query('rollback');
    await client.end();
  }
}

main().catch((error) => {
  console.error('Invitation QA failed during', error.stage || '', error.code || '', error.message);
  process.exitCode = 1;
});
