const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

function readEnvironmentValue(name) {
  const environmentPath = path.join(process.cwd(), '.env.local');
  const line = fs
    .readFileSync(environmentPath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));

  if (!line) {
    throw new Error(`${name} is missing from .env.local`);
  }

  return line
    .slice(line.indexOf('=') + 1)
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function readOptionalEnvironmentValue(name) {
  try {
    return readEnvironmentValue(name);
  } catch {
    return undefined;
  }
}

async function main() {
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '202609280001_buildproof_foundation.sql',
  );
  const connectionString = readEnvironmentValue('SUPABASE_DB_URL');
  const passwordOverride = readOptionalEnvironmentValue('SUPABASE_DB_PASSWORD');
  const client = new Client({
    connectionString,
    ...(passwordOverride ? { password: passwordOverride } : {}),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000,
  });

  await client.connect();
  await client.query('BEGIN');

  try {
    await client.query(fs.readFileSync(migrationPath, 'utf8'));
    await client.query('COMMIT');
    console.log('BuildProof foundation migration applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.code || '', error.message);
  process.exitCode = 1;
});
