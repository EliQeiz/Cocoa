# Supabase schema and operations

The linked BuildProof project has the foundation, onboarding, workspace-command, evidence-capture, material-receipt and inspection-review migrations applied through `202609300006_independent_inspection_review.sql`.

Apply new migrations in filename order with `npm run db:migrate -- <migration-filename>`. The command reads the database connection from `.env.local`; never print or commit those credentials. `npm run db:verify` checks the tenant tables, row-level security, private evidence bucket, upload policies and required workflow commands.

Browser clients use the Supabase publishable key under Row Level Security. The service-role key must never be committed or exposed to the browser. Evidence objects are private; signed preview URLs are temporary. SHA-256 is calculated in the browser and is an integrity hint, not a server-verified signature.

`seed/buildproof-demo-workspace.sql` is synthetic presentation data. Do not run it against a customer or production workspace without explicit approval.
