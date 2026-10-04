const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");

function environmentValue(name) {
  const line = fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));
  if (!line) throw new Error(`${name} is missing from .env.local`);
  return line.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
}

async function main() {
  const client = new Client({
    connectionString: environmentValue("SUPABASE_DB_URL"),
    password: environmentValue("SUPABASE_DB_PASSWORD"),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query("begin");

  try {
    const actor = randomUUID();
    const action = `qa.rate-limit.${randomUUID()}`;
    await client.query("select private.enforce_action_rate_limit($1, $2, 2, 3600)", [actor, action]);
    await client.query("select private.enforce_action_rate_limit($1, $2, 2, 3600)", [actor, action]);
    await client.query("savepoint expected_rate_limit");

    let rejected = false;
    try {
      await client.query("select private.enforce_action_rate_limit($1, $2, 2, 3600)", [actor, action]);
    } catch (error) {
      rejected = error.code === "P0001" && error.message.includes("Too many requests");
      await client.query("rollback to savepoint expected_rate_limit");
    }
    if (!rejected) throw new Error("The third request was not rejected by the database rate limiter.");

    const acl = await client.query(`
      select
        has_function_privilege('anon', 'public.create_organization(text,text,text,text)', 'EXECUTE') as anon_create_org,
        has_function_privilege('anon', 'public.create_organization_invitation(uuid,text,public.membership_role)', 'EXECUTE') as anon_invite,
        has_function_privilege('authenticated', 'public.create_organization(text,text,text,text)', 'EXECUTE') as member_create_org,
        has_table_privilege('authenticated', 'public.projects', 'INSERT') as direct_project_insert;
    `);
    const result = acl.rows[0];
    if (result.anon_create_org || result.anon_invite || !result.member_create_org || result.direct_project_insert) {
      throw new Error("Function or table privileges do not match the intended browser access boundary.");
    }

    console.log("Security QA passed: database rate limiting, anonymous RPC denial, authenticated command access, and direct-write denial.");
  } finally {
    await client.query("rollback");
    await client.end();
  }
}

main().catch((error) => {
  console.error("Security QA failed:", error.code || "", error.message);
  process.exitCode = 1;
});
