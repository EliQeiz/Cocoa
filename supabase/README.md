# Supabase schema and operations

The linked BuildProof project has the foundation, onboarding, workspace-command, evidence-capture, material-receipt, inspection-review, organization-invitation, token-privilege and invitation-revocation migrations applied through `202609300009_revoke_organization_invitation.sql`.

Apply new migrations in filename order with `npm run db:migrate -- <migration-filename>`. The command reads the database connection from `.env.local`; never print or commit those credentials. `npm run db:verify` checks the tenant tables, row-level security, private evidence bucket, upload policies and required workflow commands, including email-bound invitation creation and acceptance.

Browser clients use the Supabase publishable key under Row Level Security. The service-role key must never be committed or exposed to the browser. Evidence objects are private; signed preview URLs are temporary. SHA-256 is calculated in the browser and is an integrity hint, not a server-verified signature.

Team invitations are created/revoked by owner/admin-checked database commands. The database stores only a SHA-256 digest of the random bearer token; the raw seven-day link is returned once and must be shared by the inviter. Acceptance requires an authenticated session whose email exactly matches the invited address. BuildProof does not send invitation email automatically.

`seed/buildproof-demo-workspace.sql` is synthetic presentation data. Do not run it against a customer or production workspace without explicit approval.
