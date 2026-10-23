# Technical RULA recovery and account-consent report

| Project | NIVASafe |
|---|---|
| Report | Technical |
| Language | English |
| Gregorian | 2026-10-20 |
| Jalali | 1405-07-28 |
| Release | release-rula-account-consent-20261019-01 |
| Revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf + preserved dirty tree |
| Delivery | DEPLOYED_CODE_ONLY; public image activation BLOCKED |

## Architecture and trust boundaries

20 source/test/style files changed. Four executable backend modules changed: image-processing-consent.js, modules/assessments.js, modules/auth.js, modules/image-processing-consent.js. Source and tested candidate match. Existing source, public assets, API routes, dependency manifests, RULA scoring and tenant boundaries are preserved. Two legacy unused split CSS files were restored byte-for-byte; actual styles load through the component and enterprise stylesheet.

The server's latest own-user/global ImageProcessingConsent audit record determines acceptance of image-processing-account-2026-10-19-v1. PUT strictly accepts accepted and current policyVersion, serializes decisions with a parameterized User row lock, and records accept/withdraw timestamps. The actor supplies identity; client userId is rejected. Registration requires nivasafe-terms-2026-10-19-v1, keeps image consent optional, writes it atomically and preserves pending activation. GET/PUT /api/v1/profile/image-processing-consent are authenticated, private/no-store; PUT is rate-limited. RULA policy and POST both check durable account consent independently of legacy multipart compatibility fields. A linked actor/tenant/request/image-hash receipt is written before external transfer. Account acceptance never changes platform flags or tenant permissions.

No schema, migration, dependency or model-routing change. Protected runtime .env hash remains 180f0951381b8eb9c26126d355fd195a25ca33ac913809744513947b62db2f53. Active service is SYSTEM Scheduled Task NIVASafe-API, PM2 nivasafe-api, Node22.22.3, API5044. Only API was restarted; worker configuration was preserved. Backend entry: C:\ProgramData\NIVASafe\releases\release-rula-account-consent-20261019-01\backend\dist\server.js; PID 6608. Frontend: C:/inetpub/nivasafe/app-com; index 52a461c18eab7e44ea83dd7548597305714f32b1c4ce0b50acfdc6b9b712ff88.

## Validation matrix

| Check | Actual result |
|---|---|
| pnpm10.13.1 backend test/typecheck/lint/build | PASS; 645 tests in 70 files |
| pnpm10.13.1 frontend test/typecheck/lint/build | PASS; 438 tests in 63 files |
| pnpm10.13.1 shared/domain test/typecheck/lint/build | PASS; 19 tests in 2 files |
| Total automated tests | PASS; 1102 = 645 backend + 438 frontend + 19 domain |
| API contract / release verifier | PASS; 94 frontend paths, 157 routes, 29 checks |
| Production/staging schema | PASS; read-only information_schema, 37 tables/422 columns, no migration |
| Source/artifact and configured-secret review | PASS; unchanged schema/public assets/dependencies, no configured secrets/private keys in checked source/build |
| Final isolated Chrome | PASS; 390fa and 1280en, separate unchecked registration choices, legal pages, real computed styles, inline 2 groups/7 rows, manual RIGHT/BOTH, save/relogin/report/PDF, 0 page errors and overflow |
| Negative consent/security | PASS; anonymous401, injected userId400, no current acceptance403, withdrawal403, separate users, allowed cross-organization account consent, tenant resource404, unreviewed AI finalization400 |
| Genuine external boundary | PASS; 4/6 capped synthetic image calls, all HTTP200, requested GPT-5-Mini, 2 ordinary-user organizations, RIGHT/LEFT/BOTH, 3 reviewed records/PDF; no text request |
| Production public browser | PASS; 8 anonymous cases, 0 JavaScript/first-party API errors |
| Rollback | PASS; real isolated PM2 old/new/old and static index restoration, full591-file frontend and16644-file backend backups |
| Live real-photo / private-report tests | NOT_RUN; actual authorization missing; synthetic-only restriction |
| Independent anatomical benchmark / Safari | NOT_RUN; accuracy research paused / browser unavailable |

Commands: corepack pnpm run test, typecheck, lint and build in each isolated candidate package; node scripts/check-api-contract.mjs; node scripts/verify-release.mjs. Logs: C:/NIVASafe/reports/evidence/rula-account-consent-20261019-01/validation.json and package-command.log files. All tests were run; no failing test was removed or loosened to hide a defect. Existing fixtures were updated to supply explicit current consent and exact additive policy fields.

## Defects, rework and final security review

The image-present conditional hid scoring panels; the inline/editor branches now both preserve controls. The mobile legal page inherited a login hide rule; it now has independent classes. Legacy split stylesheet edits were not in the actual entrypoint; scoped styles moved to the active import path and computed-style checks verify the result. Table header wrapping and dark-theme description contrast were fixed. Initial unit failures concerned new explicit-consent fixtures; those fixtures and exact expected additive fields were corrected. Browser harness failures involved the account-type Continue control, login readiness and a20s cold-start deadline; the measured old-artifact start was25.285s, so the bounded staging wait is60s. Failure receipts remain in evidence.

Final affected-boundary review found no unresolved introduced material auth, IDOR, injection, CSRF/CORS, path, upload, secret, audit or consent bypass. Own-user identity comes from the authenticated actor; SQL is parameterized; audit failure prevents transfer; quotas, role/org gating, image signature/size normalization, human review and private attachment access remain. No production test flag, fixture, debug endpoint, extra model or API credential entered client output. Existing PM2 WMIC process-metrics warnings are non-blocking and unmodified; executable identity and health were checked directly. The audit is scoped, not a claim that all historic product security issues were assessed.

## Release and recovery

DEPLOYED_CODE_ONLY. Backup C:/ProgramData/NIVASafe/backups/release-rula-account-consent-20261019-01; staged frontend C:/inetpub/nivasafe/staging/release-rula-account-consent-20261019-01-final. Rollback: `C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\rula-account-consent-20261019-01\release.mjs rollback`. Preflight checks entry/PID, old index, config and protected-env hashes. Assets precede atomic index cutover. Only API code/config changes; no production data mutation. Automatic rollback is wired for a critical cutover failure and preserves later records/uploads. It was rehearsed; actual production rollback was not needed.

Actual provider terms/platform authorization remain BLOCKED at docs/legal/rula-image-platform-approval.2026-10-19.md. Both production image flags remain empty. Synthetic technical vision support is demonstrated; those facts do not authorize real user photos. The final approved provider notice may require a new account-consent version. New authenticated production write journeys were NOT_RUN to avoid private-data transfer; synthetic staging acceptance is explicit. Prior timeout/alias evidence remains in the earlier release; these4 successes are not an SLA or anatomical proof.

## Twelve-stage scoped handoff

01 requirements: PASS; 02 existing design/RTL/component decisions: PASS; 03 actual frontend: PASS; 04 consent/backend: PASS; 05 existing schema preservation: PASS, no migration applicable; 06 API wiring: PASS; 07 own-account/tenant authorization: PASS; 08 affected-boundary security: PASS; 09 automated testing: PASS; 10 actual browser QA/rework: PASS; 11 controlled release/rollback: PASS; 12 source/artifact/report integrity: PASS for this scoped safe-code delivery. Whole-product anatomical/public-image acceptance remains unapproved. Evidence inventory and machine-readable manifest are in C:/NIVASafe/reports/evidence/rula-account-consent-20261019-01 and release-manifest.json.

The final report-fact gate initially found that the technical reports omitted the explicit total1102, although all package counts were present. Both language versions now state the total; this was a documentation repair, not a changed test result.
