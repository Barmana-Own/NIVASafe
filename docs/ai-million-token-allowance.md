# One-million-token AI allowance

## Delivered change

- Default per-user cumulative AI allowance: 1,000,000 tokens.
- All 23 existing users with the former 100,000-token allowance were upgraded.
- Existing consumption and enabled/disabled access decisions are preserved.
- Migration upgrades only the former default; separately configured quotas are preserved.
- Prisma schema, generated production client, backend constant and admin UI fallback use the new default.
- Original migration remains immutable; a new forward migration performs the upgrade.

## Validation

| Check | Result |
|---|---|
| Backend tests | PASS 295 tests / 41 files |
| Frontend tests | PASS 224 tests / 35 files |
| TypeScript/lint and production builds | PASS both packages |
| Prisma schema validation | PASS with required environment loaded |
| Disposable MySQL migration | PASS new default, upgrade, existing usage/access and custom quotas |
| Concurrent quota reservations | PASS row locking, charging, release and denied access |
| Live migration | PASS 23/23 upgraded; consumption and access preserved |
| Generated production client | PASS default 1,000,000 |
| Public/local API health and public login | PASS HTTP 200 |
| Served assets | PASS SHA-256 matches |
| Unauthenticated admin mutation | PASS HTTP 401 |
| Existing AI provider | PASS unchanged against pre-release backup |

Initial schema validation without DATABASE_URL failed and was rerun successfully with the existing environment. The isolated database test exposed a stale generated Prisma default, fixed by regenerating the client before revalidation. Windows locked the production engine during regeneration; the API was briefly stopped, the client regenerated successfully, and the service restarted and verified healthy.

The older broad release verifier compares unrelated provider source build output to production and reported a mismatch after rebuilding. This release did not overwrite that provider: the live provider matches the pre-release backup exactly. The dedicated quota verifier checks the changed allowance build, generated default, preserved provider and live health/assets. No whole-project source/deployment equivalence is claimed.

## Security and preservation review

No changes to identity, authorization, upload validation, tenant isolation, per-user access decisions, quota reservation accounting or provider selection. No usage reset, user deletion, destructive schema change or real external AI call. Existing schema fields, user records, features and routes are retained. Existing bundle-size advisory remains.

## Operations

- Migration: backend/prisma/migrations/202610100002_ai_million_token_allowance/migration.sql.
- PWA cache: v54.
- Backup: C:/NIVASafe/backups/release-ai-access-million-20261010 (database, backend dist/prisma and frontend).
- Verification: scripts/check-million-quota-live.mjs with the existing environment.
- Rollback should preserve newer usage. Restore code/client from backup and deliberately reset only quota values if the previous limit is required; do not restore the entire database over newer writes.
