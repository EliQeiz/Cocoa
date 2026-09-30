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
    };
    console.log(JSON.stringify(summary, null, 2));

    if (
      summary.tables.length !== 26 ||
      summary.rlsEnabledTableCount !== 26 ||
      summary.policyCount !== 26 ||
      summary.evidenceStoragePolicyCount !== 3 ||
      !summary.evidenceRegistrationCommandAvailable ||
      !summary.materialReceiptCommandAvailable ||
      !summary.inspectionSubmissionAvailable ||
      !summary.independentInspectionReviewAvailable ||
      !summary.inspectionSubmitterRecorded ||
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
