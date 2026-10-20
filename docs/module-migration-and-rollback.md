# Task 05 migration and rollback plan

Date: 2026-10-15. Migration `backend/prisma/migrations/202610150002_task05_checklists_incidents_support_replies/migration.sql` is additive and is **not applied** in this workspace.

## What the migration adds

- `ChecklistTemplate`: organization-owned versioned template drafts/publications and JSON item definitions.
- `ChecklistInspection`: organization-owned run state, frozen template snapshot, JSON answers, and review metadata.
- `IncidentReport`: organization-owned incident/near-miss intake and initial review state.
- `SupportReply`: append-only reply messages attached to existing support requests.
- Foreign keys and list/query indexes for tenant/status/owner access. No existing table or column is dropped, renamed, rewritten, or backfilled.

The Prisma schema validates and the Prisma client generates against the current schema. There is no disposable MySQL/MariaDB instance available to execute the migration, so SQL acceptance, lock behavior, and migration-ledger state remain unverified. The migration must be reviewed against the target server version/collation and tested on a disposable database matching production before release.

## Before staging or production

1. Identify the actual deployment and database owner; this workspace did not establish whether any running service is local, staging, or production.
2. Review the exact Prisma schema and SQL migration. Confirm the database supports all index and foreign-key definitions and has sufficient free space.
3. Take and verify a consistent database backup, including the `_prisma_migrations` ledger. Record the backup location and recovery owner in the release record without copying credentials or health data into logs.
4. Apply the migration to an isolated disposable database restored from a safe fixture. Run the backend focused tests and exercise create/list/review/reply plus tenant-isolation cases against that database.
5. Deploy the backend version compatible with the schema using the repository's reviewed migration path. Do **not** use the package command `prisma:migrate`; it runs `prisma db push --accept-data-loss`.
6. Run `prisma migrate deploy` only in an explicitly selected staging/production environment after that environment's normal approval and backup process. No deployment is authorized or performed by this task.
7. Verify application/API behavior and logs without recording report narratives, support reply bodies, secrets, or personal health data. Observe error rates before enabling the links broadly.

Example for a disposable environment only (configure `DATABASE_URL` through its secret manager; do not paste a credential into shell history):

```sh
pnpm --filter @nivasafe/api exec prisma migrate deploy --schema prisma/schema.prisma
```

## Rollback

This migration is additive, so application code can be rolled back while leaving the four new tables and migration ledger intact; the previous application does not depend on them. **Do not drop these tables as an automatic rollback**: users may already have created records, and deleting them would destroy business data.

If migration or deployment validation fails before users can write new records, stop the release and restore the pre-migration backup under the database owner's recovery process. If users may have written after the backup, preserve those rows and prefer a forward corrective migration or application rollback that leaves the additive tables intact. A table-removal migration requires a separately reviewed data-retention decision and a verified export/backup; it is outside this task.

No backup, migration execution, rollback, or production/staging operation was performed here. The repository has no `.git` metadata, so no commit or revert reference can be supplied.
