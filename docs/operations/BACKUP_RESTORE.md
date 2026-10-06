# Backup and restore runbook

## Required production configuration

- Enable Supabase daily backups and Point-in-Time Recovery when the selected plan supports the required recovery point objective.
- Set a target recovery point objective and recovery time objective in the operating agreement. Recommended pilot targets are RPO ≤ 24 hours and RTO ≤ 8 hours; production owners must approve stricter targets where contracts require them.
- Store evidence originals in the private `buildproof-evidence` bucket and include Storage recovery in the continuity plan. Database recovery alone does not recreate missing object bytes.
- Restrict restore authority to named platform owners protected by MFA.

## Quarterly restore exercise

1. Create an isolated recovery project; never test a destructive restore against production.
2. Restore the selected backup or PITR timestamp.
3. Apply any migrations newer than the restore point in order.
4. Run `npm run db:verify` and the three database QA suites.
5. Verify organization, membership, project, evidence metadata, material, approval, RFI, submittal, daily-log and change-order counts against the source control totals captured before the exercise.
6. Sample signed evidence downloads and confirm their stored SHA-256 digest.
7. Record actual RPO/RTO, discrepancies and remediation owners, then delete the isolated recovery environment under the approved retention procedure.

## Emergency restore decision

A restore can discard valid writes made after the selected point. The incident commander, data owner and platform owner must approve the recovery point after assessing audit events and communicating the expected loss window. Preserve the affected production database before replacement whenever possible.
