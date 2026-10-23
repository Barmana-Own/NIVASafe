# NIVASafe Integrated Final QA, Release and Handover

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Technical acceptance and release handover |
| Gregorian date | 2026-10-16 |
| Jalali date | 1405/07/24 |
| Repository | C:\NIVASafe |
| Branch / HEAD | main / e5bf3f050bd6e127e13918c8d3eefcd3f8376acf |
| Verdict | BLOCKED — no production cutover |

## Executive result

The Windows Vite/Vitest config-loading failure was reproduced and worked around in the project scripts without changing Windows permissions or security controls. Direct isolated package builds, type checks and all 737 unit tests pass. The support-ticket workflow passed API, MariaDB and browser tests in isolated staging.

Release acceptance remains blocked. The single bounded synthetic RULA image request reached the configured ArvanCloud chat-completions gateway and received HTTP 401. The application returned a sanitized 503 and persisted no posture result. No valid response was obtained for the chat model, FMEA image flow, or authenticated live-site journeys. No deployment or production database mutation was performed.

## Runtime and repository baseline

- Source root: C:\NIVASafe; branch main; HEAD e5bf3f050bd6e127e13918c8d3eefcd3f8376acf.
- The timestamped pre-edit backup recorded 378 Git status entries. Existing unrelated edits were preserved; no reset, clean, forced checkout or broad replacement was used.
- Validation runtime: Node v24.19.0 and pnpm 11.25.0. Root package.json pins pnpm@10.13.1.
- Current command identity: srv9298144857\codexsandboxoffline. Process, Task Scheduler and protected runtime/config inspection were denied. No secret values were read or reported.
- Observed listeners: Node API on 127.0.0.1:5044 (PID 832), Nginx on 0.0.0.0:80 and :443 (PID 6244), MySQL on 0.0.0.0:3306 (PID 4456). NIVASafeMariaDB is Running/Automatic. The active API health endpoint returned HTTP 200 with status healthy, database up, engine mysql, and version 0.1.0.
- Static web root: C:\inetpub\nivasafe\app-com. Its index references index-Oi8C_V4d.js and index-dHBcyaJi.css, whose hashes match C:\NIVASafe\frontend\dist; the web root also contains an additional sidebar-header CSS file and a different index.html. The current QA candidate generated index-DfoYd8t8.js and index-BYkR_3Tt.css in the isolated workspace. Those assets were not copied to the live root.
- The existing deployment release directory release-20261015-project-source-update exists under C:\ProgramData\NIVASafe\releases. Service-manager command lines could not be independently inspected in this restricted session; no service was restarted.
- The in-app browser loaded https://app.nivasafe.com/login. It did not authenticate a member or administrator. Public health access was blocked by the current browser/network path and is not counted as verified.

## Changes in the final QA pass

The following focused changes were made in the source tree:

- frontend/package.json: use Vite's runner config loader in build/test scripts.
- frontend/vite.config.ts: do not scan local env files in production, test or CI; document the Windows config-loader workaround.
- backend/package.json: use the runner config loader for tests and limit test workers to two.
- backend/vitest.config.ts: add test configuration that disables local env-file loading.
- scripts/verify-release.mjs: assert the Windows-safe frontend build/test and backend test script configuration.

No schema, migration, provider secret, privacy approval, production environment value, uploaded user file, or service setting was changed in this pass. The support authorization correction and tests from phase 02 are in backend/src/modules/support.ts and backend/src/support.test.ts; the UI changes and synthetic browser evidence from phase 01 remain in place. Their detailed reports are reports/final-debug-rula-tickets.md and reports/final-ui-ux-validation.md.

The existing working-tree diff also contains dependency and test-runner edits that predate this final QA pass: Fastify and Nodemailer version changes, and removal of `@playwright/test` plus the frontend `test:e2e` scripts while `frontend/playwright.config.ts` and E2E sources remain. These changes were preserved. Since the package is absent and registry access is blocked, Playwright could not be restored or run here; this remains an unresolved test-coverage regression to address in an environment with the pinned package manager and dependency access.

## Windows EPERM diagnosis

Two environment failures were distinguished:

1. Vite/esbuild attempted to scan the protected ancestor directory C:\Users\Administrator while loading frontend/vite.config.ts and backend/vitest.config.ts, producing “Cannot read directory ../../../../..: Access is denied.” Passing --configLoader runner avoided that scan. Direct Vite build and Vitest runs using this loader passed in the isolated workspace.
2. The active pnpm executable is 11.25.0 while the repository pins 10.13.1. Its preflight tried to reconcile the existing modules directory and, without a TTY, exited with ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY before the requested script ran. The package store/cache attempts also encountered protected-path EPERM and offline-metadata failures. No dependencies were destructively removed, no broad ACL changes were made, and Defender/antivirus was not disabled.

The Vite production/test/CI configuration avoids reading repository env files in those modes; process-supplied VITE_* values remain available, and the same-origin production API default remains /api/v1. The source contains no API-key values.

## RULA image flow and provider

- Code selects GPT-5-Mini for risk assessments and DeepSeek-V4-Flash for chat. These are configured request identifiers, not evidence of successful provider operation.
- Risk provider selection is independently controlled by AI_RISK_PROVIDER, with an optional AI_RISK_FALLBACK_PROVIDER. ArvanCloud uses ARVAN_BASE_URL, defaulting to https://api.arvancloudai.ir/v1, and posts to /chat/completions.
- Image approval remains fail-closed through RULA_IMAGE_PRIVACY_APPROVED_PROVIDER and RULA_IMAGE_VISION_SUPPORTED_PROVIDER. Those production gates were not changed.
- The prior bounded staging run used frontend/test-fixtures/rula-ai-synthetic.png. Authentication, organization/role, quota, consent, image-signature and server capability checks reached the provider boundary. The gateway returned HTTP 401; the app returned HTTP 503 RULA_IMAGE_AI_UNAVAILABLE with retryable=false and sanitized request ID b8e12c19-f17b-4c7a-9cdd-875209157873. No score or result was saved.
- Negative tests passed for unauthenticated 401, missing consent 403, read-only viewer 403, and invalid signature 415.
- The 401 proves the configured credential/authorization was rejected. It does not distinguish a revoked/wrong key from missing model entitlement or another gateway authorization rule. Therefore actual GPT-5-Mini vision plus structured-output compatibility remains unverified. No automatic model substitution or fabricated score was used.
- Chat did not produce a successful application-level response with DeepSeek-V4-Flash. FMEA image analysis was not exercised against a live provider. A provider model catalog string is not treated as an operational test.

## Support tickets

The phase 02 root cause was a fail-closed operator policy: SUPPORT_OPERATOR_USER_IDS and SUPPORT_OPERATOR_ORGANIZATION_IDS were absent from the observed production PM2 configuration. The source now permits the active database-confirmed protected system administrator when allowlists are absent, with selected-organization scoping, audit records and requester/internal-note separation. Other unlisted administrators remain denied. No production allowlist or role was changed.

The isolated MariaDB/API and browser journey passed:

- Member routes: POST/GET /api/v1/support/requests, GET /api/v1/support/requests/:id, POST /api/v1/support/requests/:id/replies.
- Admin routes: GET /api/v1/admin/support-requests, GET /api/v1/admin/support-requests/:id, POST /api/v1/admin/support-requests/:id/replies, POST /api/v1/admin/support-requests/:id/internal-notes, PATCH /api/v1/admin/support-requests/:id, GET /api/v1/admin/support-staff.
- Member create returned 201; same-key replay returned 200; changed-content key reuse returned 409. Replies returned 201, administrative update returned 200, and rows remained available after reload.
- Cross-organization lookup returned 404; unauthenticated request returned 401; unlisted admin stayed denied; internal notes were not returned to members. Three reply notifications were created.
- Browser flow used the isolated staging API/database and existing /support and /admin screens. This does not prove the code is deployed or that a production member can authenticate.

## Validation evidence

All source/build/test commands below used the isolated copy at C:\Users\Administrator\AppData\Local\Temp\NIVASafe-debug-phase02-20261016-070300, whose frontend, backend and shared-domain source file sets matched the repository; current package/config/verifier files were synchronized before the final run. Logs are saved in reports/evidence/phase03-final-validation-20261016/.

| Command/check | Result |
|---|---|
| node --version | v24.19.0, exit 0 |
| pnpm --version | 11.25.0, exit 0 |
| Domain tsc build and no-emit check | PASS, exit 0 |
| Backend tsc build and no-emit check | PASS, exit 0 |
| Frontend tsc build and no-emit check | PASS, exit 0 |
| Frontend Vite build with --configLoader runner | PASS, exit 0; existing 554.83 kB minified entry-chunk warning |
| Domain Vitest | PASS, 1 file / 12 tests, exit 0 |
| Backend Vitest with --configLoader runner --maxWorkers=2 | PASS, 60 files / 403 tests, exit 0 |
| Frontend Vitest src with --configLoader runner | PASS, 50 files / 322 tests, exit 0 |
| node scripts/check-api-contract.mjs | PASS, 90 frontend paths / 154 backend routes, exit 0 |
| node scripts/verify-release.mjs | PASS, 29 checks, exit 0 |
| git diff --check | PASS, exit 0; pre-existing LF/CRLF conversion warnings only |
| pnpm lint, typecheck, build, test, verify:contract, verify:release | Each exited 1 before the command ran because pnpm attempted module-directory reconciliation without a TTY (ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY). Direct package and Node script equivalents above passed. |
| pnpm audit --prod | BLOCKED, exit 1; npm registry advisory endpoint returned EACCES after retries. Dependency audit status is unknown. |
| Support isolated API/MariaDB/browser E2E | PASS in phase 02; evidence in reports/final-debug-rula-tickets.md. |
| RULA live provider E2E | BLOCKED, upstream HTTP 401; no result persisted. |
| Playwright, WebKit, native Safari/iOS | NOT RUN; Playwright dependency is absent from the current frontend package baseline, and no WebKit/native Safari runtime was available. |

## Browser and visual acceptance

The saved Edge 155/Chromium CDP fixture sweep covers 22 route surfaces, 44 route checks, 82 screen states and widths 320, 360, 390, 768, 1024, 1280 and 1440 px. It exercised Persian RTL/blue theme, English LTR/light theme, responsive login, sidebar, RULA/FMEA views, support and quota surfaces against synthetic fixture data. It reported no whole-page overflow and no collected browser runtime errors. Screenshots and sanitized interaction records are under reports/uiux-evidence/.

This is not authenticated production UAT. Real user/admin login flows, live provider results, WebKit/Safari/iOS, full keyboard/accessibility audit, print/export interaction and current public release visual parity remain unverified.

## Backup, rollback and deployment

- Pre-edit backup: C:\ProgramData\NIVASafe\backups\debug-phase02-20261016T133843Z.
- Backup manifest records a 2,404,630-byte working-tree patch, 35 uploads / 20,890,437 bytes, and a 2,553,589-byte SQL dump with 38 CREATE TABLE statements. The dump SHA-256 is 16940E05101B9312D9D73DBDB68E638CC995B446BF1929D3539B19B9AFB614FB. Manifest field databaseRestoreVerification remains pending.
- Protected configuration and upload directories could not be enumerated under the current sandbox account. No secret value was read.
- No mysql/mariadb client or Docker CLI was available for an isolated dump restore, so backup restore is NOT RUN.
- Previous release directory: C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update. Live frontend root: C:\inetpub\nivasafe\app-com. The release directory exists, but the exact active process command line and production environment are not accessible to this execution identity.
- No cutover, service restart, migration, production database write or rollback was executed. Candidate artifacts remain in the isolated temporary workspace.

## Security and handoff

Covered security boundaries remain enforced in code tests: authentication, selected tenant, role, image consent, quota, signature validation, provider approval, support ownership, internal-note privacy and protected administrator policy. There was no key exposure or real user image transmission in this phase. Dependency audit and restore verification remain incomplete; this report does not certify the whole system as security-audited or production-ready.

Debug plugin callable tools were not available in this session. The actual API, source, isolated test database, unit suites and existing Chromium fixture evidence were used instead.

Required owner action: provision an authorized non-production credential and GPT-5-Mini image entitlement for the current ArvanCloud gateway; then rerun one synthetic RULA request through save/reopen/report while retaining all privacy/authorization gates. After that acceptance, repeat the public cutover only from an authorized release context with verified rollback access.

## Final status

RULA live acceptance: BLOCKED. Support staging acceptance: PASS; production acceptance: NOT RUN. Chat and FMEA live provider acceptance: BLOCKED/NOT RUN. Build/typecheck/unit suites: PASS in isolation. Dependency audit, backup restore, WebKit and authenticated public UAT: NOT RUN. Deployment: NOT PERFORMED. Overall verdict: BLOCKED.


## Artifact fingerprints observed on 16 October 2026

The public static root still referenced the previous bundle: JS index-Oi8C_V4d.js, SHA-256 0A7DC090FA40F3333131629F0D71EAD62B01242834E7A982A5E062C9F12A1287; CSS index-dHBcyaJi.css, SHA-256 259CF6FFE851CDFDED77536B65DDC670E2423BAC1D7BEDA1259C088E5BC17B17; and the existing sidebar header CSS SHA-256 067C6A2258D9FBE2D145863090EB8F9DAC5A0F15C0C05529671E113FD0D20704. The static-root index.html SHA-256 is 9DF1EB4B221C2F375F94A95B63F2C21869886E0B001AA1A434B8154143BB842C; its content differs from source dist index.html, which has the same main JS/CSS references but no additional sidebar stylesheet. The current isolated candidate produced JS index-DfoYd8t8.js SHA-256 55F60A8F0AF85683CF34DCA329200CEA9265E9F974A665297F48AACAE36E8647 and CSS index-BYkR_3Tt.css SHA-256 53B8C769E1A8758E56E64206D755757E47A735B8C030C4E6BBB695988A81289D. The candidate hashes are recorded only for the isolated build and were not promoted.

Representative saved visual evidence from the earlier fixture-based UI phase: reports/uiux-evidence/dashboard-fa-blue-1440.png, reports/uiux-evidence/login-form-fa-blue-390.png, reports/uiux-evidence/rula-fa-blue-390.png, reports/uiux-evidence/fmea-fa-blue-390.png, reports/uiux-evidence/support-ticket-thread-fa-blue-390.png, and reports/uiux-evidence/admin-ai-quota-fa-blue-390.png. Sanitized browser records are reports/uiux-evidence/browser-acceptance.json and reports/uiux-evidence/uiux-route-sweep.json. These are Chromium fixture artifacts; no Playwright trace or Safari capture exists.

## Execution timestamps and exact invocations

Times below use America/Los_Angeles (PDT, UTC−07:00) on 2026-10-16. Validation log files are under reports/evidence/phase03-final-validation-20261016/.

| Local time | Invocation / event | Result |
|---|---|---|
| 06:38:43 | Timestamped pre-edit backup manifest created; database dump completed at 06:39:12 | Source patch and database dump recorded; database restore remained pending. |
| 08:13:41 | pnpm audit --prod | Exit 1; registry advisory requests returned EACCES. |
| 08:30:58–08:31:09 | pnpm build; pnpm test; pnpm lint; pnpm typecheck; pnpm verify:contract; pnpm verify:release | Each exit 1 before script execution with ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY. Individual logs carry each command. |
| 08:40:46 start / 08:41:45 completion | From backend in isolated copy: .\node_modules\.bin\vitest.cmd run --configLoader runner --maxWorkers=2 | Exit 0; 60 files / 403 tests. |
| 08:42:04 start / 08:42:06 completion | From shared/domain: .\node_modules\.bin\vitest.cmd run | Exit 0; 1 file / 12 tests. |
| 08:43:57–08:45:02 | Domain/backend TypeScript no-emit checks and domain/backend builds | Exit 0; exact package commands are logged under the corresponding *-final.log files. |
| 08:52:46 | node scripts/check-api-contract.mjs; node scripts/verify-release.mjs; git diff --check; local API health | Exit 0; contract 90/154, 29 release checks, diff check clean apart from line-ending warnings; health HTTP 200 / MySQL up. |
| 08:53:39 completion | From frontend in isolated copy: .\node_modules\.bin\vite.cmd build --configLoader runner --outDir dist | Exit 0; current root frontend/src synchronized; existing 554.83 kB entry-chunk warning. |
| 08:53:43 start / 08:54:02 completion | From frontend in isolated copy: .\node_modules\.bin\vitest.cmd run src --configLoader runner | Exit 0; 50 files / 322 tests. |
| 08:54:52 | From frontend in isolated copy: .\node_modules\.bin\tsc.cmd -b --noEmit | Exit 0. |
| 08:55:43 | From frontend in isolated copy: .\node_modules\.bin\tsc.cmd -b --pretty false | Exit 0. |

The phase 02 RULA provider and support staging records retain the date and sanitized request correlation ID but not the exact wall-clock time of those external/database E2E requests; no time is inferred here. The local-health endpoint checked was http://127.0.0.1:5044/api/v1/health. The only public browser URL loaded was https://app.nivasafe.com/login, without authentication. Public health and authenticated production endpoints were not verified.

The application source requests DeepSeek-V4-Flash for chat via CHAT_AI_MODEL, while runtime provider selection is controlled separately by AI_CHAT_PROVIDER. Because the protected runtime environment could not be inspected and no successful chat request was made, the effective chat provider and model compatibility are unverified. For RULA, the synthetic request used the ArvanCloud gateway and requested GPT-5-Mini; the gateway rejected authorization before a model result, so vision/structured-output compatibility was not established.

## Exact package-level commands

| Working directory | Command | Exit | Evidence |
|---|---|---:|---|
| shared/domain | .\node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit | 0 | domain-typecheck-final.log |
| shared/domain | .\node_modules\.bin\tsc.cmd -p tsconfig.json | 0 | domain-build-final.log |
| shared/domain | .\node_modules\.bin\vitest.cmd run | 0 | domain-test-final.log |
| backend | .\node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit | 0 | backend-typecheck-final.log |
| backend | .\node_modules\.bin\tsc.cmd -p tsconfig.json | 0 | backend-build-final.log |
| backend | .\node_modules\.bin\vitest.cmd run --configLoader runner --maxWorkers=2 | 0 | backend-test-final.log |
| frontend | .\node_modules\.bin\tsc.cmd -b --noEmit | 0 | frontend-typecheck-synced.log |
| frontend | .\node_modules\.bin\tsc.cmd -b --pretty false | 0 | frontend-build-tsc-synced.log |
| frontend | .\node_modules\.bin\vite.cmd build --configLoader runner --outDir dist | 0 | frontend-build-synced.log |
| frontend | .\node_modules\.bin\vitest.cmd run src --configLoader runner | 0 | frontend-test-synced.log |
| repository root | node scripts/check-api-contract.mjs | 0 | contract-final-verified.log |
| repository root | node scripts/verify-release.mjs | 0 | release-final-verified.log |
| repository root | git diff --check | 0 | git-diff-check-final.log; line-ending conversion warnings only |
| repository root | pnpm lint, pnpm typecheck, pnpm build, pnpm test, pnpm verify:contract, pnpm verify:release | 1 each before script execution | corresponding *-final.log files; pnpm module-directory preflight failure |
| isolated validation context | pnpm audit --prod | 1 | pnpm-audit-prod.log; registry returned EACCES |

## Final consistency checkpoint

| Local time (PDT) | Check | Result |
|---|---|---|
| 09:03:20 | Final report/state checks; `node scripts/check-api-contract.mjs`; `node scripts/verify-release.mjs`; `git diff --check`; local health and active static-root hashes | All commands exit 0; contract 90/154, release 29 checks, API healthy/MySQL up, active hashes unchanged; report secret-pattern scan found no match. |
