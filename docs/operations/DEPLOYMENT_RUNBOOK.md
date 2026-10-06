# Deployment and rollback runbook

## Environments

Maintain separate Supabase and Vercel development, staging and production environments. Each environment uses its own project URL, publishable key, OAuth callback URLs, SMTP configuration and database credentials. Never point preview builds at production data.

## Release

1. Create a focused branch and pull request.
2. Require the Release gate and CodeQL checks.
3. Apply new migrations to staging and run all database verification and QA commands.
4. Deploy the application to staging and run `SMOKE_BASE_URL=https://staging.example npm run smoke`.
5. Run the bounded load check only with provider approval: `LOAD_BASE_URL=https://staging.example npm run load:smoke`.
6. Review migration lock duration, performance advisor results, accessibility-critical flows and the provider status pages.
7. Merge to `main`, allow Vercel to build the production deployment, then run the production smoke test.
8. Monitor health, authentication failures, function errors, database load and evidence uploads during the release window.

## Rollback

- Application-only failure: promote the last known-good Vercel deployment.
- Forward-compatible database failure: roll back the application and prepare a forward database correction.
- Destructive or incompatible schema failure: invoke the incident and backup/restore runbooks. Never edit or delete an applied migration to disguise production state.

Record the deployed commit, migration names, operator, start/end times, smoke result and any exception in the release log.
