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
