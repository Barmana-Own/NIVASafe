# NIVASafe Debug Edits 01–03 Implementation Plan

## Scope and constraints

Implement the attached Debug brief against the integrated project. Preserve the existing JWT, organization scoping, RBAC, AI accounting, FMEA/RULA scoring, canonical `CorrectiveAction` records, status history, and export behavior. Use additive Prisma migration(s) only. Never run the repository `db:migrate`/`db:push` script because it invokes `prisma db push --accept-data-loss`. Keep unclassified legacy actions visible.

## Work sequence

1. **Capture existing behavior and contracts**
   - Run focused backend/frontend regression suites before edits.
   - Map auth helpers, notification routes, support/admin navigation, action forms and filters, report selectors, and persisted assessment payloads.
   - Record whether a disposable MySQL instance is available without exposing credentials.

2. **Personal quota state and support workflow**
   - Add a self-only quota DTO with integer-clamped remaining tokens, configurable threshold (default 100,000), `HEALTHY`/`LOW`/`EXHAUSTED`/`DISABLED`, and a server timestamp.
   - Add an allowance-cycle version so deterministic LOW/EXHAUSTED notification identities re-arm only after an authorized limit change. Reconcile after usage debit, admin allowance edits, and authenticated quota/notification refresh; preserve `readAt` and avoid charges during status reads.
   - Add scoped, rate-limited, idempotent support requests with requester-only reads, global-super-admin queue/status/reply operations, audit events, and a reviewed additive migration. Do not implement payment or automatic upgrades.
   - Render a real localized quota notice/support form and add an authorized support queue. Permit only an explicit internal route for quota links.

3. **Typed action API and forms**
   - Extend `GET /actions` with validated `type` and `rulaId` filters while preserving existing parameters and pagination envelope.
   - Reject mixed/orphaned FMEA/RULA links, mismatched item/assessment/project/org links, and invalid RULA side/impact; keep project-only historical actions classified as unclassified.
   - Update typed FMEA/RULA forms and action lists to use the server filters and canonical IDs; retain current status/progress mapping and permissions.

4. **Truthful report action progress**
   - Use a shared action-ID inventory for FMEA/RULA: remaining recommendations are distinct from persisted actions; OPEN/ASSIGNED and other active states are registered active; terminal/cancelled records do not inflate progress; completed only follows a confirmed persisted status.
   - Ensure exact assessment scoping and RULA side deduplication. Persist FMEA suggestion dismissal with organization/user/assessment scope and stable recommendation identity; document the user-specific policy.
   - Keep empty inventories at 0/0/0 and preserve FMEA/RULA domain scores independently from action completion.

5. **Verification and handoff**
   - Add/run focused RED/GREEN backend and frontend tests, then relevant package typechecks/builds and full suites if the baseline permits.
   - Validate the additive migration with Prisma validation and a disposable database only if available. Exercise real API/browser flows only with a local seeded test environment; do not substitute fixtures for API evidence.
   - Create `docs/edits/03-debug-engineering-01-03-results.md` with findings, changed APIs/DTOs/migrations, acceptance matrix, exact test evidence, browser/network evidence, and unresolved environment/platform blockers.

## Acceptance checkpoints

- Quota threshold boundary, disabled-vs-exhausted, self-only authorization, deduplicated read-preserving notification, and re-arm behavior.
- Support validation, tenant isolation, idempotency, rate limiting, requester ownership, admin review authorization, and audit.
- FMEA/RULA create payload separation, relationship integrity, `type`/`rulaId` filter, pagination, and legacy unclassified visibility.
- Report buckets are exclusive, stable across refresh, action-based, assessment-scoped, and side-correct; dismissal survives refresh and AI regeneration.
- Migration remains additive; no destructive database operation; Windows compatibility is reported only if tested on Windows.
