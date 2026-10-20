# Persistent RULA report AI results

## Scope and root cause

Saved reports previously kept generated corrective suggestions only in component state. GET returned local advisory rows; mounting the report POSTed for new suggestions, and updatedAt/locale changes repeated the request. Posture analyses and scores already live in RulaAssessment and do not need report-time AI calls.

## Implementation

- Store the complete first suggestion response in existing indexed AuditLog JSON metadata, action `RULA_REPORT_AI_SNAPSHOT`, entity `RulaAssessment`, tenant organization and assessment ID. Snapshot version 1 is validated on reads. Existing audit/usage summaries remain intact.
- GET reports and exports read the persisted snapshot, including bilingual rows, provider/model and truthful AI status. They never call AI.
- POST checks authentication, reports.generate permission and assessment ownership before accessing the snapshot. If present, it returns the identical response without generation or additional AI usage accounting.
- Concurrent first requests share one pending promise; the snapshot is committed before a response is returned. The pending promise is removed after success or failure. Current production PM2 configuration has one fork process (verified); horizontally scaled workers would need a database/distributed generation lock before scaling.
- Saved report UI skips POST entirely when GET supplies a snapshot. Its initial-request identity no longer contains locale or updatedAt. Empty successful output and unavailable/fallback results are persisted too, avoiding retry storms on refresh. Existing bounded retries remain within the initial generation.
- Route identity checks prevent the previous assessment's response from being displayed or requested during navigation.
- No schema migration, credential/configuration change, deletion, UI redesign or automatic invalidation on action edits. Manual edits, assessment scores, independent image results, exports and permission boundaries are preserved. Recommendations remain the original snapshot for this assessment; a new assessment has its own result.

## Compatibility and limitations

Older suggestion text was never stored and cannot be recovered. A legacy assessment without a snapshot generates once on its next report visit, then reuses that stored result. Local fallback results retain their unavailable status and are not presented as successful AI analysis. Database errors fail the request; they are not silently swallowed. Audit snapshots must be retained as assessment data if audit retention is introduced later.

## Verification

| Check | Result |
| --- | --- |
| Backend tests | PASS: 278 tests / 38 files |
| Frontend tests | PASS: 206 tests / 31 files |
| Backend/frontend build, lint and typecheck | PASS; existing large frontend chunk warning remains |
| API contract | PASS: 69 frontend paths, 126 backend routes |
| Release verification | PASS: 28 checks |
| Browser regression with synthetic API/data | PASS: initial POST 1, refresh POST 0, revisit POST 0, no page errors |
| Cache regression | PASS: new API instance reuses persisted response; concurrent first requests coalesce; empty/fallback outputs remain fixed; tenant/permission denial preserved |
| Security review | PASS for changed boundaries: tenant-scoped reads, ownership before cache, bounded validated snapshots, no client-provided snapshot trust, no secret/provider error leakage, existing rate limits and React escaping retained |
| Real production assessment/provider mutation | NOT_RUN: no private assessment images/data submitted or modified for verification |
| Local/public health | PASS: HTTP 200, MySQL up |
| Deployed assets and affected backend hashes | PASS: source and public/runtime artifacts match |

## Release and rollback

Published 2026-10-09 with PWA cache v32. Rollback snapshot: `C:/NIVASafe/backups/release-rula-persistent-ai-20261009-132224`. Restore that frontend and backend/modules/reports.js, then restart the existing nivasafe-api PM2 process. The new helper can remain unused after rollback; persisted snapshot audit entries should be preserved. No database migration or destructive operation was performed.

Browser regression: `scripts/check-rula-snapshot.cjs`, `frontend/test-fixtures/rula-snapshot.*`. Health/hash evidence: `C:/NIVASafe/backups/rula-persistent-ai-evidence.json`. Frontend test evidence: `C:/NIVASafe/backups/rula-persistent-ai-web-tests.log`.
