const baseUrl = (process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

const expectedHeaders = [
  'content-security-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'permissions-policy',
  'referrer-policy',
  'x-content-type-options',
  'x-frame-options',
];
if (baseUrl.startsWith('https://')) expectedHeaders.push('strict-transport-security');

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(10000), ...options });
}

async function main() {
  const auth = await request('/auth');
  if (auth.status !== 200) throw new Error(`/auth returned ${auth.status}.`);
  const missingHeaders = expectedHeaders.filter((name) => !auth.headers.get(name));
  if (missingHeaders.length) throw new Error(`/auth is missing security headers: ${missingHeaders.join(', ')}.`);

  const protectedRoute = await request('/workspace');
  const location = protectedRoute.headers.get('location') || '';
  if (![302, 303, 307, 308].includes(protectedRoute.status) || !location.includes('/auth')) {
    throw new Error(`/workspace did not redirect an anonymous request to /auth (status ${protectedRoute.status}).`);
  }

  const health = await request('/api/health');
  const healthBody = await health.json().catch(() => null);
  if (health.status !== 200 || healthBody?.status !== 'ok') {
    throw new Error(`/api/health is not ready (status ${health.status}).`);
  }

  console.log(JSON.stringify({
    target: new URL(baseUrl).origin,
    auth: auth.status,
    anonymousWorkspaceProtection: protectedRoute.status,
    health: healthBody.status,
    securityHeaders: 'present',
  }, null, 2));
}

main().catch((error) => {
  console.error('Production smoke test failed:', error.message);
  process.exitCode = 1;
});
