const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

function readEnvironmentValue(name) {
  const line = fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));
  if (!line) throw new Error(`${name} is missing from .env.local`);
  return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
}

async function setIdentity(client, id, email) {
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
  await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({
    sub: id,
    email,
    role: 'authenticated',
  })]);
}

async function expectSqlError(client, query, parameters, expectedCode, label) {
  await client.query('savepoint expected_failure');
  try {
    await client.query(query, parameters);
  } catch (error) {
    await client.query('rollback to savepoint expected_failure');
    if (error.code !== expectedCode) {
      throw new Error(`${label} returned unexpected SQLSTATE ${error.code || 'unknown'}.`);
    }
    return;
  }
  await client.query('rollback to savepoint expected_failure');
  throw new Error(`${label} unexpectedly succeeded.`);
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

    stage = 'locate an authorized project actor';
    const actorResult = await client.query(`
      select
        membership.id as membership_id,
        membership.organization_id,
        auth_user.id as user_id,
        lower(auth_user.email) as email,
        project.id as project_id
      from public.organization_memberships membership
      join auth.users auth_user on auth_user.id = membership.user_id
      join public.projects project on project.organization_id = membership.organization_id
      where membership.status = 'active'
        and membership.role in ('organization_owner', 'organization_admin')
      order by (membership.role = 'organization_owner') desc, membership.created_at asc
      limit 1;
    `);
    if (!actorResult.rowCount) throw new Error('No active owner/admin with a project is available for rollback-only QA.');
    const actor = actorResult.rows[0];
    const suffix = randomUUID().slice(0, 8).toUpperCase();

    const freeLogDateResult = await client.query(`
      select candidate::date as log_date
      from generate_series(current_date - 20000, current_date - 10000, interval '1 day') candidate
      where not exists (
        select 1 from public.project_daily_logs log
        where log.project_id = $1 and log.log_date = candidate::date
      )
      limit 1;
    `, [actor.project_id]);
    if (!freeLogDateResult.rowCount) throw new Error('No collision-free rollback-only daily-log date was available.');
    const logDate = freeLogDateResult.rows[0].log_date.toISOString().slice(0, 10);

    stage = 'create each enterprise workflow record';
    await client.query('set local role authenticated');
    await setIdentity(client, actor.user_id, actor.email);
    const rfi = await client.query(
      'select public.create_project_rfi($1, $2, $3, $4, $5, $6) as id',
      [actor.project_id, `RFI-${suffix}`, 'QA structural coordination query', 'Confirm the rollback-only QA coordination detail.', 'high', null],
    );
    const submittal = await client.query(
      'select public.create_project_submittal($1, $2, $3, $4, $5) as id',
      [actor.project_id, `SUB-${suffix}`, 'QA reinforcement submittal', '03 20 00', null],
    );
    const dailyLog = await client.query(
      'select public.create_project_daily_log($1, $2, $3, $4, $5, $6, $7) as id',
      [actor.project_id, logDate, 'Clear, rollback-only QA', 'Validated the enterprise workflow command path.', 12, 'None', 'None'],
    );
    const changeOrder = await client.query(
      'select public.create_project_change_order($1, $2, $3, $4, $5, $6) as id',
      [actor.project_id, `CO-${suffix}`, 'QA scope coordination', 'Rollback-only commercial workflow validation.', '1250.00', 'GHS'],
    );

    const createdIds = [rfi.rows[0]?.id, submittal.rows[0]?.id, dailyLog.rows[0]?.id, changeOrder.rows[0]?.id];
    if (createdIds.some((id) => !id)) throw new Error('One or more workflow commands did not return a record identifier.');

    await client.query('reset role');
    stage = 'verify records and immutable audit events';
    const records = await client.query(`
      select
        exists(select 1 from public.project_rfis where id = $1 and organization_id = $5) as rfi_created,
        exists(select 1 from public.project_submittals where id = $2 and organization_id = $5) as submittal_created,
        exists(select 1 from public.project_daily_logs where id = $3 and organization_id = $5) as daily_log_created,
        exists(select 1 from public.project_change_orders where id = $4 and organization_id = $5) as change_order_created,
        (select count(*) from public.audit_events where entity_id = any($6::uuid[])) as audit_count;
    `, [...createdIds, actor.organization_id, createdIds]);
    const verified = records.rows[0];
    if (!verified.rfi_created || !verified.submittal_created || !verified.daily_log_created || !verified.change_order_created) {
      throw new Error('A workflow command did not persist the expected tenant-scoped record.');
    }
    if (Number(verified.audit_count) !== 4) throw new Error('Workflow creation did not append exactly four audit events.');

    stage = 'verify least-privilege role enforcement';
    await client.query("update public.organization_memberships set role = 'funder_viewer' where id = $1", [actor.membership_id]);
    await client.query('set local role authenticated');
    await setIdentity(client, actor.user_id, actor.email);
    await expectSqlError(
      client,
      'select public.create_project_rfi($1, $2, $3, $4, $5, $6)',
      [actor.project_id, `RFI-DENIED-${suffix}`, 'Denied QA query', 'This write must be rejected.', 'normal', null],
      '42501',
      'Read-only funder RFI creation',
    );
    await client.query('reset role');

    stage = 'verify anonymous execution denial';
    const privileges = await client.query(`
      select
        has_function_privilege('anon', 'public.create_project_rfi(uuid,text,text,text,text,date)', 'EXECUTE') as rfi,
        has_function_privilege('anon', 'public.create_project_submittal(uuid,text,text,text,date)', 'EXECUTE') as submittal,
        has_function_privilege('anon', 'public.create_project_daily_log(uuid,date,text,text,integer,text,text)', 'EXECUTE') as daily_log,
        has_function_privilege('anon', 'public.create_project_change_order(uuid,text,text,text,numeric,text)', 'EXECUTE') as change_order;
    `);
    if (Object.values(privileges.rows[0]).some(Boolean)) throw new Error('An enterprise workflow command is executable by anonymous callers.');

    console.log('Enterprise workflow QA passed: RFI, submittal, daily log and change-order creation, tenant audit logging, role denial and anonymous denial.');
    console.log('All QA records and the temporary role change are being rolled back.');
  } catch (error) {
    error.stage = stage;
    throw error;
  } finally {
    if (transactionOpen) await client.query('rollback');
    await client.end();
  }
}

main().catch((error) => {
  console.error('Enterprise workflow QA failed during', error.stage || '', error.code || '', error.message);
  process.exitCode = 1;
});
