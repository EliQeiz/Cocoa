# AuraFlow AgriTrace · Supabase setup

1. In the Supabase project, open **Project Settings → API** and copy the project URL and anon key.
2. Copy `.env.example` to `.env.local` and replace the anon-key placeholder. Never commit this file.
3. In **SQL Editor**, run `schema.sql`.
4. Run `policies.sql` immediately after the schema to close public access.
5. Run `org-policies.sql`, then `auth-onboarding.sql`, before onboarding users. `auth-onboarding.sql` creates an invitation-only trigger: an authenticated account is mapped to a tenant only when its email has an unexpired invitation.
6. Run `operational-workflows.sql` to enable auditable producer registration, farm-gate purchase capture, risk resolution, and buyer audit-packet generation.
7. For a pitch environment only, `seed-synthetic-pilot.sql` creates a 5,000-bag relational pilot dataset and is idempotent.

The dashboard uses the live tenant data after an invited user signs in; while signed out it visibly remains in demo mode. The client in `lib/supabase/client.ts` is safe to import and returns `null` until both variables are configured.
