const baseUrl = (process.env.LOAD_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const requests = Math.min(Math.max(Number(process.env.LOAD_REQUESTS || 100), 1), 2000);
const concurrency = Math.min(Math.max(Number(process.env.LOAD_CONCURRENCY || 10), 1), 50);
const maximumFailureRate = Number(process.env.LOAD_MAX_FAILURE_RATE || 0.01);
const maximumP95Ms = Number(process.env.LOAD_MAX_P95_MS || 1500);

async function sample() {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}/auth`, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    return { ok: response.status === 200, duration: performance.now() - started, status: response.status };
  } catch {
    return { ok: false, duration: performance.now() - started, status: 0 };
  }
}

async function main() {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < requests) {
      next += 1;
      results.push(await sample());
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, worker));
  const durations = results.map((result) => result.duration).sort((a, b) => a - b);
  const failures = results.filter((result) => !result.ok).length;
  const failureRate = failures / results.length;
  const p95 = durations[Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1)];
  const report = {
    target: new URL(baseUrl).origin,
    requests: results.length,
    concurrency,
    failures,
    failureRate: Number(failureRate.toFixed(4)),
    p50Ms: Math.round(durations[Math.floor(durations.length * 0.5)]),
    p95Ms: Math.round(p95),
    maxMs: Math.round(durations.at(-1)),
  };
  console.log(JSON.stringify(report, null, 2));
  if (failureRate > maximumFailureRate || p95 > maximumP95Ms) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Load smoke test failed:', error.message);
  process.exitCode = 1;
});
