# BuildProof

BuildProof is AuraFlow's evidence-first construction material-control platform for Ghana. It creates a traceable chain from an approved Bill of Quantities (BoQ), through request, receiving, technical verification, exceptions, and a human payment-release recommendation.

## Current reset state

The CocoaTrace application has been removed while preserving this repository's Git history and the existing Supabase environment configuration. The BuildProof implementation starts from the architecture and database foundation in this repository.

## Product and architecture decisions

- Product surface: responsive web application with installable Progressive Web App (PWA) field capture; defer native iOS/Android apps until the pilot proves sustained field use.
- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, and a carefully controlled accessible component system.
- Backend: Supabase Auth, PostgreSQL, Storage, Realtime, and Edge Functions; Vercel hosts the Next.js application.
- Tenancy: one shared PostgreSQL database with organisation-scoped rows and Row Level Security (RLS) on every tenant-owned table.

See [the platform blueprint](docs/architecture/BUILDPROOF_PLATFORM_BLUEPRINT.md) and [the initial Supabase migration](supabase/migrations/202609280001_buildproof_foundation.sql).

## Safety rule

The initial migration is deliberately not applied automatically. It must be reviewed, committed, and applied through a controlled Supabase migration workflow after the product owners approve the data model.
