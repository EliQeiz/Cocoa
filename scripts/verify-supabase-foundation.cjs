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

    const summary = {
      tables: tables.rows.map((row) => row.table_name),
      rlsEnabledTableCount: rls.rows[0].count,
      policyCount: policies.rows[0].count,
      evidenceBucket: bucket.rows[0] || null,
    };
    console.log(JSON.stringify(summary, null, 2));

    if (
      summary.tables.length !== 26 ||
      summary.rlsEnabledTableCount !== 26 ||
      summary.policyCount !== 26 ||
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
