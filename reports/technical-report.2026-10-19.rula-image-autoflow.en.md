# RULA image workflow and controlled code-only release — technical report

| Project | NIVASafe |
|---|---|
| Gregorian | 2026-10-19 |
| Jalali | 1405-07-27 |
| Release | release-rula-image-autoflow-20261019-01-r2 |
| Revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf (dirty tree preserved) |
| Status | DEPLOYED CODE ONLY / LIVE IMAGE DISABLED |

## Findings and implementation

The actual public failures at17:08:49/17:08:53 were blocked before ArvanCloud: RULA_IMAGE_AI_UNAVAILABLE, privacy-approval-missing. Both effective production RULA provider gates were empty. This is not evidence of bad credentials, HTTP401 or missing vision entitlement. Platform gates already were global; a new protected discovery endpoint and typed preflight make that state explicit without a per-org allowlist.

The large checkbox and global manual banner were intentionally replaced with informed choose/send consent and a per-image review dialog. Consent begins false and is not restored from registration/session/drafts. Existing deterministic scoring/review component moved intact; hidden force/muscle-use fields retain form values while closed. Nested modal focus now lets the inner editor own Escape/Tab. Existing current/history records, provenance and mandatory uncertain-side review remain.

One60s provider timeout and two length-limited replies were observed. A RED regression proved the request used3000 single/5000 BOTH tokens; r2 reserves the existing8000 completion ceiling, with existing quota reservation. Staging alone used the already-supported120s image timeout. No reasoning_effort/model/score-rule substitution. One complete-looking r2 reply still failed with IMAGE_ANALYSIS_INTERNAL_ERROR; exact cause UNKNOWN. The subsequent actual r2 RIGHT and independent browser BOTH/save/PDF passed. This demonstrates a usable final-candidate path, not proof that every intermittent rejection is fixed.

## Acceptance

| State | Verdict | Evidence |
|---|---|---|
| Source/UI/platform policy | PASS | scoped tests, no per-org configuration |
| Current r2 real ordinary-user image workflow | PASS | organization B RIGHT; organization A browser independent BOTH,14 manual edits, fresh save/relogin/report/PDF |
| Full current-r2 all-side matrix in both orgs | PARTIAL | budget consumed; earlier r1 single-side runs supplementary |
| Two-org current-r2 manual BOTH/persistence/browser | PASS | actual API/MariaDB,fa390/en1280, tenant/file denial and rollback |
| Accuracy certification | NOT VALIDATED | one frozen synthetic two-person drawing; no independent posture benchmark claimed |
| Code actually published | DEPLOYED | PID/hash/marker and public byte/health checks |
| Live image feature | BLOCKED | privacy/vision gates closed; platform authorization unverified |

## Exact artifacts

- Backend: C:\ProgramData\NIVASafe\releases\release-rula-image-autoflow-20261019-01-r2\backend\dist\server.js; PID2840; NT AUTHORITY\SYSTEM; Windows task NIVASafe-API -> run-pm2.cmd -> PM2 nivasafe-api.
- Compiled assessment module: 5babe27e22bf6b4c19816863a76752270da7f972570e35b732b0688d2667c604; entrypoint: e7a26489e1dd96e1c7e9d8c25715c2691e4e6ba590347f088c37961b10be5cb0. One of132 compiled files changed; the entrypoint wrapper hash intentionally remains unchanged.
- Frontend root: C:/inetpub/nivasafe/app-com; index SHA256: 9eecdbd112300ab9b02ea0c907644f1477ec6dda9bceab7fc7dd2ee9707c7d8b; new main bundle/assets: /assets/index-ByY3fVok.js, /assets/index-DZYeO3D8.css. Public byte equality and version/database health verified.
- Schema SHA256: eb872b071bc7807cf22b01932d1df3ec0fd854ca26da60a478e8347a1915fa33; same deployed/candidate schema;124 production columns checked read-only. Disposable schema-only dump restored on MariaDB53306 with matching columns/types/nullability and empty initial tables; not a clean historical migration replay.
- Staging datadir: 53306	C:/NIVASafe/.local/rula-authenticated-e2e-20261017-01/mariadb/data/; independent DB/uploads/JWT secrets; no production DB/provider photographs used.

## Changed application files

- frontend/src/components/useModalFocus.ts
- frontend/src/features/assessments/AssessmentPages.tsx
- frontend/src/i18n.tsx
- frontend/src/styles/assessments.css
- backend/src/modules/assessments.ts
- backend/src/rula-registered-member.test.ts
- frontend/src/features/assessments/rulaImageAnalysisPolicy.ts
- frontend/src/features/assessments/rulaImageAnalysisPolicy.test.ts
- frontend/src/features/assessments/RulaImageReviewDialog.tsx

Additional scoped artifacts: docs/rula-image-platform-access.md, scripts/releases/rula-image-autoflow-20261019-01/{prepare.mjs,release.mjs,backup-protected-config.ps1}, project-state.json, release-manifest.json, preservation manifest and these reports. No dependency, schema, historical migration, scoring table, AI model, FMEA business logic or support/chat implementation changed. The temporary unshipped organization-allowlist experiment was retired following the owner correction; no historical test was deleted.

## Real provider attempts

Endpoint: https://api.arvancloudai.ir/v1/chat/completions. Requested model is GPT-5-Mini for every call; reasoning_effort absent; no fallback model/provider. Returned snapshot is recorded only when actually provided and accepted. No claim is made about unrelated usage in the ArvanCloud account; no request-level usage export was supplied. Codex's model is independent of application requests.

| Attempt | Candidate | Kind | Upstream HTTP | Verified model | Finish | ms | Safe request reference |
|---|---|---|---|---|---|---|---|
| 1 | r1 | image | 200 | gpt-5-mini-2025-08-07 | stop | 19242 | 13ed0f8631930de9bf4d3c251f6b7210 |
| 2 | r1 | image | 200 | gpt-5-mini-2025-08-07 | stop | 43760 | b8c4f44dc9e36faeb22ea3446c1b8989 |
| 3 | r1 | image | TIMEOUT | UNVERIFIED | — | — | — |
| 4 | r1 | image | 200 | gpt-5-mini-2025-08-07 | stop | 45442 | 6bc5d066dae3c25f1a125434c3ca170d |
| 5 | r1 | image | 200 | gpt-5-mini-2025-08-07 | stop | 20684 | b5214b6c9ecba97cd818fc31ab50eedc |
| 6 | r1 | image | 200 | UNVERIFIED | length | 96329 | e44c7925ed3001f00659da634d475136 |
| 7 | r1 | image | 200 | UNVERIFIED | length | 113683 | edea61047abb280bc6942788304aa059 |
| 8 | r2 | image | 200 | UNVERIFIED | stop | 102084 | 9c03f976301cf19425c397bba76b45ba |
| 9 | r2 | image | 200 | gpt-5-mini-2025-08-07 | stop | 14072 | 08ac3690bc808cf21dc9f58fe570ef54 |
| 10 | r2 | image | 200 | gpt-5-mini-2025-08-07 | stop | 55185 | 777dbd43379b2ff53054870e058c19f7 |
| 11 | r2 | image | 200 | gpt-5-mini-2025-08-07 | stop | 35962 | 82b287c5969458cd0df7b356c5dc904a |
| 12 | r2 | text | 200 | gpt-5-mini-2025-08-07 | stop | 25084 | 52aee9f272736a89b9a5aabe55717daa |

Attempts1-7 are r1 supplementary evidence. Attempt8 is rejected r2 output with stop/content length4284 but unverified model; its exact internal rejection remains UNKNOWN. Attempt9 is accepted r2 organization-B RIGHT. Attempts10/11 are the final actual browser's independent RIGHT/LEFT requests for BOTH;12 is the real report-action text request. Exactly12 attempts were made, including failures; no local budget stop is mislabeled as an upstream429/503. The multipart calls[].side heuristic in final-both-browser.json is unreliable; authoritative response keys are RIGHT then LEFT and persisted side-specific values were asserted. See evidence-notes.json; original evidence retained.

## Executed validation

| Package | Command | Exit |
|---|---|---|
| backend | corepack pnpm run test | 0 |
| backend | corepack pnpm run typecheck | 0 |
| backend | corepack pnpm run lint | 0 |
| backend | corepack pnpm run build | 0 |
| frontend | corepack pnpm run test | 0 |
| frontend | corepack pnpm run typecheck | 0 |
| frontend | corepack pnpm run lint | 0 |
| frontend | corepack pnpm run build | 0 |
| shared/domain | corepack pnpm run test | 0 |
| shared/domain | corepack pnpm run typecheck | 0 |
| shared/domain | corepack pnpm run lint | 0 |
| shared/domain | corepack pnpm run build | 0 |

619 backend/68files,403 frontend/58files,19 domain/2files =1041 application tests;6 separate node:test rollback-guard tests. Pinned pnpm10.13.1. Focused tests are included in the totals, not added again. API91/155 and29 release checks exit0. Vite emitted the existing large-chunk warning; build succeeded. Frontend/domain sources and built index remained unchanged during the backend-only r2 rebuild; their earlier passing commands apply to the exact same frozen inputs.

Failed commands preserved: restricted Corepack cache EPERM (resolved using authorized host execution); initial Windows ESM observer path; ambiguous test-project selector; one old-artifact startup timeout (resolved by using the verified reconstructed copy and observing exact health identity); RED policy and completion-budget tests before implementation. Provider/real-E2E failures remain visible in staging-acceptance*.json and staging-failures.json. They are not reported as passing. No production reset/migration/ACL change was used to resolve them.

## Recovery and release

Backup: C:/ProgramData/NIVASafe/backups/release-rula-image-autoflow-20261019-01; backend16643files/783links and frontend495files, content/hash reconstruction verified; original protected env ACL retained. Old/new/old static rehearsal, separate-pipe named PM2 rehearsal, and actual previous/candidate/previous/candidate binaries with newer disposable RULA data passed.

Rollback command (only if current release still matches anchors):

```powershell
C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\rula-image-autoflow-20261019-01\release.mjs rollback
```

The helper refuses unrelated later backend/frontend/config/env drift, restores code/index/bootstrap config and preserves newer DB/uploads. No production rollback or DB restore was performed. Deployment used explicit deploy-code-only: it requires the closed-platform UI/DB/rollback gates and preserves production image gates; the separate full-vision deployment gate remains unsatisfied. Only the API restarted; worker configuration, protected env and user data were preserved.

## Security, preservation and remaining acceptance

GET policy requires active JWT/member, organization, create permission, subscription and AI access/quota; private/no-store. POST retains consent, MIME/signature/size, quota reservation, model/provider gates and server review enforcement. Actual negative401/403/415 checks and approval-tamper regression coverage remain. No raw worker photo, full provider response, credential, bearer token, cookie, personal account data, new external host or second pose model was logged/deployed. No dependency was added. Full dependency-advisory/penetration audits were not performed for this scoped release.

Public read-only checks: RULA390/1280 disclosure/provider/review warning; old checkbox/banner absent; dashboard/FMEA list/assistant/admin/support inbox accessible; console errors0, viewport restored, no overflow. Public ordinary-user writes, live image inference and production PDF generation are NOT_RUN because live image authorization is not established. Paid FMEA/chat completions and Safari/WebKit NOT_RUN.

Remaining: real platform contractual/privacy approval; effective PM2 gate configuration once after approval (empty process env overrides .env); complete final-r2 RIGHT/LEFT/BOTH matrix and bounded stability in both organizations; trace UNKNOWN rejected responses using their request references if they recur. Anatomical accuracy and ergonomist certification remain unvalidated and optimization paused. A successful HTTP response or manual synthetic correction is not clinical validation.

Stage status is recorded in final-acceptance.json: all twelve stages pass for this narrow code-only release; broader vision acceptance remains PARTIAL/BLOCKED. No whole-product completion claim.
