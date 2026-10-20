# Per-user AI access and allowance

## Request and diagnosis
FR-001: Display a per-user AI allowed/disabled control next to token usage; only global administrators may change it.
FR-002: Existing and new accounts default to enabled with a cumulative 100000-token allowance across organizations and AI features. Preserve historical usage; no automatic monthly reset was requested.
FR-003: Reject disabled, inactive and depleted accounts server-side before paid provider requests. Preserve assessment creation permissions, organization membership and subscription checks.
FR-004: Preserve uploaded images and the manual form on provider failure. Distinguish account access/allowance errors from provider unavailability.

Read-only production audits contain recent FMEA and RULA image-analysis failure events, including FMEA on 2026-10-10. They show the authenticated request reached the provider/analysis path. There was no per-user AI quota in the previous implementation, so the screenshot is not evidence of a depleted user allowance. The old audit does not retain a provider status or parser reason; the exact upstream/response failure cannot be recovered from that record.

## Implementation
- User.aiEnabled=true, aiTokenLimit=100000, aiTokensUsed=0 defaults; additive migration initializes historical usage from AIUsageRecord without removing any records.
- AIQuotaReservation holds conservative input/output allowance for at most 15 minutes. User-row SELECT FOR UPDATE serializes reservations across API instances and workers; external network calls run outside transactions. Actual reported usage settles the reservation. Missing provider usage uses the conservative estimate; local offline fallback and failed calls without reported usage release reservations without charging. Each successful provider attempt is charged even when response parsing later fails.
- Reservations include an input/image/context margin. Near the cap, a request may be rejected when remaining allowance cannot cover its reserved maximum. External provider errors without usage cannot be billed precisely.
- All production AI provider callers use the authenticated actor or stored request owner. Account controls do not grant assessment, upload, organization or subscription permissions. In-flight authorized calls are not cancelled when an administrator disables future access.
- PATCH /api/v1/admin/users/:id/ai-access accepts only {aiEnabled:boolean}; global administrator required. Update and audit are transactional. It cannot reset usage or change limits through mass assignment.
- Admin usage UI displays allowed status and cumulative used/limit/remaining; global consumption is exposed only to global administrators. Organization administrators retain scoped usage visibility and read-only access status.
- FMEA image analysis now uses the same isolated Arvan GPT-5-to-GPT-4o-mini vision fallback as RULA for eligible upstream failures. Authentication/quota failures do not trigger paid failover. Existing single-image limits and file-signature validation are preserved.
- FMEA shows access/subscription errors rather than replacing them with a generic image failure. RULA does not retry AI_ACCESS_* allowance errors.

## Verification
- Backend: 291 tests/40 files PASS; frontend: 215 tests/34 files PASS.
- Backend/frontend lint, typecheck and production builds PASS. Existing frontend bundle-size advisory remains.
- Real isolated MySQL/MariaDB baseline plus new additive migration: PASS. Default allowance, disabled account, row locking under concurrent requests, actual usage settlement and reservation release verified without external AI calls.
- Browser at 390/1440: default checked, disable/enable payload and reload, failed update preserves state, organization-admin read-only: PASS.
- Auth/mass assignment/missing-user negative endpoint tests PASS. Existing assessment and report regression suites PASS.
- Live provider semantic accuracy/availability: NOT_RUN; synthetic provider responses only. No production AI tokens were spent by validation.
- Full historic migration replay: FAIL before this change at 202608240002_global_role (duplicate globalRole column). This pre-existing clean-install defect is outside the additive quota migration; the current production migration history is complete through 202610050001. The upgrade migration was separately verified against the current schema baseline. No historic migration was edited or marked applied to disguise that failure.

## Integrity and rollout
Protected routes, data, assessments, roles, uploads and prior report/UI features remain. No dependencies were added. Backup includes database SQL, backend dist/prisma and frontend before rollout. Apply the additive migration, regenerate Prisma client, update compiled backend and frontend, restart API. PWA v50 invalidates old UI assets.

Rollback: restore backend dist/prisma and frontend from the recorded release backup and regenerate the previous Prisma client. The additive columns/table can remain, preserving usage. Do not restore the database dump over newer production writes without an explicit recovery decision.

## Scoped delivery checkpoints
01 analysis: request, actors, scope and audit evidence recorded.
02 design: existing admin token table, checkbox status, scoped global allowance columns.
03 frontend: loading/error/state preservation and responsive fixtures implemented.
04 backend: shared allowance service and provider boundary implemented.
05 persistence: additive migration, historic backfill, indexed expiring reservations and row-lock tests.
06 API: strict PATCH contract and connected UI.
07 authorization: global-admin-only mutation; organization scope preserved.
08 security: negative access/mass-assignment and race review; global usage visibility constrained.
09 tests: automated suites and isolated database verification.
10 QA: desktop/mobile checkbox, failure, default and read-only interaction checks.
11 deployment: production backups, additive upgrade and health/static verification.
12 final review: requirement coverage, preserved integrity, regression/security evidence and deployment state reconciled in project-state.json. The historic clean-install limitation and live-provider NOT_RUN remain explicit.

## Follow-up: repeated image error screenshot (2026-10-10)
- Read-only production audit inspection found the newest recorded image failure at 2026-10-10T08:31:45.739Z, before the AI access/failover release. There are zero success or failure audit events after 10:45 UTC; no post-release provider success is claimed.
- All 23 accounts have AI enabled with a 100000-token default limit. This does not mean accounts with historic usage at/over the limit have remaining allowance.
- Historical failures did not retain the underlying provider/parser code, so the exact cause cannot be reconstructed from the screenshot or those audit records. The earlier categorical attribution to a specific upstream cause was not verified.
- Added allowlisted failure code and bounded HTTP status to FMEA/RULA failure audits. Messages, response bodies, uploaded images, credentials and arbitrary error strings are excluded. Public API error envelopes and authorization remain unchanged.
- Validation: 293 backend tests / 41 files PASS; TypeScript build and lint/typecheck PASS; diagnostic tests rerun after code allowlist correction PASS; live public/local health HTTP200, asset hashes unchanged, unauthenticated admin mutation401.
- Deployed only the compiled assessment module and diagnostic helper, with previous module backed up at C:/NIVASafe/backups/image-analysis-diagnostics-20261010. No database, frontend or permissions changed in this follow-up.
- Real image analysis NOT_RUN; an actual post-release retry is required to establish whether the reported problem persists and capture its cause. No claim of successful AI analysis for other accounts is made.
