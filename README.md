# BuildProof

BuildProof is AuraFlow's evidence-first construction material-control platform for Ghana. It creates a traceable chain from an approved Bill of Quantities (BoQ), through request, receiving, technical verification, exceptions, and a human payment-release recommendation.

## Current product state

BuildProof now includes production authentication, tenant onboarding, a responsive project command centre and audited construction-control suites for procurement, deliveries, evidence, inspections, approvals, RFIs, submittals, daily logs, change orders, risks and release recommendations.

## Product and architecture decisions

- Product surface: responsive web application with installable Progressive Web App (PWA) field capture; defer native iOS/Android apps until the pilot proves sustained field use.
- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, and a carefully controlled accessible component system.
- Backend: Supabase Auth, PostgreSQL, Storage, Realtime, and Edge Functions; Vercel hosts the Next.js application.
- Tenancy: one shared PostgreSQL database with organisation-scoped rows and Row Level Security (RLS) on every tenant-owned table.

See [the platform blueprint](docs/architecture/BUILDPROOF_PLATFORM_BLUEPRINT.md) and [the initial Supabase migration](supabase/migrations/202609280001_buildproof_foundation.sql).

## Release safety

Migrations are forward-only and must be validated in staging before production. Run `npm run verify:release` for the application gate, then the database verification and QA scripts listed in [the enterprise readiness checklist](docs/ENTERPRISE_READINESS.md). Operational procedures and dashboard control evidence live in [the operations runbooks](docs/operations/PROVIDER_CONTROLS.md).
