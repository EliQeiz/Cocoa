const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const excludedRoots = ["deliverables/", "node_modules/", ".next/"];
const sensitiveNames = /(^|\/)(\.env(?:\..+)?|[^/]+\.(?:pem|key|p12|pfx)|credentials\.json|secrets\.json)$/i;
const allowedSensitiveNames = new Set([".env.example"]);
const secretRules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{20,}/g],
  ["OpenAI-style secret key", /\bsk-[A-Za-z0-9_-]{20,}/g],
  ["GitHub token", /\bgh[opusr]_[A-Za-z0-9]{20,}/g],
  ["Google API key", /\bAIza[A-Za-z0-9_-]{30,}/g],
  ["credential-bearing PostgreSQL URL", /postgres(?:ql)?:\/\/[^\s:/]+:[^\s@/]+@[^\s]+/gi],
];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
}

function decodeBase64Url(value) {
  try {
    return JSON.parse(Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function findingsForText(text, location) {
  const findings = [];
  for (const [name, pattern] of secretRules) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`${location}: ${name}`);
  }
  const jwtPattern = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  for (const token of text.match(jwtPattern) ?? []) {
    const payload = decodeBase64Url(token.split(".")[1]);
    if (payload?.role === "service_role") findings.push(`${location}: Supabase service-role JWT`);
  }
  return findings;
}

function environmentKeys(filename) {
  if (!fs.existsSync(filename)) return [];
  return fs.readFileSync(filename, "utf8").split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
    .filter(Boolean);
}

const candidates = git("ls-files", "--cached", "--others", "--exclude-standard")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((file) => file.replaceAll("\\", "/"))
  .filter((file) => !excludedRoots.some((root) => file.startsWith(root)));

const findings = [];
for (const file of candidates) {
  if (sensitiveNames.test(file) && !allowedSensitiveNames.has(file)) {
    findings.push(`${file}: sensitive filename must not be tracked or packaged`);
    continue;
  }
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size > 2 * 1024 * 1024) continue;
  const buffer = fs.readFileSync(fullPath);
  if (buffer.includes(0)) continue;
  findings.push(...findingsForText(buffer.toString("utf8"), file));
}

const localKeys = environmentKeys(".env.local");
const configuredKeys = new Set([...localKeys, ...Object.keys(process.env)]);
const requiredAlternatives = ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
if (!configuredKeys.has("NEXT_PUBLIC_SUPABASE_URL")) findings.push("environment: NEXT_PUBLIC_SUPABASE_URL is missing");
if (!requiredAlternatives.some((name) => configuredKeys.has(name))) findings.push("environment: a Supabase publishable key is missing");
for (const name of configuredKeys) {
  if (name.startsWith("NEXT_PUBLIC_") && /(SECRET|SERVICE_ROLE|PASSWORD|DB_URL|ACCESS_TOKEN)/i.test(name)) {
    findings.push(`.env.local: ${name} must never be exposed to browser code`);
  }
  if (/^(DEBUG|NEXT_PUBLIC_DEBUG)$/i.test(name)) findings.push(`.env.local: ${name} must not enable debug mode`);
}

const history = git("log", "-p", "--all", "--full-history", "--", ".", ":!package-lock.json", ":!deliverables")
  .split(/\r?\n/)
  .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
  .join("\n");
findings.push(...findingsForText(history, "git history"));

const uniqueFindings = [...new Set(findings)];
const report = {
  scannedFiles: candidates.length,
  localEnvironmentKeyCount: localKeys.length,
  publicSecretNamesFound: localKeys.filter((name) => name.startsWith("NEXT_PUBLIC_") && /(SECRET|SERVICE_ROLE|PASSWORD|DB_URL|ACCESS_TOKEN)/i.test(name)).length,
  findings: uniqueFindings,
};
console.log(JSON.stringify(report, null, 2));
if (uniqueFindings.length) process.exitCode = 1;
