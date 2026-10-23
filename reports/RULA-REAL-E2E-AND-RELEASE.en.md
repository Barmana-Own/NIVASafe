# RULA Real E2E and Release Status

| Field | Value |
|---|---|
| Project | NIVASafe |
| Jalali date | 25 Mehr 1405 |
| Gregorian date | 2026-10-17 |
| Verdict | **Staging E2E passed; live deployment not performed** |

## Executive summary

The authenticated RULA workflow passed in isolated staging with a regular organization member, a non-identifying synthetic image, the real ArvanCloud gateway, and a disposable MariaDB database. RIGHT, LEFT, and BOTH analyses were returned, manually reviewed, saved, reloaded in a fresh session, and rendered as JSON and PDF reports. This is **not live-site acceptance**: the active backend remains on the previous release and its runtime image-approval gates are empty and fail-closed.

## Confirmed causes and fixes

- The active release's RULA selector still uses legacy image failover models instead of directly selecting the configured vision provider/model. A generic risk-model environment value does not prove the effective RULA model.
- The focused candidate routes RULA vision to configured ArvanCloud with `GPT-5-Mini`, without image failover or automatic model substitution.
- The prior checkpoint attributed HTTP 400 to `reasoning_effort`; its raw response body was not retained, so that attribution was not independently reproduced in this run. The candidate omits that field and uses `max_completion_tokens` plus JSON mode. Four authenticated staging image requests with this shape returned HTTP 200 and the gateway identified `gpt-5-mini-2025-08-07`.
- A previous image request was aborted at 45,011 ms by the 45-second timeout. The candidate uses a bounded 60-second image timeout.
- RULA detail GET now returns `postureReviewComplete`, preserving human-review state on reload.

Candidate source differences are limited to `backend/src/ai-provider.ts` and `backend/src/modules/assessments.ts`. Regression coverage present in the working tree includes `backend/src/ai-provider.test.ts` and `backend/src/rula-registered-member.test.ts`. The broader worktree contains prior unrelated changes; only the candidate-vs-active two-file source diff is attributed to this release candidate.

## Staging evidence

| Check | Observed result |
|---|---|
| Authentication and role | Regular organization member signed in; server-side JWT, membership, and permission checks remained active |
| Gateway/model | ArvanCloud; requested `GPT-5-Mini`; actual returned model `gpt-5-mini-2025-08-07`; all four image requests in the final run returned HTTP 200 |
| Input | Synthetic 23,063-byte PNG; consent supplied; image was sent to the gateway |
| RIGHT / LEFT / BOTH | Structured output; seven body-part fields per side, five detected, two requiring human review; BOTH retained separate LEFT and RIGHT results |
| Score and persistence | Score 4 for each staged assessment; rows persisted in isolated MariaDB; one image attachment each; version 3; review state persisted |
| Reload and report | Fresh-session reload passed; JSON report loaded; PDF returned HTTP 200 for all three assessments |
| Negative controls | Unauthenticated 401; cross-tenant 401; Viewer 403; missing image consent 403; invalid image signature 415 |

Scores are AI-generated suggestions, not professionally validated ergonomic findings. Ambiguous rows remained flagged for human review. Each saved assessment remained `IN_PROGRESS`; none was silently finalized or approved.

One synthetic fixture was reused for RIGHT/LEFT/BOTH; distinct-image association within one assessment was not tested. Browser/UI and Safari, oversized-image handling, duplicate submission, and a real provider failure after the timeout change were not exercised in this pass.

Sanitized evidence: [authenticated-rula-e2e-summary.json](evidence/rula-real-e2e-20261017/authenticated-rula-e2e-summary.json). Detailed staging evidence is at `C:\NIVASafe\.local\rula-authenticated-e2e-20261017-01\evidence\authenticated-rula-e2e.json`; credentials and user identifiers are omitted from this report.

## Live runtime and deployment

- The active `NIVASafe-API` scheduled task runs PM2. The Node backend entrypoint is `C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js`. Local and public health checks returned HTTP 200; API version was `0.1.0`.
- Read-only probes from the active service context passed DNS, TCP/443, and TLS 1.3. ArvanCloud's live catalog returned HTTP 200 with 90 models and listed `GPT-5-Mini`; a separate direct text inference returned HTTP 200 with `gpt-5-mini-2025-08-07`. A direct synthetic-image adapter probe also returned HTTP 200 and parsed seven body-part fields. These were provider/adapter probes, not the authenticated RULA application route, consent gate, or persistence flow.
- The configured chat model `DeepSeek-V4-Flash` was absent from that gateway catalog. Chat configuration was not changed and chat was not tested.
- The release candidate changes only two source files relative to the active release: `backend/src/ai-provider.ts` and `backend/src/modules/assessments.ts`. Candidate JS artifacts were built but not published.
- Runtime settings `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` and `RULA_IMAGE_VISION_SUPPORTED_PROVIDER` are empty. They were left unchanged. A direct provider HTTP 200 does not bypass these application gates or prove the authenticated production flow.
- Exact-candidate API E2E was not run because its generated Prisma client was missing. A prior generation attempt hit EPERM on a query-engine path through a junction into the active release; automatic review disallowed retrying or circumventing that path. No alternate write into live dependencies was attempted.
- In the detailed staging JSON, the three `persist-reload-report-*` check records carry `IN_PROGRESS` because that is the assessment lifecycle state; separate persistence fields confirm database row, JSON report, and HTTP 200 PDF. The staging process Windows principal was not retained, so identity equivalence with the live service is NOT VERIFIED.
- No production release files, services, runtime variables, or database records were changed. No migration was run. Since no release was deployed, no new production backup or rollback rehearsal was created.
- Active JS hashes: `dist/ai-provider.js` `8784D5C1124B8E727ED33E73E546DA92A0C91243671C89EE521EC67744206FCF`; `dist/modules/assessments.js` `F5F8CD21B7C03BCDCBC4A1ABF90F45D042646B308E47C25496AF9F73B1F59ABD`. Candidate JS hashes: `ai-provider.js` `15832B4CB5932E6EB0A9C0E84E7BB309C46FE7854286B31A2C2FC4098E5E667B`; `modules/assessments.js` `58F17A84B7896D25E01EDE71C6F15E33D183CE45E1EE8F4474C52945AF3EB131`. Candidate artifacts are not deployed.

## Validation

- Focused backend suite: 79/79 passed across five files; exit code 0. Saved output: `C:\NIVASafe\.local\rula-authenticated-e2e-20261017-01\validation-timeout-fix\focused-validation.log`.
- Candidate adapter tests: 2 passed; 41 excluded by the focused filter; exit code 0.
- The saved focused-suite log does not retain its invocation string; the suite/file/test totals and exit status come from the saved runner output. The one-off adapter harness was removed after the run; persistent regression coverage remains in `backend/src/ai-provider.test.ts`.
- Candidate release TypeScript build: exit code 0. Build log: `C:\NIVASafe\.local\release-candidate-rula-20261017\backend\validation-final-build.log`.
- The first unprivileged build attempt exited 2 because linked dependencies could not be resolved. A later build only read those dependencies and wrote output under `.local`, then exited 0.
- Candidate build command: `C:\Runtime\node\node.exe C:\NIVASafe\.local\rula-root-cause-20261017\backend\node_modules\typescript\bin\tsc -p C:\NIVASafe\.local\release-candidate-rula-20261017\backend\tsconfig.release.json` (exit 0). The first unprivileged attempt exited 2 because protected linked dependencies could not be resolved; the successful run only read those dependencies and wrote output under `.local`.
- Candidate adapter command, from `C:\NIVASafe\.local\rula-root-cause-20261017\backend`: `C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run src/ai-provider.candidate-20261017.test.ts -t "uses GPT-5-Mini for Arvan RULA images|keeps RULA vision requests bounded at 60 seconds" --reporter=verbose` (exit 0; 2 passed, 41 skipped by filter).
- Exact candidate API E2E: NOT RUN. Browser UI and Safari: NOT RUN.
- No callable Debug plugin tool was available in this session. Local Debug/TDD skills were used; the plugin itself was not run.

## Required to proceed with live acceptance

1. Explicitly approve the image-processing policy for synthetic RULA images through ArvanCloud and configure `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` and `RULA_IMAGE_VISION_SUPPORTED_PROVIDER` as `arvancloud` in the test runtime.
2. Run the exact candidate in a fully isolated staging backend with a Prisma client generated from that candidate's schema and dependencies that do not junction into `ProgramData`. Then run candidate API E2E and live acceptance before deployment.

