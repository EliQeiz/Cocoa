# BuildProof enterprise readiness

## Product controls now implemented

- Tenant-isolated organizations, memberships and projects with PostgreSQL RLS.
- Role-checked command functions for controlled writes; browser roles have no direct table write grants.
- Authenticated project switching and role-aware action controls.
- Construction registers for materials, deliveries, evidence, inspections, approvals, issues, risks, RFIs, submittals, daily logs, change orders, finance recommendations and audit reports.
- Separation of duties for material inspection review and procurement approval.
- Append-only audit events for domain commands and database-enforced action rate limiting.
- Private tenant-scoped evidence storage, SHA-256 file integrity metadata and short-lived signed previews.
- Bounded record queries, in-suite pagination, filtering and CSV export.
- Realtime project refresh with a visible degraded/offline state.
- Meaningful loading, not-found and recoverable route-error states.
- CSP, HSTS, anti-framing, MIME protection, private caching and protected server layouts.

## Platform controls required before a public enterprise launch

These are vendor or operational controls and cannot be completed safely in application source:

1. Enable MFA for every Supabase, Vercel, GitHub, Google and Microsoft administrator.
2. Enable database SSL enforcement, network restrictions, daily backups and point-in-time recovery.
3. Configure custom SMTP, branded auth mail, CAPTCHA and production OTP/rate limits.
4. Use separate development, staging and production Supabase projects with migration promotion through CI.
5. Configure uptime, error-rate, database-capacity and suspicious-auth alerts with an owned on-call runbook.
6. Run staged load tests with representative evidence-file sizes and concurrent field users.
7. Complete data retention, records export, privacy, incident response, recovery time and recovery point policies.
8. Obtain independent penetration testing and legal/compliance review before claiming certification or government accreditation.

## Release gate

Every production release must pass:

```text
npm run lint
npx tsc --noEmit
npm run build
npm run security:audit
npm run db:verify
npm run db:qa:security
npm run db:qa:invitations
npm run db:qa:workflows
```

Database migrations must be applied in a staging environment first and rolled forward; production schema changes must not be developed interactively in the dashboard.
