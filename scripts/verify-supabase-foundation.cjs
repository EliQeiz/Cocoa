const fs = require('node:fs');
const { Client } = require('pg');

function environmentValue(name) {
  const entry = fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith(`${name}=`));

  if (!entry) throw new Error(`${name} is missing from .env.local`);

  return entry
    .slice(entry.indexOf('=') + 1)
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

async function main() {
  const client = new Client({
    connectionString: environmentValue('SUPABASE_DB_URL'),
    password: environmentValue('SUPABASE_DB_PASSWORD'),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const tables = await client.query(`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_type = 'BASE TABLE'
          and table_name <> 'spatial_ref_sys'
        order by table_name;
      `);
    const rls = await client.query(`
        select count(*)::int as count
        from pg_class relation
        join pg_namespace namespace on namespace.oid = relation.relnamespace
        where namespace.nspname = 'public'
          and relation.relkind = 'r'
          and relation.relname <> 'spatial_ref_sys'
          and relation.relrowsecurity;
      `);
    const policies = await client.query(`
        select count(*)::int as count
        from pg_policies
        where schemaname = 'public';
      `);
    const bucket = await client.query(`
        select id, public, file_size_limit
        from storage.buckets
        where id = 'buildproof-evidence';
      `);
    const evidencePolicies = await client.query(`
        select count(*)::int as count
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname in (
            'buildproof_evidence_member_read',
            'buildproof_evidence_member_upload',
            'buildproof_evidence_orphan_cleanup'
          );
      `);
    const evidenceCommand = await client.query(`
        select to_regprocedure(
          'public.register_delivery_evidence(uuid,uuid,text,text,text,bigint,text,text)'
        ) is not null as available;
      `);
    const receiptCommand = await client.query(`
        select to_regprocedure(
          'public.receive_project_material_delivery(uuid,uuid,numeric,text,text,text,text,text)'
        ) is not null as available;
      `);
    const inspectionCommands = await client.query(`
        select
          to_regprocedure('public.create_project_batch_inspection(uuid,uuid,uuid,numeric,text,uuid)') is not null as submit_available,
          to_regprocedure('public.review_project_inspection(uuid,public.verification_status,text)') is not null as review_available,
          exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'verifications'
              and column_name = 'submitted_by'
          ) as submitter_recorded;
      `);
    const invitationCommands = await client.query(`
        select
          to_regprocedure('public.create_organization_invitation(uuid,text,public.membership_role)') is not null as create_available,
          to_regprocedure('public.accept_organization_invitation(text)') is not null as accept_available,
          to_regprocedure('public.revoke_organization_invitation(uuid)') is not null as revoke_available,
          exists (
            select 1 from information_schema.tables
            where table_schema = 'public' and table_name = 'organization_invitations'
          ) as table_available,
          coalesce((select relrowsecurity from pg_class where oid = 'public.organization_invitations'::regclass), false) as rls_enabled,
          not has_column_privilege('authenticated', 'public.organization_invitations', 'token_hash', 'select') as token_digest_private;
      `);
    const legacyInviteHook = await client.query(`
        select exists (
          select 1 from pg_trigger
          where tgrelid = 'auth.users'::regclass
            and tgname = 'provision_invited_user_on_auth_signup'
            and not tgisinternal
        ) as present;
      `);
    const securityHardening = await client.query(`
        select
          to_regclass('private.action_rate_limits') is not null as rate_limit_table,
          exists (
            select 1 from pg_trigger
            where tgrelid = 'public.audit_events'::regclass
              and tgname = 'audit_events_rate_limit' and not tgisinternal
          ) as rate_limit_trigger,
          exists (
            select 1 from pg_policies
            where schemaname = 'public' and tablename = 'organization_invitations'
              and policyname = 'organization_invitations_read_admin'
          ) as invitation_admin_policy,
          exists (
            select 1 from pg_policies
            where schemaname = 'public' and tablename = 'organization_memberships'
              and policyname = 'memberships_read_self_or_admin'
          ) as membership_admin_policy;
      `);
    const constructionWorkflows = await client.query(`
        select
          to_regclass('public.project_rfis') is not null as rfis_table,
          to_regclass('public.project_submittals') is not null as submittals_table,
          to_regclass('public.project_daily_logs') is not null as daily_logs_table,
          to_regclass('public.project_change_orders') is not null as change_orders_table,
          to_regprocedure('public.create_project_rfi(uuid,text,text,text,text,date)') is not null as rfi_command,
          to_regprocedure('public.create_project_submittal(uuid,text,text,text,date)') is not null as submittal_command,
          to_regprocedure('public.create_project_daily_log(uuid,date,text,text,integer,text,text)') is not null as daily_log_command,
          to_regprocedure('public.create_project_change_order(uuid,text,text,text,numeric,text)') is not null as change_order_command,
          (
            select count(*) = 4
            from pg_class relation
            join pg_namespace namespace on namespace.oid = relation.relnamespace
            where namespace.nspname = 'public'
              and relation.relname in ('project_rfis','project_submittals','project_daily_logs','project_change_orders')
              and relation.relrowsecurity
          ) as workflow_rls;
      `);
    const unsafeDefinerFunctions = await client.query(`
        select namespace.nspname, procedure.proname
        from pg_proc procedure
        join pg_namespace namespace on namespace.oid = procedure.pronamespace
        where namespace.nspname in ('public', 'private')
          and procedure.prosecdef
          and not exists (
            select 1 from pg_depend dependency
            where dependency.classid = 'pg_proc'::regclass
              and dependency.objid = procedure.oid
              and dependency.deptype = 'e'
          )
          and not exists (
            select 1 from unnest(coalesce(procedure.proconfig, array[]::text[])) setting
            where setting like 'search_path=%'
          );
      `);
    const exposedDefinerFunctions = await client.query(`
        select distinct namespace.nspname, procedure.proname,
          pg_get_function_identity_arguments(procedure.oid) as arguments,
          case when privilege.grantee = 0 then 'PUBLIC' else role.rolname end as grantee
        from pg_proc procedure
        join pg_namespace namespace on namespace.oid = procedure.pronamespace
        cross join lateral aclexplode(coalesce(procedure.proacl, acldefault('f', procedure.proowner))) privilege
        left join pg_roles role on role.oid = privilege.grantee
        where namespace.nspname in ('public', 'private')
          and procedure.prosecdef
          and not exists (
            select 1 from pg_depend dependency
            where dependency.classid = 'pg_proc'::regclass
              and dependency.objid = procedure.oid
              and dependency.deptype = 'e'
          )
          and privilege.privilege_type = 'EXECUTE'
          and (privilege.grantee = 0 or role.rolname = 'anon');
      `);
    const directBrowserWrites = await client.query(`
        select table_name, grantee, privilege_type
        from information_schema.table_privileges
        where table_schema = 'public'
          and table_name in (
            select table_name from information_schema.tables
            where table_schema = 'public' and table_type = 'BASE TABLE'
              and table_name <> 'spatial_ref_sys'
          )
          and grantee in ('anon', 'authenticated')
          and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');
      `);

    const summary = {
      tables: tables.rows.map((row) => row.table_name),
      rlsEnabledTableCount: rls.rows[0].count,
      policyCount: policies.rows[0].count,
      evidenceBucket: bucket.rows[0] || null,
      evidenceStoragePolicyCount: evidencePolicies.rows[0].count,
      evidenceRegistrationCommandAvailable: evidenceCommand.rows[0].available,
      materialReceiptCommandAvailable: receiptCommand.rows[0].available,
      inspectionSubmissionAvailable: inspectionCommands.rows[0].submit_available,
      independentInspectionReviewAvailable: inspectionCommands.rows[0].review_available,
      inspectionSubmitterRecorded: inspectionCommands.rows[0].submitter_recorded,
      invitationCreationAvailable: invitationCommands.rows[0].create_available,
      invitationAcceptanceAvailable: invitationCommands.rows[0].accept_available,
      invitationRevocationAvailable: invitationCommands.rows[0].revoke_available,
      invitationTableAvailable: invitationCommands.rows[0].table_available,
      invitationRlsEnabled: invitationCommands.rows[0].rls_enabled,
      invitationTokenDigestPrivate: invitationCommands.rows[0].token_digest_private,
      obsoleteInvitationSignupTriggerPresent: legacyInviteHook.rows[0].present,
      domainRateLimitTableAvailable: securityHardening.rows[0].rate_limit_table,
      domainRateLimitTriggerAvailable: securityHardening.rows[0].rate_limit_trigger,
      invitationReadRestrictedToAdmins: securityHardening.rows[0].invitation_admin_policy,
      membershipDirectoryRestrictedToSelfOrAdmins: securityHardening.rows[0].membership_admin_policy,
      constructionWorkflowTablesAvailable: constructionWorkflows.rows[0].rfis_table && constructionWorkflows.rows[0].submittals_table && constructionWorkflows.rows[0].daily_logs_table && constructionWorkflows.rows[0].change_orders_table,
      constructionWorkflowCommandsAvailable: constructionWorkflows.rows[0].rfi_command && constructionWorkflows.rows[0].submittal_command && constructionWorkflows.rows[0].daily_log_command && constructionWorkflows.rows[0].change_order_command,
      constructionWorkflowRlsEnabled: constructionWorkflows.rows[0].workflow_rls,
      unsafeSecurityDefinerFunctionCount: unsafeDefinerFunctions.rowCount,
      unsafeSecurityDefinerFunctions: unsafeDefinerFunctions.rows,
      publiclyExposedSecurityDefinerFunctionCount: exposedDefinerFunctions.rowCount,
      publiclyExposedSecurityDefinerFunctions: exposedDefinerFunctions.rows,
      directBrowserWriteGrantCount: directBrowserWrites.rowCount,
      directBrowserWriteGrants: directBrowserWrites.rows,
    };
    console.log(JSON.stringify(summary, null, 2));

    if (
      summary.tables.length !== 31 ||
      summary.rlsEnabledTableCount !== 31 ||
      summary.policyCount !== 31 ||
      summary.evidenceStoragePolicyCount !== 3 ||
      !summary.evidenceRegistrationCommandAvailable ||
      !summary.materialReceiptCommandAvailable ||
      !summary.inspectionSubmissionAvailable ||
      !summary.independentInspectionReviewAvailable ||
      !summary.inspectionSubmitterRecorded ||
      !summary.invitationCreationAvailable ||
      !summary.invitationAcceptanceAvailable ||
      !summary.invitationRevocationAvailable ||
      !summary.invitationTableAvailable ||
      !summary.invitationRlsEnabled ||
      !summary.invitationTokenDigestPrivate ||
      summary.obsoleteInvitationSignupTriggerPresent ||
      !summary.domainRateLimitTableAvailable ||
      !summary.domainRateLimitTriggerAvailable ||
      !summary.invitationReadRestrictedToAdmins ||
      !summary.membershipDirectoryRestrictedToSelfOrAdmins ||
      !summary.constructionWorkflowTablesAvailable ||
      !summary.constructionWorkflowCommandsAvailable ||
      !summary.constructionWorkflowRlsEnabled ||
      summary.unsafeSecurityDefinerFunctionCount !== 0 ||
      summary.publiclyExposedSecurityDefinerFunctionCount !== 0 ||
      summary.directBrowserWriteGrantCount !== 0 ||
      !summary.evidenceBucket ||
      summary.evidenceBucket.public
    ) {
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Verification failed:', error.code || '', error.message);
  process.exitCode = 1;
});
