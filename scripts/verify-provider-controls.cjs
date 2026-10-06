const fs = require('node:fs');

function fileEnvironment(filename) {
  if (!fs.existsSync(filename)) return {};
  return Object.fromEntries(fs.readFileSync(filename, 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [];
  }));
}

const environment = { ...fileEnvironment('.env.local'), ...process.env };
const accessToken = environment.SUPABASE_ACCESS_TOKEN?.trim();
const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
const explicitRef = environment.SUPABASE_PROJECT_REF?.trim();
const projectRef = explicitRef || (supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : '');

if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN is required with auth_config_read and backups_read permissions.');
if (!projectRef) throw new Error('SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL is required.');

async function management(path) {
  const response = await fetch(`https://api.supabase.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Supabase Management API returned ${response.status} for ${path}.`);
  return response.json();
}

async function main() {
  const [auth, backups] = await Promise.all([
    management(`/v1/projects/${projectRef}/config/auth`),
    management(`/v1/projects/${projectRef}/database/backups`),
  ]);
  const latestCompletedBackup = (backups.backups || [])
    .filter((backup) => backup.status === 'COMPLETED' && backup.inserted_at)
    .sort((a, b) => Date.parse(b.inserted_at) - Date.parse(a.inserted_at))[0];
  const backupAgeHours = latestCompletedBackup
    ? (Date.now() - Date.parse(latestCompletedBackup.inserted_at)) / 3_600_000
    : null;
  const report = {
    projectRef,
    captchaEnabled: auth.security_captcha_enabled === true,
    customSmtpConfigured: Boolean(auth.smtp_host && auth.smtp_user),
    emailConfirmationRequired: auth.mailer_autoconfirm === false,
    otpExpiryWithinOneHour: Number(auth.mailer_otp_exp) > 0 && Number(auth.mailer_otp_exp) <= 3600,
    refreshTokenRotationEnabled: auth.refresh_token_rotation_enabled === true,
    googleProviderEnabled: auth.external_google_enabled === true,
    microsoftProviderEnabled: auth.external_azure_enabled === true,
    pitrEnabled: backups.pitr_enabled === true,
    completedBackupAvailable: Boolean(latestCompletedBackup),
    latestCompletedBackupAgeHours: backupAgeHours === null ? null : Number(backupAgeHours.toFixed(1)),
  };
  console.log(JSON.stringify(report, null, 2));

  const required = [
    report.captchaEnabled,
    report.customSmtpConfigured,
    report.emailConfirmationRequired,
    report.otpExpiryWithinOneHour,
    report.refreshTokenRotationEnabled,
    report.googleProviderEnabled,
    report.microsoftProviderEnabled,
    report.completedBackupAvailable,
    report.latestCompletedBackupAgeHours !== null && report.latestCompletedBackupAgeHours <= 36,
  ];
  if (process.env.REQUIRE_PITR === 'true') required.push(report.pitrEnabled);
  if (required.some((control) => !control)) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Provider control verification failed:', error.message);
  process.exitCode = 1;
});
