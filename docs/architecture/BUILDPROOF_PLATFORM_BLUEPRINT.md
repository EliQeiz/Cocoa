# BuildProof platform blueprint

**Status:** recommended implementation baseline

**Audience:** AuraFlow product, engineering, pilot-operations, finance and governance leads
**Decision date:** 28 September 2026

## 1. Product shape: web platform with a field-first PWA

BuildProof should launch as a **responsive web application that is installable as a Progressive Web App**. This is the best first product surface, rather than immediately splitting investment between a web application and two native mobile apps.

The professional work is desktop-oriented: BoQ import, exception review, approvals, reporting, user administration, and lender/owner evidence review. Those belong in a web workspace. Field users need a dependable phone experience for capture, photos, QR lookup and safe retry under poor connectivity. A PWA provides that immediately from the same codebase and supports an offline capture queue in IndexedDB.

### Native app decision gate

Do not build iOS and Android applications in phase one. Reassess after a 12-week live pilot when all three signals are true:

1. At least 60% of receiving or verification events are completed from mobile devices.
2. Offline capture, background upload, or device integrations are a measurable cause of failed field work.
3. At least one paid customer commits to the native capability in writing.

If that gate is met, build a focused React Native companion app using the shared TypeScript domain contracts. The web workspace remains the system of record and administration surface.

## 2. Recommended technology stack

| Layer | Decision | Why it fits BuildProof |
|---|---|---|
| Product surface | Next.js App Router web app + PWA | One codebase for professional desktop work and mobile field capture; server rendering, route handlers and secure server-side workflows are available without a separate API project. |
| UI language | TypeScript + React | Shared domain types reduce errors across BoQ, evidence, exceptions and approvals. React is well suited to dense operational interfaces. |
| Styling and components | Tailwind CSS v4 + Radix primitives/shadcn-style owned components | Fast, consistent implementation without accepting a generic "template app" visual identity. Accessibility primitives and an in-house token system keep the UI controlled. |
| Forms and validation | React Hook Form + Zod | Field capture must work with clear validation, drafts and local retry. Zod schemas can validate both client and server payloads. |
| Data and identity | Supabase PostgreSQL, Auth, Storage and Realtime | Fits the existing account, supports relational transactions, evidence objects, secure authentication and realtime exception/approval updates. |
| Sensitive domain actions | Supabase Edge Functions and Next.js route handlers | Use server-side code for QR issuance, signed uploads, audit writes, webhooks and reports. Never expose service-role credentials in the browser. |
| Background work | Supabase Edge Functions + database outbox | Notifications, report generation, integrity checks and later partner integrations must be retryable/idempotent rather than tied to a browser request. |
| Hosting | Vercel for Next.js; Supabase for data plane | Preserves the existing accounts and keeps application delivery separate from the protected database. |
| Quality | Vitest, Playwright, SQL migration review, RLS tests | A high-stakes evidence platform needs flow, permission and data-integrity tests before visual polish. |

Next.js is specifically appropriate because it is a full-stack React framework and its App Router supports modern server/client component boundaries. Supabase's Next.js guidance supports server-side clients, while PostgreSQL RLS is the mechanism that enforces tenant boundaries at the data layer. See the official [Next.js documentation](https://nextjs.org/docs), [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), and [Tailwind's Next.js integration](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

### Explicit non-decisions

- **Not Vite for the core app.** Vite is excellent for a client-only SPA, but BuildProof benefits from server-rendered secure routes, route handlers, permissions, reporting and a single deployable full-stack app.
- **Not a microservice architecture.** PostgreSQL plus a small number of server-side functions is the right operational boundary for the pilot. Split services only when usage or a concrete integration demands it.
- **Not client-side direct privilege.** Browsers use the publishable Supabase key under RLS. Service-role access is server-only and is limited to tightly audited jobs.
- **Not automatic payment or automated engineering certification.** BuildProof prepares evidence and recommendations; an authorised human makes the financial or professional decision.

## 3. Multi-tenant model

### Tenancy rule

An `organization` is the tenant and security boundary. Every operational row carries `organization_id`, even when it also references a project. The duplication is intentional: it allows simple, indexable RLS policies and prevents cross-tenant joins by mistake.

```text
auth.users
  └─ profiles
      └─ organization_memberships ── organizations
                                       └─ projects
                                           ├─ project_members
                                           ├─ project_sites
                                           ├─ boq_versions → boq_lines
                                           ├─ material_packages
                                           ├─ purchase_requests → purchase_request_lines
                                           ├─ deliveries → delivery_lines → material_batches
                                           ├─ verifications
                                           ├─ exceptions → exception_events
                                           ├─ release_recommendations
                                           └─ evidence_assets → evidence_links
```

### Roles and separation of duties

| Role | Typical scope | Cannot do |
|---|---|---|
| Organization owner/admin | Tenant setup, members, templates, portfolio visibility | Override a professional verification by silently editing it |
| Project director | Project decisions, variations, release review | Alter original evidence or impersonate a reviewer |
| Contractor manager | Submit material requests and respond to exceptions | Make payment-release decisions unless explicitly delegated |
| Site receiver | Capture receipt, delivery and condition evidence | Mark material technically accepted |
| Engineer / quantity surveyor | Verify quantity/specification and resolve technical exceptions | Delete immutable records or change a prior decision without an override event |
| Finance reviewer / funder viewer | Read evidence packs and dashboards | Modify operational records |

`organization_memberships` answers “may this user enter the tenant?”; `project_members` answers “which projects and scope may the user operate?” Both must be enforced by RLS.

## 4. Core data domains

### A. Tenant, people and access

`organizations`, `profiles`, `organization_memberships`, `projects`, `project_members`, `project_sites`, and `project_phases` establish ownership, location and role scope. Never make a user email the tenant key; Supabase `auth.users.id` is the identity and the membership table grants access.

### B. Approved baseline

`boq_versions` is immutable once approved. `boq_lines` stores the approved material allowance, unit, specification, tolerance and budget. A new approved version supersedes the previous one; it never overwrites it. This is the anchor for all later variance calculations.

### C. Requests and approvals

`purchase_requests` and `purchase_request_lines` record demand before money leaves. Each request line optionally traces to a BoQ line. `approval_actions` is append-only: approve, query, reject, return, or designate a variation. The current request state is a convenient projection; the action log remains the legal/audit record.

### D. Receiving, quality and evidence

`deliveries` and `delivery_lines` capture what arrived at a site. `material_batches` represents a traceable physical batch and carries the QR public identifier, quality state and supplier/batch reference. `evidence_assets` stores only immutable metadata and a Storage object key; the binary remains in private Supabase Storage. `evidence_links` connects an asset to the controlled record it supports.

### E. Verification, exceptions and decisioning

`verifications` creates a distinct professional event after delivery. `exceptions` remain visible until resolution, and `exception_events` makes changes append-only. `release_recommendations` combines the material package status, unresolved exceptions and reviewer state into a decision-support output. It is never a direct bank instruction.

### F. Audit, integrations and reliability

`audit_events` is append-only and captures actor, event, record identity, request ID, before/after JSON and timestamps. `outbox_events` supports idempotent notification/report/integration work. Every field capture command has a client-supplied `idempotency_key`; replays must return the original result rather than create a duplicate delivery or evidence record.

## 5. Canonical lifecycle

```text
Approved BoQ line
   → material request (draft → submitted → reviewed)
   → approval action (approved / queried / rejected / variation)
   → delivery capture (receipt evidence + line items)
   → batch and quality passport
   → professional verification
   → exception resolution, if required
   → release recommendation (ready / partial / blocked)
   → human financial decision outside BuildProof
```

Every transition writes an audit event. Original evidence is never overwritten; corrections are new records linked to the original and explained by an exception or override event.

## 6. Database rules that cannot be negotiated

1. Enable RLS on every tenant-owned table, including tables that appear "internal" today.
2. Use `uuid` primary keys, UTC `timestamptz`, `numeric` for quantities/money, ISO codes for currency and country, and explicit check constraints for states.
3. Store all financial values as `numeric(18,2)` with an ISO `currency_code`; never use floating point for money or quantities.
4. Index `organization_id` first on every RLS-accessed table. Composite indexes follow the real query shapes: `(organization_id, project_id, status)` and `(organization_id, created_at desc)`.
5. Maintain immutable approved BoQ versions, decisions, exception events, audit events and evidence metadata. Use corrections, supersession and explicit override reasons.
6. Keep binary evidence in private Storage buckets; database rows retain object key, hash, media type, capture time and provenance.
7. Apply database migrations only through versioned files reviewed in Git. No ad-hoc SQL in production.
8. Use a server-side request/correlation ID and idempotency key for all field-write commands.

## 7. Initial schema boundary

The `supabase/migrations/202609280001_buildproof_foundation.sql` migration establishes the initial relational foundation, indexes, RLS baseline and private storage bucket. It is a design artifact and has **not** been applied to the existing Supabase project.

Before applying it, the team must decide:

1. Whether a project may have multiple independent owners/funders with separate evidence visibility.
2. Which approvals can be delegated and whether delegation expires.
3. The first pilot's BoQ import shape and required Ghanaian units/specifications.
4. Evidence retention periods and whether precise field location is required or optional.
5. The signed pilot charter's definition of an acceptable material, a blocked package and a permitted override.
