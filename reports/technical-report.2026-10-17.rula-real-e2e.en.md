# NIVASafe Authenticated RULA E2E — Technical Handover

| Field | Value |
|---|---|
| Project | NIVASafe |
| Jalali date | 25 Mehr 1405 |
| Gregorian date | 2026-10-17 |
| Status | Staging passed; live deployment blocked and not performed |

## Scope and implementation

The focused candidate changes `backend/src/ai-provider.ts` and `backend/src/modules/assessments.ts` relative to the active 15 October release. The RULA vision selector uses configured ArvanCloud with `GPT-5-Mini` and does not silently substitute a model. The request omits `reasoning_effort`, uses `max_completion_tokens` and JSON mode, and bounds image inference at 60 seconds. Assessment detail responses preserve `postureReviewComplete` after reload. Regression coverage is present in `backend/src/ai-provider.test.ts` and `backend/src/rula-registered-member.test.ts`.

The previous checkpoint attributed an HTTP 400 to `reasoning_effort`, but its raw response body was not retained; this pass cannot independently confirm the provider's original error text. The corrected candidate request shape received four HTTP 200 responses in the authenticated staging run.

## Evidence and validation

- Isolated staging: authenticated non-admin organization member, disposable MariaDB, real ArvanCloud provider, and one synthetic 23,063-byte PNG. RIGHT, LEFT, and BOTH were analyzed separately; all were manually reviewed, persisted, reloaded in a fresh session, and returned in JSON/PDF reports. Scores were 4 and lifecycle remained `IN_PROGRESS`.
- Negative checks: unauthenticated and cross-tenant requests returned 401; Viewer and missing image consent returned 403; invalid image signature returned 415.
- Focused backend suite: 79/79 tests passed, exit 0. Candidate adapter filter: 2 passed, 41 excluded, exit 0. Candidate TypeScript build: exit 0.
- Exact-candidate API E2E and browser UI were not run. Candidate Prisma generation could not be performed safely because the dependency path was junctioned into the active release and the operation hit EPERM. No workaround wrote into live dependencies.
- Active runtime uses `release-20261015-project-source-update`; public and local health returned HTTP 200. Runtime image privacy and capability provider settings are empty. No live files, process, configuration, database, or migration were changed.

## Artifacts

- Main bilingual evidence: `reports/RULA-REAL-E2E-AND-RELEASE.en.md` and `.fa.md`.
- Sanitized summary: `reports/evidence/rula-real-e2e-20261017/authenticated-rula-e2e-summary.json`.
- Detailed isolated staging evidence: `C:\NIVASafe\.local\rula-authenticated-e2e-20261017-01\evidence\authenticated-rula-e2e.json`.
- Focused test log: `C:\NIVASafe\.local\rula-authenticated-e2e-20261017-01\validation-timeout-fix\focused-validation.log`.
- Candidate build log: `C:\NIVASafe\.local\release-candidate-rula-20261017\backend\validation-final-build.log`.

## Release gate

Do not deploy until the test runtime has an approved image-processing policy, both RULA provider gates are intentionally configured for ArvanCloud, and the exact release candidate passes authenticated API E2E with its own generated Prisma client in a fully isolated dependency tree. Live acceptance must then verify consent, persistence, reload, and report behavior. No database migration is required by the scoped source changes; no live rollback snapshot was created because no deployment occurred.
