# BuildProof security baseline

BuildProof uses Supabase Auth for passwordless and federated authentication. The application never receives, stores, or hashes user passwords. Supabase owns password hashing for any password-based provider that may be enabled later.

## Controls implemented in the repository

- Next.js 16 Proxy refreshes and verifies Supabase claims before protected routes render.
- `/workspace` requires an active tenant membership at the server layout and again through PostgreSQL row-level security.
- `/onboarding` requires a verified user and rejects users who already belong to a tenant.
- `/admin` is denied unless the verified user has an active owner or administrator membership. No admin page is currently shipped.
- Every public tenant table uses RLS. Browser writes go through authenticated `security definer` commands with explicit role and state checks.
- Successful domain mutations are rate-limited at the database audit boundary. Supabase Auth separately rate-limits OTP, OAuth verification and token endpoints.
- Evidence storage is private, tenant-scoped, MIME restricted and limited to 25 MB. Downloads use short-lived signed URLs.
- Invitation bearer tokens are high entropy, email-bound, single use and stored only as SHA-256 digests. Only owner/admin roles can list invitations.
- User text is length-limited, normalized before submission, validated again by PostgreSQL and rendered through React's escaped text nodes. No raw HTML rendering API is used.
- Production responses include CSP, anti-framing, MIME sniffing, referrer, permissions, cross-origin isolation and HSTS headers. Browser source maps and the framework signature header are disabled.
- `.env*`, private keys, certificates and credential files are ignored. `npm run security:audit` scans current files, Git history, environment-key names and production dependencies without printing secret values.
- `/api/health` performs a time-bounded Supabase Auth readiness check and exposes no tenant or credential data.
- Server failures emit structured operational events without request headers, query strings or tenant payloads.
- GitHub CI enforces environment validation, lint, type checking, a production build and production dependency audit; CodeQL and Dependabot provide ongoing code and supply-chain review.
- `npm run platform:verify` can inspect production Auth and backup controls with a short-lived, read-only Supabase Management API token without printing provider secrets.

## Provider and platform settings to review before a public launch

These controls live in vendor dashboards and cannot be safely committed to source control:

1. Supabase Authentication → Rate Limits: review the project limits for sign-in, OTP, verification and refresh traffic.
2. Enable Supabase CAPTCHA for sign-up and sign-in before broad public access.
3. Use custom SMTP, keep OTP expiry at one hour or less, and disable email link tracking.
4. Confirm every production and preview callback URL in Supabase and each OAuth provider.
5. Enable MFA for every Supabase, Vercel, Google Cloud and GitHub administrator.
6. Enable Supabase database SSL enforcement, network restrictions and point-in-time recovery when the production plan supports them.
7. Keep Google and Microsoft client secrets only in Supabase provider configuration, never in `NEXT_PUBLIC_*` variables or this repository.

The authoritative dashboard evidence checklist is `docs/operations/PROVIDER_CONTROLS.md`. Repository checks are necessary but do not prove provider-plan, DNS, staff-access or disaster-recovery controls by themselves.

## Incident response

If a secret is ever committed, removing the line is not enough. Revoke or rotate it at the provider, replace the deployment value, invalidate affected sessions when applicable, and then remove it from Git history.
