# RULA Vision 401 Differential and Final-Candidate E2E Evidence

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Technical evidence |
| Language | English |
| Jalali date | 1405-07-26 |
| Gregorian date | 2026-10-18 |
| Repository | `C:\NIVASafe` |
| Branch / HEAD | `main` / `e5bf3f050bd6e127e13918c8d3eefcd3f8376acf` |
| Candidate marker | `rula-401-differential-candidate-20261018-01` |
| Release verdict | NOT DEPLOYED; staging API E2E passed, browser/live acceptance blocked |

## Executive finding

The historical HTTP 401 has **no confirmed root cause**. The old failed request lacks preserved provider response details, upstream request ID, runtime PID/build, and credential/configuration parity. In the current final candidate, the same in-memory ArvanCloud credential configuration was observed on text and vision requests, the gateway accepted direct text and image calls, and the authenticated application RULA route succeeded. This disproves neither a transient/rotated credential nor runtime drift in the earlier process; it does not establish an entitlement issue.

The candidate's `reasoning_effort` compatibility change addresses the previously documented gateway HTTP 400 behavior. It is present in the built candidate and focused tests pass. It is not evidence that the old 401 was caused by `reasoning_effort`, and no product source or runtime configuration was modified during this run.

## Candidate and environment identity

- Candidate backend: `C:\NIVASafe\.local\rula-final-candidate-20261017-053748\backend\dist\server.js`.
- Candidate marker: `rula-401-differential-candidate-20261018-01`.
- Candidate runtime API: `http://127.0.0.1:5153/api/v1`; disposable MariaDB on `127.0.0.1:53306`; isolated uploads under `.local`.
- The candidate runtime ran as `NT AUTHORITY\SYSTEM` through a temporary Task Scheduler wrapper; the API child PID observed was 4588. The candidate health response identified the marker and database as up.
- Current source in `backend/src/ai-provider.ts`, `backend/src/modules/assessments.ts`, and `backend/src/image-analysis-diagnostics.ts` matched the candidate source hashes below. Build outputs were regenerated for this candidate. The final candidate was therefore tested, not a previous adapter-only build.
- Source hashes: `ai-provider.ts` `C1CE98323108C7D0E9BC2233D11C9DCC338C58CCB2592227F9C63F784E88F5CC`; `assessments.ts` `19BE11CC90497BDB22B6AADBBCBFD615DB6D10F46AE70B2AB6D3382B662A370D`; `image-analysis-diagnostics.ts` `AD902DABBC964DC8A9E45BFCED8E1C5AA680AF7D041A55DB9C2C79821FD2F0CB`.
- Build hashes: `dist/server.js` `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0`; `dist/ai-provider.js` `30630A5F6BD2292F15F7E1883DE9FFA902855872F07129FF921BD56B699F6CF0`.
- Staging database was disposable, port 53306, with `prisma db push --skip-generate` to create candidate schema. This was not a clean migration replay; no production DB or upload path was used.
- Synthetic image: 23,063 bytes, SHA-256 `6167D8AB5B3C784AE6F4202357318C4BBF0A0C845DDA4A801978912233A4F2EA`; no personal image was used.
- Provider configuration was loaded into memory from protected runtime configuration. Reports and evidence retain only the base host/path, model, boolean credential-match observation, and request IDs; no key, key fingerprint, authorization value, cookie, or image bytes were logged.
- The repository had 438 pre-existing status entries at inspection. No tracked source or configuration files were edited in this run; no reset, clean, stash, migration, or production-data operation was run.

## Differential request evidence

| Path | Candidate/runtime | Request and model | Safe auth/config observation | Result |
|---|---|---|---|---|
| Direct text | Candidate marker above; SYSTEM staging process | `POST https://api.arvancloudai.ir/v1/chat/completions`; requested `GPT-5-Mini`, returned `gpt-5-mini-2025-08-07` | Authorization header present; observer matched the loaded credential object; secret value not recorded | HTTP 200, non-empty response; request ID `1fbc2466da35cc6364e1fcde9a9fc0d7` in successful BOTH run |
| Direct synthetic image adapter | Candidate marker above; SYSTEM staging process | Same host/path/model; image sent as synthetic PNG data URI; Arvan vision omitted `reasoning_effort` | Same credential object/config; no raw image or secret retained | HTTP 200; parser recognized seven body parts; direct probe request ID `06a6ae23c040c7dd3e845fecf7efe1b3` |
| Authenticated RULA route | Candidate marker above; staging member, consent and quota set | `POST /api/v1/rula/posture-image-analysis`, actual upload through the application API | Application authorization, tenant, consent, quota, signature, and MIME checks remained enabled | RIGHT/LEFT/BOTH each had successful HTTP 200 runs; BOTH upstream ID `289a268f74e2cda07362ec640f5da369` |

Gateway DNS, TCP 443, certificate validation, and TLS 1.3 succeeded from the SYSTEM candidate context. No proxy was configured in the tested process. The provider response server identified ArvanCloud. There is no evidence that the old 401 originated from a proxy/CDN rather than the gateway because old response headers/body were not retained.

The previous report records a historical app request ID `278fd697-c746-4f18-b205-a4d4449cce15`, but no upstream request ID, safe provider error code/body, or old runtime identity accompanies it. That missing evidence prevents distinguishing old key drift, endpoint/process drift, transient provider rejection, or another request-specific cause.

## Authenticated RULA E2E and persistence

Two separate E2E runs used the same candidate build and isolated disposable databases:

1. **RIGHT and LEFT run** at `C:\NIVASafe\.local\rula-401-differential-20261018\evidence-e2e-final-candidate\authenticated-rula-e2e.json`: authenticated ordinary `HSE_SPECIALIST` test user; RIGHT HTTP 200/model `gpt-5-mini-2025-08-07`, save 201, fresh login 200, reload 200, report JSON 200 and PDF 200; persisted score 4, version 3, one image. LEFT followed the same path; persisted score 5, version 3, one image. Both were in the disposable database. The overall JSON run is marked FAIL because its subsequent BOTH attempt returned API HTTP 502 `RULA_IMAGE_AI_INVALID_RESPONSE` (request ID `a41a4fcd-f7d2-461b-9b82-3c1c19e02dce`) after an upstream HTTP 200.
2. **BOTH run** at `C:\NIVASafe\.local\rula-401-differential-20261018-both\evidence-e2e-final-candidate\authenticated-rula-e2e.json`: BOTH API inference HTTP 200; returned separate LEFT and RIGHT observation objects, seven body-part rows each, five detected, two requiring review per side; save 201, image upload 201, link 200, review save 200, fresh-session login 200, reload 200, report JSON 200, PDF 200 (57,033 bytes). Persisted score 4, version 3, one image, review complete, and four rows initially required review. One usage record recorded 2,321 tokens against the isolated 1,000,000 limit.

The `IN_PROGRESS` value in the persistence evidence is the domain assessment lifecycle field; workflow assertions for review completion, reload, report and PDF passed. In the test harness, review-required rows were programmatically submitted as user-confirmed API data in the disposable test. This is not an independent human review. No qualified ergonomics specialist validated score accuracy.

Security negatives passed in the candidate API run: unauthenticated 401; cross-tenant 401; Viewer 403; missing consent 403 `RULA_IMAGE_CONSENT_REQUIRED`; invalid image signature 415 `RULA_IMAGE_SIGNATURE_INVALID`. No mock provider was used for the successful inference. A provider failure/timeout retry suite and browser session were not established by this E2E.

## Intermittent structured-response failure

The first candidate E2E run saw a valid provider HTTP 200 followed by application HTTP 502 `RULA_IMAGE_AI_INVALID_RESPONSE` on BOTH. A separate BOTH invocation on the same candidate and configuration passed. The raw model response was deliberately not retained. Thus the exact invalid shape, parser branch, and whether this is model nondeterminism or a parser defect remain unresolved. This is a material reliability risk and must not be described as fixed.

## Evidence needed to resolve the historical 401

The blocked resource is the protected runtime configuration/log context for the old backend instance, not an absent model-catalog response. The server operator who can inspect that old process must provide a sanitized record containing: process identity and PID, loaded build marker, a non-secret configuration-source identifier, provider host/route and normalized model, authorization-header-present and credential-matches-configured booleans, request content/schema flags, upstream status and safe error code/type/truncated description, provider response server header, and request/correlation ID. No key, fingerprint, authorization value, prompt, image, or full response body is needed. The current candidate's successful authenticated vision request provides no evidence requiring an ArvanCloud entitlement change; do not request such a change unless the old sanitized provider error explicitly indicates it.

## Browser and public runtime

- Candidate authenticated browser journey: **NOT RUN**. Playwright was not installed. A runner attempt under the current interactive identity failed before API/browser startup because access to protected `C:\NIVASafe\.env` was denied (`process.loadEnvFile` surfaced `ENOENT`). The `.env` file was not read or printed; its ACL query returned Access denied.
- Attempt to schedule the runner as SYSTEM stopped at `New-ScheduledTaskAction` with Access denied; no task was registered. No authenticated screenshot/trace or mobile (~390 px) browser proof exists for this candidate.
- No genuine WebKit/Safari run or iOS run occurred.
- Public `https://app.nivasafe.com/api/v1/health` was not verified: the current host session raised `System.Net.Http.HttpRequestException` before a response. Current active local API at `http://127.0.0.1:5044/api/v1/health` returned 200, version `0.1.0`, database up. PID 14048 listens on 5044, but process path/start time/service identity are inaccessible to this session.
- Public static root `C:\inetpub\nivasafe\app-com` currently contains index SHA-256 `E1C893E440F8B769CB2E119C47D7D682BCD9DB092C0F4FD581A097B830885ED9`, JS `2B4F0C30678C311D30F4E0BDD67EBEFB12DA8BB6D1A12CC16A82C65B88094A17`, CSS `EA10DC070BD448680ADDBDC99305CA95B91C4F6EFB5C2BBF09AE7CA5A468CE86`. No frontend assets changed in this run. These local hashes do not prove what the public hostname serves.
- The browser blocker is the ACL-protected `C:\NIVASafe\.env` and denied Task Scheduler task creation for interactive identity `srv9298144857\codexsandboxoffline`. The required action is a narrowly scoped SYSTEM runner/config path that supplies staging settings; granting broad access to the production environment file is unnecessary.
- A specialist Debug plugin tool was not exposed among callable tools. Diagnostics used the available PowerShell, Node/Vitest, Prisma, local HTTP, process/network, and Task Scheduler interfaces.

## Validation commands and results

| Command | Working directory | Result |
|---|---|---|
| `pnpm --version` | `C:\NIVASafe` | Exit 0; 11.25.0. Repository package manager is pinned to pnpm 10.13.1, so this global root version was not used to claim a full-workspace pass. |
| `C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --configLoader runner --maxWorkers=2 src/ai-provider.test.ts src/rula-posture-ai.test.ts src/rula-multi-image.test.ts` | Candidate backend | Exit 0; 3 files, 60 tests passed. |
| `C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --configLoader runner --maxWorkers=2 src/rula-posture.test.ts src/rula-three-stage.test.ts src/rula-process.test.ts src/rula-ai-retry.test.ts` | Candidate backend | Exit 0; 4 files, 25 tests passed. |
| `C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --configLoader runner src/features/assessments/rulaAiRequest.test.ts src/features/assessments/rulaImageReviewFlow.test.ts src/features/assessments/rulaPostureReview.test.ts src/features/assessments/rulaVisionImage.test.ts` | `C:\NIVASafe\frontend` | Exit 0; 4 files, 29 tests passed. |
| `C:\Runtime\node\node.exe scripts\check-api-contract.mjs` | `C:\NIVASafe` | Exit 0; 90 frontend paths mapped to 154 backend routes. |
| `C:\Runtime\node\node.exe scripts\verify-release.mjs` | `C:\NIVASafe` | Exit 0; 29 checks passed. |
| `pnpm -C backend exec prisma generate --schema prisma/schema.prisma` | Candidate workspace | Exit 0 in prior candidate build record; generated Prisma Client 6.19.3. |
| `pnpm -C backend build` | Candidate workspace | Exit 0 in prior candidate build record. Candidate build hashes above. |
| `New-ScheduledTaskAction ...` for the browser runner | Current Windows session | Failed with Access denied before task registration. |

The earlier candidate handoff also reported 411 backend and 339 frontend tests, typecheck/build, contract, and release validation. Those totals are historical candidate evidence, not a full-suite rerun in this report. This run did not rerun full lint/typecheck/full test/audit. The exact shell invocation for the authenticated E2E runner is not preserved in its JSON artifact; the result files and API-level checks are preserved at the paths above.

## Files and changes

- No source, backend configuration, production setting, database schema, or deployment artifact was changed by this run.
- Earlier targeted code changes already present in the candidate: `backend/src/ai-provider.ts`, `backend/src/ai-provider.test.ts`, `backend/src/image-analysis-diagnostics.ts`, `backend/src/image-analysis-diagnostics.test.ts`. The vision adapter omits the unsupported `reasoning_effort` field for Arvan; focused regression tests passed. These are prior working-tree changes, not edits made by this run.
- No new dependency was added. No migration was executed against production.
- Disposable staging schema was created with `prisma db push --skip-generate`; this is not proof that historical migrations replay cleanly. Previously recorded duplicate-column/checksum drift remains a production-migration concern, but no schema change is needed for this code-only candidate based on the tested disposable schema.

## Release and rollback

**NOT DEPLOYED.** Production image privacy/vision approvals remain closed. No production backend or frontend was changed, no service was restarted, no live database/data/upload was touched, and no deployment backup/rollback rehearsal was performed in this run. The current session cannot verify the active backend executable/configuration or create a verified release rollback because the service/runtime paths and protected configuration are inaccessible. Do not copy the candidate into the live site based on the staging pass alone.

### Required external prerequisites

1. Provide a narrowly scoped SYSTEM-level browser-runner execution path with staging-only configuration, or an equivalent protected test identity, so authenticated UI behavior can be verified without granting broad `.env` access.
2. For any production RULA image acceptance, obtain and document organizational/privacy approval for sending posture images to ArvanCloud and configure the intended user/tenant gate through the approved operational path.
3. A release operator with access to the actual backend service identity/configuration must establish the active artifact and a verified code/config rollback snapshot before any backend deployment.

## Final matrix

| Milestone | Status | Evidence |
|---|---|---|
| Exact final backend candidate executed | PASS | Marker `rula-401-differential-candidate-20261018-01`; candidate `dist/server.js`; hash and PID recorded above. |
| Staging provider/config parity | PASS for current process; old 401 parity UNKNOWN | Same in-memory credential object observed on current text/image requests; old process snapshot unavailable. |
| Text direct request | PASS | ArvanCloud HTTP 200; returned `gpt-5-mini-2025-08-07`. |
| Image direct request | PASS | ArvanCloud HTTP 200 on synthetic image; seven body-part observations. |
| Authenticated RULA route | PASS in staging | RIGHT/LEFT/BOTH API inference HTTP 200, exact evidence JSON above. |
| Previous 401 root cause | BLOCKED / UNKNOWN | Old upstream body, request ID, runtime identity/config parity missing; current 401 not reproduced. |
| RIGHT / LEFT / BOTH inference | PASS in staging | RIGHT/LEFT in first run; BOTH in separate run on same candidate. |
| Score mapping / human review | PARTIAL | Persisted scores and review-required rows validated; no qualified independent accuracy review. |
| DB save, fresh GET/login, reports | PASS in staging | Disposable MariaDB evidence; reports and PDF 200, PDF 57,033 bytes. |
| Negative auth/privacy/file checks | PASS in staging | 401/403/415 responses listed above. |
| Candidate authenticated browser E2E | BLOCKED / NOT RUN | Protected `.env` ACL and Task Scheduler access denied; no screenshots. |
| Backup / rollback rehearsal | NOT RUN | No deployment attempted; no current-release snapshot verified in this run. |
| Backend deployed | NOT DEPLOYED | No live service/config/data modification. |
| Production vision/privacy approval | BLOCKED | Gates intentionally remain closed; written approval/configuration not evidenced. |
| Public health and authenticated live RULA | NOT RUN | Public HTTPS request failed before response; production test account flow not exercised. |
| UI/support regression smoke | NOT RUN | No candidate browser or live UI test this run; no code changed. |

