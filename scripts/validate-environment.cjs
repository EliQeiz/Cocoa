const fs = require('node:fs');

function fileEnvironment(filename) {
  if (!fs.existsSync(filename)) return {};
  return Object.fromEntries(fs.readFileSync(filename, 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) return [];
    return [[match[1], match[2].replace(/^['"]|['"]$/g, '')]];
  }));
}

const values = { ...fileEnvironment('.env.local'), ...process.env };
const failures = [];
const warnings = [];

function required(name, alternatives = []) {
  const names = [name, ...alternatives];
  const selected = names.find((candidate) => values[candidate]?.trim());
  if (!selected) failures.push(`${names.join(' or ')} is required.`);
  return selected ? values[selected].trim() : '';
}

function validateUrl(name, value, { allowLocalhost = false, hostnameSuffix } = {}) {
  if (!value) return;
  try {
    const parsed = new URL(value);
    const local = allowLocalhost && ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) failures.push(`${name} must use HTTPS.`);
    if (hostnameSuffix && !parsed.hostname.endsWith(hostnameSuffix)) failures.push(`${name} must use a ${hostnameSuffix} hostname.`);
  } catch {
    failures.push(`${name} must be a valid URL.`);
  }
}

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL');
const publishableKey = required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', ['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
const appUrl = values.NEXT_PUBLIC_APP_URL?.trim() || '';
validateUrl('NEXT_PUBLIC_SUPABASE_URL', supabaseUrl, { hostnameSuffix: '.supabase.co' });
if (!appUrl && process.env.NODE_ENV === 'production') failures.push('NEXT_PUBLIC_APP_URL is required in production.');
else if (!appUrl) warnings.push('NEXT_PUBLIC_APP_URL is absent; local callbacks will use the current browser origin.');
else validateUrl('NEXT_PUBLIC_APP_URL', appUrl, { allowLocalhost: process.env.NODE_ENV !== 'production' });

if (publishableKey && (publishableKey.length < 24 || /replace|example|placeholder/i.test(publishableKey))) {
  failures.push('The Supabase publishable key is missing or still a placeholder.');
}

for (const name of Object.keys(values)) {
  if (name.startsWith('NEXT_PUBLIC_') && /(SECRET|SERVICE_ROLE|PASSWORD|DB_URL|ACCESS_TOKEN|PRIVATE_KEY)/i.test(name)) {
    failures.push(`${name} exposes a private credential to browser bundles.`);
  }
  if (/^(DEBUG|NEXT_PUBLIC_DEBUG)$/i.test(name) && /^(1|true|yes|on)$/i.test(values[name])) {
    failures.push(`${name} must be disabled.`);
  }
}

const databaseUrl = values.SUPABASE_DB_URL?.trim();
const databasePassword = values.SUPABASE_DB_PASSWORD?.trim();
if (Boolean(databaseUrl) !== Boolean(databasePassword)) {
  failures.push('SUPABASE_DB_URL and SUPABASE_DB_PASSWORD must be configured together for database tooling.');
}
if (!databaseUrl) warnings.push('Database tooling credentials are absent; remote migration and database QA commands will be unavailable.');

const report = {
  valid: failures.length === 0,
  configuredKeyCount: Object.keys(values).filter((name) => /^(NEXT_PUBLIC_|SUPABASE_|OTEL_|VERCEL_)/.test(name)).length,
  failures,
  warnings,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
