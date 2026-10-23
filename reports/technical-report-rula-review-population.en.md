# RULA AI review population — technical

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | technical | English | 2026-10-23 | 1405-08-01 | release-rula-review-population-20261023-01 |

Existing per-photo and per-side review tables now show actual available AI advisory angles and suggested scores, including original proposals retained after an independent quality audit. Completed observations no longer claim image analysis or manual review is waiting. Each group has its own result; the initial summary shows a provisional overall score only when all seven proposals exist, otherwise it describes the actual partial result.

Both existing group tables retain six compact, unbroken columns, visible angle/status separators, existing edit controls and bounded horizontal scrolling on mobile and desktop. No unrelated screen, route, field or action was added, hidden or removed.

## Limits and data requirements

Unavailable angles remain unavailable. Force and repetitive-muscle controls continue to receive supported server/activity values; a photograph does not establish load, hold duration or repetition. Existing 0/false form defaults remain when no supported suggestion exists and must not be interpreted as measured AI facts. Quality explanations and human confirmation/final approval remain mandatory where already required. No anatomical-accuracy or whole-product security certification is claimed.

## Validation and delivery

| Check | Status |
|---|---|
| Backend tests | PASS — 858/858 |
| Frontend tests | PASS — 527/527 |
| Domain tests, typecheck/lint, schema validation, frontend/backend builds | PASS |
| Isolated actual-artifact browser / deployed acceptance | PASS — 10 / 3 |
| Strict browser/backend contracts / compatible rollback contracts | PASS — 39 responses / 10 rollback checks |
| Scoped security/preservation and public/API health | PASS |
| Real AI/provider/anatomical accuracy, database migration, dependency audit | NOT_RUN — synthetic fixtures; no migration/dependency change |

Published to the application server; final independent artifact review is recorded separately.

## Architecture and integrity

529 frozen source files; only reviewed source/test changes and scoped CSS. Runtime API modules: rula-measurement.js, rula-posture-ai.js. Optional strict boolean: measurement.aiDetected. All audited values and approval predicates remain unchanged.

Scoped review preserved independent audited values, strict metadata validation, consent, authentication, tenant isolation and final approval checks. Synthetic browser endpoints are confined to loopback; no real image, provider request or production business mutation was used. Dependencies and database schema/migrations are unchanged. Public file bytes, private release hashes, managed API identity/health, environment, proxy and unchanged worker are checked.

## Verification history

The initial complete frontend run passed 526/527; one pre-existing source-string assertion expected the old result assignment. It was updated to retain anatomical-side selection and require the proposal fallback, while behavioral tests remain authoritative. The first manifest, failed report, source and logs are retained in attempt-01-stale-ui-contract. Backend/domain source inputs were proven identical and the already passing 858 backend tests were reused explicitly; frontend tests, type/lint/schema checks and both builds then passed. Early focused runner/typing assertions were corrected before freezing. Compatibility-build environment failures are retained by rollback-compat.mjs; no production dependency was installed or modified. The first browser run passed 9/10; its English tablet keyboard probe chose the RTL scroll key for an LTR region. The original helper, result and screenshots are preserved under attempt01; a direction-aware forward/reverse keyboard assertion then passed all ten cases without product or CSS changes. Independent preflight also corrected a compatibility inventory field mismatch in the release helper before any deployment.

## Deployment and rollback

Restore C:/ProgramData/NIVASafe/backups/release-rula-review-population-20261023-01/index.html atomically and use release-rula-review-population-20261023-01-rollback-compatible for the API. That prebuilt artifact retains the previous behavior and adds only acceptance of optional AI provenance, validated against legacy/new stored inference and observation metadata. A bare old strict binary must not be used after new metadata has been stored; no data stripping or rewriting is required.

Entry: /assets/index-C14xwQXN.js; CSS: /assets/rula-review-tables-c72bf8d1fcc1.css; API: release-rula-review-population-20261023-01; PID: 10380. 18 prior stylesheet links and all prior static/private files preserved; only API entry/version configuration changes. No business-data mutation or migration.

## Scoped stages

01–02: requirements/quality limits and existing UI architecture; 03–04: advisory presentation/provenance; 05–07: existing persistence/API/auth contracts plus compatible reader; 08–10: security, regression and responsive QA; 11–12: immutable publication, compatible rollback and independent final evidence review.
