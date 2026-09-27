# AuraFlow AgriTrace · Supabase setup

1. In the Supabase project, open **Project Settings → API** and copy the project URL and anon key.
2. Copy `.env.example` to `.env.local` and replace the anon-key placeholder. Never commit this file.
3. In **SQL Editor**, run `schema.sql`.
4. Run `policies.sql` immediately after the schema to close public access. Add organization-scoped authenticated policies before using real farmer, financial, GPS, or buyer data.

The UI deliberately stays mock-backed until those credentials and policies are in place. The client in `lib/supabase/client.ts` is safe to import and returns `null` until both variables are configured.
