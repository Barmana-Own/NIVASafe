# NIVASafe — FMEA UI/session/AI reliability evidence

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Technical / English |
| Gregorian | 2026-10-19 |
| Jalali | 1405-07-27 |
| Frontend | release-fmea-report-recovery-20261019-01 |
| Backend | release-fmea-ai-reliability-20261019-01 |
| Repository base | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf + preserved dirty tree |
| Status | DEPLOYED — scoped update |

## Acceptance

| Check | Result | Evidence |
|---|---|---|
| Frontend tests/type/lint/build | PASS | 423 tests / 60 files; validation.frontend.json |
| Backend tests/type/lint/build | PASS | 625 tests / 69 files; validation.backend-domain.json |
| Domain tests/type/lint/build | PASS | 19 tests / 2 files; validation.backend-domain.json |
| Contract / release checks | PASS | 93 paths / 155 routes; 29 checks; ai-reliability/*.log |
| Component browser | PASS | 13 cases; mocked HTTP boundary, explicitly not E2E |
| Real staging UI | PASS | 8 cases, two organizations, fa/en, white/blue, 390/1280; same frontend |
| Two-tab expiry | PASS | Real refresh token, expired stage access token; 1 refresh, 0 protected 401 |
| Final backend real AI / DB / PDF | PASS | 48f272c8-1409-4bf9-914e-1b219ae8770d; 66271 PDF bytes |
| Public browser / AI | PASS / NOT_RUN_PUBLIC_OWNER_SYNTHETIC_ONLY | public-browser.json; ai-reliability/runtime-after.json |
| Native OS install / Safari | NOT_RUN | No installation performed; no WebKit runner |
| Production RULA image acceptance | BLOCKED | Existing privacy/provider gates remain closed; accuracy unvalidated |

## Root causes and evidence boundaries

1. **Layout:** a separate dots trigger, larger multiline heading and optional 5-to-8 expansion caused visual clutter. Intentional owner-requested removals affect only that trigger and suggestion expansion. Full text remains available through the accessible title; existing records and top-risk expansion remain intact.
2. **Session:** the old client sent expired access tokens in parallel and refreshed reactively; late 401 responses and cross-tab refresh rotation could reuse a revoked refresh token. Proactive bounded-expiry hints, in-tab singleflight, same-origin Web Locks, and latest-session checks fix the reproduced pattern. Logout, account replacement and workspace changes cannot resurrect or replay stale requests. JWT decoding is a hint only; server verification remains authoritative. Transient renewal errors do not erase valid sessions.
3. **PWA:** preventDefault suppressed native promotion without a later user prompt, causing an informational browser message. Native promotion is preserved; custom prompt remains gesture-only. The compiled-event contract passed; a real OS install was not attempted. Official references: [MDN event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event), [MDN prompt](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent/prompt).
4. **Historical AI:** request 1380c4c3-ea6f-407e-a34c-e3c9aa7c7617 at 17:34:38Z recorded fallback and no exception; exact cause UNKNOWN. A later pre-release request 1531d98b-34bd-47b7-bce7-7ccf884c445d succeeded with the approved Mini snapshot. No credential/entitlement claim follows from this history.
5. **Observed public deadline:** frontend-release smoke request 74b9cc65-9e5d-4d6a-a944-b1e08d54ff4b returned application HTTP 200/fallback after 60142.66ms under the live 60000ms provider limit. Upstream status/exception was not retained; timeout is strongly supported by timing, not retroactively proven from a missing error. A red test reproduced rejection of a legitimate 70-second completion; the new FMEA-specific 85-second/one-attempt policy passed both late-success and hard-stop tests. Structured JSON and five concise actions bound output; no reasoning_effort parameter, provider/model fallback, chat timeout or RULA policy changed. New safe reason/elapsed telemetry makes future failures attributable. Invalid/unmapped output is never marked connected; genuine consumed usage is still recorded.
6. **Harness rate limit:** eight intended AI-disabled UI cases exhausted the local 8/minute endpoint allowance. The ninth returned local 429 before any outbound fetch. This was not an upstream 429. Prior zero-call evidence is preserved; one final test ran in an unused isolated rate window without weakening limits.

## Executed commands

Node 22.22.3; Corepack pnpm 10.13.1. In each isolated frontend/backend/shared-domain package: corepack pnpm run test, typecheck, lint, build (12 exit-zero commands). Root: corepack pnpm run verify:contract and verify:release (exit 0). Targeted red/green: pnpm exec vitest run src/ai-provider.test.ts src/assessment-action-suggestions.test.ts; route regression: src/fmea-action-generation-route.test.ts. Exact commands/timestamps are in validation JSON and referenced logs.

## Test and harness corrections retained

Initial fixture/config omissions in the isolated copy, an obsolete show-more assertion, a test-only PDF route not matching the contract scanner, Windows ESM path syntax, static directory handling, and Vite HMR in a test harness were repaired; none was a production migration. PowerShell 7 was absent; installed Windows PowerShell executed the same checks. One preparation guard correctly stopped on compiled test-file differences: all six differences were .test.js files outside the production import graph. These historical compiled tests were preserved; every executable module matches the tested build. Existing backups were verified and reused without replacement. Earlier failed logs remain evidence, not passing checks.

## Runtime, release and rollback

Frontend index SHA256: add14c4523c8420ac0c72414dea0dcf331d2536453f5c6eb73d08575620f0cf6. Backend PID: 13644; entry: C:\ProgramData\NIVASafe\releases\release-fmea-ai-reliability-20261019-01\backend\dist\server.js; marker: release-fmea-ai-reliability-20261019-01. Executable changes: ai-provider.js, assessment-action-suggestions.js, modules/reports.js. Frontend and protected environment did not change during backend release. Boot configuration changed only the API entry and APP_VERSION; worker/service identity and other settings remain intact. Schema hash: eb872b071bc7807cf22b01932d1df3ec0fd854ca26da60a478e8347a1915fa33, unchanged. No live migration, database restore or production assessment mutation was performed by deployment. Public AI naturally records normal usage/audit entries.

Frontend backup/rehearsal restored 527 prior files by hash, retaining immutable assets. Backend/config backup: C:/ProgramData/NIVASafe/backups/release-fmea-ai-reliability-20261019-01. Original ACL was preserved on protected settings and rollback runtime state; no ACL was weakened. Isolated PM2 uses separate Windows named pipes and port 5156; actual old/new/old backend health and isolated DB were verified. Rollback commands: C:/Runtime/node/node.exe C:/NIVASafe/scripts/releases/fmea-ai-reliability-20261019-01/release.mjs rollback; frontend command C:/Runtime/node/node.exe C:/NIVASafe/scripts/releases/fmea-report-recovery-20261019-01/static-release.mjs rollback. Guards refuse unrelated active artifacts/config/secret drift. Backend rollback should precede frontend rollback. Neither restores user data.

## Provider calls and security

{"approvedModelsOnly":true,"stagingGenuineAttempts":2,"stagingSuccesses":2,"requestedModels":["GPT-5-Mini"],"effectiveModels":["gpt-5-mini-2025-08-07"],"stagingElapsedMs":[51011,54445],"publicBeforeFinalBackend":{"knownRequestAt1908":"connected; approved Mini snapshot","requestAt194626":"app200/fallback at60142.66ms; upstream status unknown"},"newPublicRequestBudget":1,"newPublicRequestState":"NOT_RUN: automatic review denied private-report transmission; owner selected synthetic-only. Existing genuine synthetic staging tests retained.","zeroBudgetDiagnosticsNotCountedAsProviderHttp":true,"noImageSubmitted":true,"newPublicRequestsExecuted":0,"publicAcceptance":"NOT_RUN_PRIVATE_DATA_RESTRICTED"}. Synthetic text only in new staging. No worker photo, API key, JWT, cookie, prompt body or full provider content was logged. Zero-budget diagnostic stops are local, not provider HTTP failures. Public usage attribution is limited to recorded NIVASafe request IDs; no claim about other consumers of the Arvan account.

RULA/FMEA remain ArvanCloud GPT-5-Mini; chat remains ArvanCloud DeepSeek-V4-Flash. Source/runtime routing and regression tests passed. Existing image privacy/vision gates remain closed. Historical RULA accuracy and qualified ergonomic acceptance remain outside this task. Final scoped adversarial review covered stale-session replay, cross-user/tenant replacement, revoked refresh, bounded lock/refresh operations, XSS-safe React text, fixed approved outbound model/gateway and safe logs. No new dependency, DB schema, consent or permission relaxation was introduced.

## Changed application files

- frontend/src/api/client.ts
- frontend/src/features/assessments/AssessmentPages.tsx
- frontend/src/features/assessments/FmeaSuggestedActionCard.tsx
- frontend/src/pwa/PwaManager.tsx
- frontend/src/styles/assessments.css
- frontend/src/ui-rules.test.ts
- frontend/src/api/client-session.test.ts
- frontend/src/api/sessionRefresh.test.ts
- frontend/src/api/sessionRefresh.ts
- backend/src/ai-provider.test.ts
- backend/src/ai-provider.ts
- backend/src/assessment-action-suggestions.test.ts
- backend/src/assessment-action-suggestions.ts
- backend/src/modules/reports.ts
- backend/src/fmea-action-generation-route.test.ts

## Scope stages

| Stage | Result | Evidence scope |
|---|---|---|
| 01 | PASS | Owner requirements reconciled with the existing report, session and PWA code; no RULA accuracy research restarted. |
| 02 | PASS | Existing typography/theme/RTL preserved; five compact cards, single-line title, accessible title-to-detail dialog. |
| 03 | PASS | Nine frontend source/test files changed; 423 tests and typecheck/lint/build passed. |
| 04 | PASS | Three executable backend modules changed for a bounded FMEA text profile, strict parsed-output status and safe failure telemetry. |
| 05 | PASS | Schema and persistence contracts unchanged; isolated MariaDB datadir/port checked; no production migration. |
| 06 | PASS | 93 frontend paths match 155 routes; release verifier 29 checks. Existing envelopes extended only by safe reason metadata. |
| 07 | PASS | Two ordinary staging organizations; anonymous 401 and cross-tenant 404. Two tabs renew once before protected calls; no protected 401. |
| 08 | PASS | Scoped security review: token/tenant/logout race tests, inert escaped text, bounded provider calls, no secrets or gate bypass. |
| 09 | PASS | 1067 tests: backend 625/69 files, frontend 423/60 files, domain 19/2 files. All 12 package commands exit 0. |
| 10 | PARTIAL | 13 API-boundary component cases; 8 real staging UI cases; new-backend real AI/save/GET/PDF; actual public desktop/mobile and console checks. |
| 11 | PASS | Static frontend and backend separately deployed; protected config backed up with ACL preserved; actual old/new/old backend rehearsal on isolated PM2/DB. |
| 12 | BLOCKED | Code integrity and deployed artifacts verified; public AI on the private report NOT_RUN by owner choice. Synthetic real-provider staging passed. No full-product acceptance claim. |

Whole-product PROJECT_STATUS remains incomplete for the independent RULA/privacy gates. PASS here is limited to this owner-requested FMEA UI/session/AI reliability update.

## Owner testing restriction and operational note

Automatic approval review rejected retrying the existing private production FMEA report because it would transmit its text to ArvanCloud. The owner selected synthetic-only testing. The blocked click did not execute, and no alternate route or indirect transmission was attempted. Genuine synthetic staging returned gpt-5-mini-2025-08-07; final private public-AI acceptance is NOT_RUN, not a provider failure. The public authenticated dashboard, notification summary and AI quota GETs all returned 200 after the backend update, with no new console warnings/errors. Active Nginx read/send timeouts are 120 seconds, compatible with the 85-second server and 90-second client deadlines; proxy settings were not changed. The isolated PM2 rehearsal emitted wmic ENOENT telemetry warnings; actual artifact switching, DB health and rollback passed. This warning is retained as a host monitoring limitation, not hidden as a clean telemetry result.
