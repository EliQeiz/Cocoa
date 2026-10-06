# Provider control register

Repository automation cannot truthfully enable controls that require plan selection, DNS ownership, billing approval, external credentials or organization-owner access. A named owner must record evidence for every item below before public launch.

| Provider | Control | Required evidence |
| --- | --- | --- |
| Supabase | MFA enforcement and at least two organization owners | Dated settings export or screenshot |
| Supabase | SSL enforcement and approved database network restrictions | Dated database settings evidence |
| Supabase | Custom SMTP, verified sending domain, link tracking disabled | Successful delivery test to a non-team address |
| Supabase | CAPTCHA on sign-up, sign-in and password recovery | Test results for valid and rejected challenges |
| Supabase | OTP expiry ≤ 3600 seconds and reviewed Auth rate limits | Dated Auth settings evidence |
| Supabase | Daily backups, approved retention and PITR where RPO requires it | Successful quarterly restore record |
| Supabase | Security and Performance Advisor reviewed | Zero unresolved critical findings or accepted-risk record |
| Vercel | Preview deployment protection | Unauthenticated access-denial test |
| Vercel | WAF/bot rules, spend alerts and persisted runtime logs | Dated configuration evidence |
| Vercel | Production and preview environment variables separated | Redacted environment inventory |
| GitHub | Branch protection/ruleset requiring review and CI | Ruleset export or screenshot |
| GitHub | Secret scanning, push protection, Dependabot and CodeQL | Security settings evidence and successful checks |
| Google/Microsoft | OAuth production consent, exact redirect URIs and secret ownership | Provider configuration review |

Review the register quarterly and after any provider, plan, domain or ownership change.

## Verified snapshot — 2026-10-06

- Supabase site URL is aligned to `https://cocoa-nu.vercel.app`; approved production and local auth redirects are registered.
- Supabase email confirmation, TOTP MFA, AAL1 session limiting, refresh-token replay detection, secure email changes, secure password changes and current-password verification are enabled.
- Supabase passwords require at least 12 characters with lowercase, uppercase, digits and symbols. Security notifications are enabled for password, email, identity-provider and MFA changes.
- Supabase custom SMTP, CAPTCHA, scheduled backups, PITR, leaked-password detection and configurable session timeouts remain unavailable or unconfigured. The project is on the Free plan; backups and several advanced controls require Pro.
- Vercel Authentication protects pre-production deployments. Protected source maps, build logs/source protection, Git fork protection and team-scoped OIDC are enabled.
- Vercel Firewall is active and Bot Protection is enabled in `Log` mode. Review observed traffic before changing it to `Challenge`.
- Production environment configuration is present in Vercel and values remain concealed. The canonical production deployment passed the external smoke test after the provider changes.
- GitHub secret protection and push protection are enabled. Dependency graph and private vulnerability reporting are enabled, and CodeQL runs successfully in CI.
- GitHub branch protection and Dependabot alert/security-update settings still require an explicit owner-approved access and notification change.
- Microsoft sign-in remains dependent on an Azure application registration and client secret; a Google account alone cannot provide those credentials.
