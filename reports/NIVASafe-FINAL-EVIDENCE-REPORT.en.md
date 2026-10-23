# NIVASafe Final Evidence Audit

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Independent engineering evidence audit |
| Language | English |
| Gregorian date | 2026-10-16 |
| Jalali date | 1405/07/24 |
| Repository revision inspected | C:\NIVASafe, branch main, HEAD e5bf3f050bd6e127e13918c8d3eefcd3f8376acf |
| Verdict | NOT READY — live RULA acceptance and deployed-version proof are missing |

## 1. Executive verdict

The source and isolated validation contain meaningful UI and support-ticket work. The isolated support journey passed against MariaDB and a Chromium browser. One bounded synthetic RULA image request passed the staged application gates and reached the reported ArvanCloud chat-completions gateway, but the gateway returned HTTP 401. The API returned sanitized HTTP 503 RULA_IMAGE_AI_UNAVAILABLE, and no score was saved. No successful RULA provider result, saved-result reload, real chat response, authenticated production journey, or release cutover was verified.

No production deployment, service restart, migration, or production database write occurred in recorded phases 01–03 or this audit. Evidence came from source files, phase reports, stored validation logs and browser evidence, plus read-only local runtime checks. Isolated results are not production passes.

## 2. Running system and deployment evidence

| Item | Evidence and limitation |
|---|---|
| Source repository | C:\NIVASafe; main at e5bf3f050bd6e127e13918c8d3eefcd3f8376acf. Git status had 384 modified/untracked entries at the start of this audit and 392 after its eight new reports. Earlier phase checkpoints recorded 375 and 378. Hundreds of non-report changes predate or cannot be attributed to phases 01–03. |
| Current operator | Restricted identity srv9298144857\codexsandboxoffline. Protected process command lines, scheduler details, runtime configuration and environment files were not readable. No secret value was viewed. |
| Local API | GET http://127.0.0.1:5044/api/v1/health returned HTTP 200: status healthy, database up, engine mysql, ai optional-fallback-ready, version 0.1.0. Health does not identify source revision, effective provider or successful provider access. |
| Recorded hosting snapshot | The phase-03 read-only record observed Node PID 832 on 127.0.0.1:5044, Nginx PID 6244 on ports 80/443, and MySQL PID 4456 on 3306; NIVASafeMariaDB was Running/Automatic. A fresh listener enumeration under this restricted audit returned no rows, so those PIDs are historical observations, not asserted as current. Static files are at C:\inetpub\nivasafe\app-com. The exact reverse-proxy/IIS/PM2 service configuration and process command lines were not independently verified. |
| Database environments | Active local health reports MySQL up; active database path/schema and effective connection configuration were not inspected. Isolated ticket E2E used MariaDB staging; the final QA workspace is C:\Users\Administrator\AppData\Local\Temp\NIVASafe-debug-phase02-20261016-070300. A disposable static schema load reportedly created 37 tables. Its storage path/schema name is not retained in the sanitized evidence. |
| Static deployment | C:\inetpub\nivasafe\app-com. index.html SHA-256 9DF1EB4B221C2F375F94A95B63F2C21869886E0B001AA1A434B8154143BB842C, last write 2026-10-16 08:34:34 PDT. It references JS index-Oi8C_V4d.js (SHA-256 0A7DC090FA40F3333131629F0D71EAD62B01242834E7A982A5E062C9F12A1287; Oct 15 04:34:57 PDT) and CSS index-dHBcyaJi.css (SHA-256 259CF6FFE851CDFDED77536B65DDC670E2423BAC1D7BEDA1259C088E5BC17B17; Oct 15 04:34:57 PDT), plus an additional sidebar stylesheet. |
| Isolated candidate | C:\Users\Administrator\AppData\Local\Temp\NIVASafe-debug-phase02-20261016-070300\frontend\dist. Candidate JS index-DfoYd8t8.js SHA-256 55F60A8F0AF85683CF34DCA329200CEA9265E9F974A665297F48AACAE36E8647 and CSS index-BYkR_3Tt.css SHA-256 53B8C769E1A8758E56E64206D755757E47A735B8C030C4E6BBB695988A81289D, built Oct 16 08:53:39 PDT. These hashes differ from deployed assets; candidate files were not copied to the live web root. |
| Public host | Earlier browser evidence loaded https://app.nivasafe.com/login anonymously. No authenticated member/admin session or public health endpoint is counted as verified here. |
| Backend build identity | Local health version was 0.1.0. API process path/command line and exact source build could not be inspected; backend deployment freshness is unknown. |
| Release and rollback | C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update exists. Backup C:\ProgramData\NIVASafe\backups\debug-phase02-20261016T133843Z exists; its manifest records database restore verification as pending. No rollback or cutover occurred. |

Different static hashes prove the latest candidate is not the currently served frontend. Since service command lines and backend build metadata were inaccessible, no matching proof exists that the running backend includes source fixes. Phase reports say the changes were not deployed.

## 3. Attribution and change history

Attribution follows contemporaneous phase reports. It does not mean every current Git change belongs to a named phase. The working tree was already heavily modified, with no pristine historical checkpoint for whole-tree author attribution.

### Prompt 01 — UI/UX

- frontend/src/features/support/SupportPage.tsx — retain visible support-thread content while refreshing.
- frontend/src/features/admin/AdminPanelPage.tsx and frontend/src/i18n.tsx — accessible localized quota-update status announcements.
- frontend/tests/e2e/fixtures.ts, frontend/tests/e2e/testData.ts, frontend/tests/e2e/interaction.spec.ts and frontend/tests/e2e/touch-targets.spec.ts — synthetic support/quota/inbox fixtures and responsive selectors.
- frontend/src/styles/foundations.css — RULA detected-posture label contrast tokens.
- frontend/src/components/enterprisePresentation.test.tsx — focused regression assertion.
- reports/uiux-evidence/ — synthetic screenshots and sanitized browser records.

The phase report says compact RULA/FMEA views, RTL/LTR, responsive login, themes and navigation existed before this phase and were preserved. No route, page or sidebar item was added or removed.

### Prompt 02 — RULA and support

- backend/src/modules/support.ts — narrow organization-scoped fallback for a database-confirmed protected system administrator when optional support allowlists are absent.
- backend/src/support.test.ts — authorization, privacy, support lifecycle and isolation regressions.
- frontend/vite.config.ts — environment/config-loader behavior, also changed in phase 03.
- project-state.json and prior reports.

No production role, provider secret, privacy approval, database or active runtime configuration was changed.

### Prompt 03 — final QA

- frontend/package.json
- frontend/vite.config.ts
- backend/package.json
- backend/vitest.config.ts
- scripts/verify-release.mjs

The phase report describes the Vite runner config-loader workaround, avoidance of protected local env-file scanning in production/test/CI, backend test-worker limit, and verifier assertions. No migration, service, production configuration or database change was made.

### Pre-existing or uncertain changes

- 384 modified/untracked entries at audit start and 392 after adding these eight reports, versus earlier phase checkpoints of 375 and 378.
- Current package diffs include Fastify/Nodemailer version edits and removal of frontend @playwright/test and test:e2e scripts, while Playwright config and E2E sources remain. Phase 03 recorded these as pre-existing; exact original author cannot be independently established.
- Other source, docs, migration, test and snapshot contents are not attributable from current Git evidence. Preserve them; do not overwrite from the Oct 15 ZIP.
- Current database migration history could not be safely inspected. Disposable migration replay failed as described below.

## 4. A — Real RULA posture-image analysis

### Flow proven

The isolated trace reports that one synthetic PNG, frontend/test-fixtures/rula-ai-synthetic.png, passed application authentication, organization/role, quota, per-image consent, MIME/signature validation and provider capability gates before the gateway call. The source route is POST /api/v1/rula/posture-image-analysis in backend/src/modules/assessments.ts, rate-limited to eight requests per minute. Privacy and vision approval keys are RULA_IMAGE_PRIVACY_APPROVED_PROVIDER and RULA_IMAGE_VISION_SUPPORTED_PROVIDER.

The request reached the reported ArvanCloud-compatible /v1/chat/completions gateway and received upstream HTTP 401. The application returned HTTP 503 RULA_IMAGE_AI_UNAVAILABLE with retryable=false. Sanitized correlation/request ID: b8e12c19-f17b-4c7a-9cdd-875209157873. No posture score or assessment result was persisted. This proves one authorized synthetic request reached a provider boundary; it does not prove acceptance of GPT-5-Mini, vision, structured output, or any successful response.

### Flow not proven

- Browser upload by a real authenticated regular user on the deployed site.
- Successful provider output, parsed anatomical observations, accepted angle/quality flags, or score mapping.
- Separate successful RIGHT, LEFT and BOTH analyses; multi-image isolation; manual review; saved result; reload and report.
- Provider timeout, retry/idempotency and interrupted-network recovery as a real external E2E.
- Independent ergonomist review of score accuracy.

No fallback score was generated. Any future output remains an AI suggestion requiring qualified human review. No real user or patient image was transmitted.

### Negative checks

Recorded isolated API checks returned unauthenticated 401, missing consent 403, read-only viewer 403, and invalid image signature 415. These are API/security checks, not a successful posture evaluation. Effective production privacy gate values were not readable in this audit; phase 02 reports approval was not enabled, but that runtime assertion could not be independently re-read.

**Overall RULA status: BLOCKED / NOT VERIFIED.** Image → real provider → parse → persist → reload → report did not pass.

## 5. B — FMEA, models, chat and quota

| Flow | Current result |
|---|---|
| FMEA UI and report | Existing views and synthetic mobile risk-details dialog were exercised. No authenticated live tenant assessment/provider E2E or provider-backed FMEA image analysis was performed. Search/action create-edit-complete and print/export were not fully exercised. |
| Assessment model | Source constant is GPT-5-Mini; risk selection is independently configured in backend/src/ai-provider.ts. Staging image call to the reported ArvanCloud-compatible gateway failed 401 before an accepted response. No successful assessment text/vision response was proved. |
| Chat model | Source constant is DeepSeek-V4-Flash. No successful app-level chat response with configured runtime credentials was obtained. |
| Token/quota | Synthetic admin fixture changed 1,000,000 to 1,250,000. Code tests cover usage/accounting and authorization. No successful provider transaction proved runtime token accounting. |

Official model documentation was checked on 2026-10-16:

- OpenAI lists canonical ID gpt-5-mini, image input, Chat Completions and structured outputs, but its model page labels GPT-5 Mini “Deprecated”. The deprecations page schedules snapshot gpt-5-mini-2025-08-07 for removal on Dec 11, 2026 and recommends gpt-5.6-terra. This is a lifecycle warning, not evidence that Arvan accepts the model. Sources: [GPT-5 Mini model](https://developers.openai.com/api/docs/models/gpt-5-mini), [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations).
- DeepSeek's canonical current Flash ID is deepseek-flash. Its Sep 10, 2026 release says the old lowercase alias deepseek-v4-flash is temporarily routed to V4.1-Flash; its vision guide documents multimodal inputs for deepseek-flash. Sources: [DeepSeek change log](https://api-docs.deepseek.com/updates/?release=deepseek-coder), [DeepSeek vision guide](https://api-docs.deepseek.com/guides/vision/).
- Application config uses mixed-case GPT-5-Mini and DeepSeek-V4-Flash. No live model-catalog probe authenticated against the actual gateway was verified. Upstream docs do not prove proxy/gateway support or casing behavior.

## 6. C — Support tickets and super-admin

The isolated phase 02 API + MariaDB + browser run is recorded as successful:

- Member create: 201; identical idempotency replay: 200; conflicting key reuse: 409.
- Member and operator public replies: 201; administrative status/priority/assignment update: 200.
- Data remained on GET/reload; three reply notifications were created.
- Internal notes were not returned to the member.
- Cross-organization lookup returned 404; unauthenticated request returned 401.
- An unlisted administrator remained denied under an empty allowlist policy; a database-confirmed protected administrator could access the selected organization's inbox.

Reported cause: the prior policy returned 503 when SUPPORT_OPERATOR_USER_IDS and SUPPORT_OPERATOR_ORGANIZATION_IDS were absent. The source correction is in backend/src/modules/support.ts and tests in backend/src/support.test.ts. This is staging evidence only. The fix was not deployed; current PM2 config and account designation were not independently readable. Notification record creation, not external delivery, was observed. Expired-subscription behavior was not proven.

**Ticket status: PASS in isolated staging; production acceptance BLOCKED.**

## 7. D — UI/UX and browser evidence

Edge 155 Chromium/CDP used synthetic local fixtures, not authenticated production sessions.

| Surface | Recorded coverage |
|---|---|
| Dashboard, RULA list, FMEA list | Persian RTL blue theme at 320, 360, 390, 768, 1024, 1280, 1440 px; no whole-page overflow in checked states. |
| 22 route surfaces | 44 route loads at 390 and 1280 px; app shell loaded without timeout/whole-page overflow. Fixture records included member/admin roles, not real sessions. |
| Login and registration | Persian RTL at 320, 360 and 390 px; no page overflow. |
| RULA/FMEA details and reports | Screens at mobile 390 px and desktop 1280/1440 px. Synthetic LEFT manual score changed and was returned by fixture GET; RIGHT stayed unchanged. FMEA dialog rendered S/O/D/RPN. Fixture state is not DB persistence. |
| Support/quota/admin | Synthetic support-reply and quota flows; fixture quota changed 1,000,000 → 1,250,000. English admin/support at 1280 px; Persian support/quota at 390 px. |
| Navigation/theme | Desktop sidebar collapse to 76 px persisted across navigation/reload; mobile modal drawer closed through button/backdrop. Blue → white theme choice persisted. |
| Browser errors | No browser console/page errors captured in the exercised fixture run. |

Evidence files: reports/uiux-evidence/browser-acceptance.json, reports/uiux-evidence/uiux-route-sweep.json, dashboard-fa-blue-1440.png, login-form-fa-blue-390.png, rula-fa-blue-390.png, fmea-fa-blue-390.png, fmea-risk-details-fa-blue-390.png, rula-left-manual-score-saved-fa-blue-390.png, admin-ai-quota-fa-blue-390.png, support-ticket-thread-fa-blue-390.png.

This is not a complete viewport × locale × theme matrix: Persian blue and English white were sampled, not every combination. “Blue” and “white” are recorded theme identifiers; full dark-mode acceptance is not evidenced. WebKit, Safari, iOS Safari, full keyboard/WCAG audit, print/export, live role login and production console/network parity were NOT RUN. @playwright/test is absent from the current frontend dependency baseline and registry access failed, so Playwright specs were not executed. No Debug or UI UX Designer native plugin tools were callable.

No sidebar route/menu additions or deletions are attributed to prompt 01; its report states navigation was preserved.

## 8. E — Validation, security, database and release

### Isolated final validation

Direct build/test commands used C:\Users\Administrator\AppData\Local\Temp\NIVASafe-debug-phase02-20261016-070300. Root package-manager outcomes are separate.

| Command/check | Result |
|---|---|
| node --version | v24.19.0, exit 0 |
| pnpm --version | 11.25.0, exit 0; root manifest pins pnpm@10.13.1 |
| Domain typecheck: node node_modules/typescript/bin/tsc -p tsconfig.json --pretty false --noEmit; build: node node_modules/typescript/bin/tsc -p tsconfig.json | PASS, exit 0 |
| Backend typecheck: node node_modules/typescript/bin/tsc -p tsconfig.json --pretty false --noEmit; build: node node_modules/typescript/bin/tsc -p tsconfig.json | PASS, exit 0 |
| Frontend typecheck: node node_modules/typescript/bin/tsc -b --pretty false --noEmit; TypeScript build: node node_modules/typescript/bin/tsc -b | PASS, exit 0 |
| Frontend Vite production build: pnpm build with --configLoader runner and CI=true VITE_API_URL=/api/v1 in the phase-02 isolated run; final candidate build also passed | PASS, exit 0; 554.83 kB minified entry-chunk warning |
| Domain Vitest: pnpm test in the phase-02 isolated run; final direct workspace run | PASS, 1 file / 12 tests, exit 0 |
| Backend Vitest: pnpm test in phase 02; final node node_modules/vitest/vitest.mjs run --configLoader runner --maxWorkers=2 | PASS, 60 files / 403 tests, exit 0 |
| Frontend Vitest: pnpm test in phase 02; final node node_modules/vitest/vitest.mjs run src --configLoader runner | PASS, 50 files / 322 tests, exit 0 |
| node scripts/check-api-contract.mjs | PASS, 90 frontend API paths / 154 backend routes, exit 0 |
| node scripts/verify-release.mjs | PASS, 29 checks, exit 0 |
| git diff --check | PASS, exit 0; line-ending conversion warnings recorded |
| Root commands: pnpm lint; pnpm typecheck; pnpm build; pnpm test; pnpm verify:contract; pnpm verify:release | Each exited 1 before script execution: pnpm 11.25.0 preflight reported ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY while reconciling the existing modules directory. |
| pnpm audit --prod | FAIL / unavailable, exit 1; registry advisory endpoint returned EACCES after retries. No dependency audit conclusion. |
| node scripts/phase02-api-e2e.mjs | BLOCKED, exit 1 at provider HTTP 401; no RULA score persisted. |
| node scripts/phase02-support-e2e-run.mjs | PASS, exit 0 in isolated API + MariaDB staging according to phase report; exact sanitized raw command log was not retained. |
| Disposable migration replay | BLOCKED after eight migrations: MySQL 1060 duplicate globalRole; three historical source checksums differed. No live migration ran. |
| WebKit/Safari/iOS and Playwright | NOT RUN. |

Logs: reports/evidence/phase03-final-validation-20261016/. Phase 02: reports/final-debug-rula-tickets.md. UI: reports/uiux-evidence/. Earlier 733/733 and 28 release checks are historical phase-02 evidence. Later isolated validation recorded 737 tests and 29 release checks; neither proves deployment.

### EPERM

The earlier error was “Cannot read directory ../../../../..: Access is denied” while Vite/esbuild config loading scanned a protected ancestor under C:\Users\Administrator, alongside access denial around C:\NIVASafe\.env. The recorded workaround uses the runner config loader and avoids local env-file scanning in production/test/CI. Direct isolated builds/tests passed. The active root pnpm wrapper still failed its modules-directory preflight under pnpm 11.25.0; the issue is not proven fixed for the active runtime. No ACL, Defender, antivirus, running service or production node_modules changes were made.

### Database and backup

A disposable static schema load reportedly created 37 MariaDB tables. Migration replay stopped on duplicate globalRole after eight migrations; three historical checksums differ. Current production schema history was not modified.

Backup manifest C:\ProgramData\NIVASafe\backups\debug-phase02-20261016T133843Z\backup-manifest.json records a 2,404,630-byte working-tree patch, 35 uploads (20,890,437 bytes), and SQL dump C:\ProgramData\NIVASafe\backups\debug-phase02-20261016T133843Z\database\nivasafe-2026-10-16T13-39-10-860Z.sql (2,553,589 bytes, 38 CREATE TABLE statements). Dump SHA-256: 16940E05101B9312D9D73DBDB68E638CC995B446BF1929D3539B19B9AFB614FB. Restore verification is pending because no permitted disposable restore client/container was available. Protected config/upload directories were not independently enumerated in this audit.

### Security observations

Observed safeguards include authenticated RULA route, route-level rate limit, per-image consent/provider approval checks, fail-closed no-score-on-provider-error behavior, tenant-scoped support access, internal-note separation and negative API checks. Automated security-relevant tests passed in the isolated 737-test suite. Dependency audit was not completed, live authorization/account scopes were not tested, and effective production provider/support configuration could not be read. This is not a complete security certification.

## 9. Plugin usage, timeline and handoff

- Current callable-tool inventory found no Debug or UI UX Designer native tools. Neither plugin is claimed as executed.
- Tools evidenced: PowerShell/Git/Node/repository inspection; isolated package tests/builds; prior Edge 155 Chromium CDP fixture evidence; local HTTP health probe; official upstream model documentation lookup.
- Timeline (PDT, Oct 16 2026): UI phase report 06:28; phase 02 report 08:06; candidate assets 08:53; technical report 09:03; this audit followed those records. Static deployment index timestamp 08:34, while referenced JS/CSS were last written Oct 15.
- Handoff: keep production image gates intact; provision a non-production credential entitled for image input and structured output; verify actual gateway/model ID; prove synthetic RULA save/reload/report. Separately verify staging support configuration and run member/admin browser acceptance against the exact candidate. Reconcile migration history and verify a disposable backup restore before release. No exact service restart/cutover command is supplied because the service manager and protected runtime command lines were not inspectable.

