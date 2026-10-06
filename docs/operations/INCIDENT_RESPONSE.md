# Incident response runbook

## Severity and ownership

| Severity | Definition | Initial response target | Owner |
| --- | --- | --- | --- |
| SEV-1 | Tenant isolation failure, credential compromise, destructive data loss or total production outage | 15 minutes | Incident commander and platform owner |
| SEV-2 | Major workflow unavailable, authentication outage or material data integrity risk | 30 minutes | Engineering lead |
| SEV-3 | Degraded performance or isolated workflow failure with a workaround | 4 business hours | On-call engineer |

The production owner must maintain a current phone and secondary contact outside this repository. Do not place personal contact details, access tokens or recovery codes in Git.

## First response

1. Name an incident commander and record the UTC start time.
2. Preserve evidence: deployment identifier, affected tenant/project IDs, audit-event IDs and provider incident links. Never paste access tokens or full database rows into chat.
3. Contain the issue. Revoke leaked credentials, disable the affected provider or roll back the deployment as appropriate.
4. Check `/api/health`, Vercel runtime logs, Supabase Auth logs, Postgres logs and the BuildProof audit ledger.
5. Determine whether tenant boundaries, evidence integrity or financial recommendations were affected.
6. Communicate a factual status and the next update time. Do not claim recovery until the user path and data checks pass.

## Recovery and verification

1. Promote or roll back using the Vercel deployment history; never repair production by editing generated files.
2. Apply database fixes only as forward migrations tested in staging. Do not rewrite applied migrations.
3. Run `npm run smoke` against the recovered deployment.
4. Run `npm run db:verify`, `npm run db:qa:security`, `npm run db:qa:invitations` and `npm run db:qa:workflows` from an approved operator environment.
5. Validate one authorized and one unauthorized tenant path, then monitor error rate and authentication health for at least 30 minutes.

## After action

Within two business days, document impact, timeline, root cause, detection gap, corrective actions, owners and deadlines. Rotate any credential that may have appeared in logs or screenshots. Track corrective work to completion and test the updated runbook.
