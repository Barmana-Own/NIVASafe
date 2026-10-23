# NIVASafe Technical Report — RULA Posture Image Root-Cause Investigation

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report date (Jalali) | 25 Mehr 1405 |
| Report date (Gregorian) | 2026-10-17 |
| Repository | `C:\NIVASafe` |
| Branch / HEAD | `main` / `e5bf3f050bd6e127e13918c8d3eefcd3f8376acf` |
| Status | Provider root cause unresolved; RULA end-to-end blocked; not deployed |
| Debug plugin | `DEBUG_PLUGIN_NOT_AVAILABLE`; no callable Debug tools were exposed |

## Executive result

The currently running RULA route is fail-closed because its privacy-approval setting is empty. The historical ArvanCloud HTTP 401 remains unresolved: earlier requests using the same protected credential source succeeded for model discovery and GPT-5-Mini text inference, while a later model-list request returned 401; an earlier staging image request also returned 401. This run made one different, bounded text-only GPT-5-Mini request; it timed out after 15 seconds without an HTTP response. DNS, TCP/443, and TLS 1.3 were successful. The previously rejected request was not repeated. The live image-to-provider-to-save-to-reopen journey was not performed, and no source changes were deployed.

This run made one narrow diagnostic hardening change: it preserves a provider request correlation ID only when the value matches a UUID-shaped allowlist, and passes that ID into internal image-analysis audit metadata. It does not fix Arvan authentication or establish vision capability.

## Runtime and source evidence

| Item | Verified state |
|---|---|
| Task/service | Scheduled task `NIVASafe-API`, state `Running`, service account `SYSTEM`; wrapper invokes PM2 |
| Backend process | PID `14048`, Node at `C:\Runtime\node\node.exe`, started 2026-10-16 15:28:44 |
| Running artifact | `C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js` |
| Working directory | `C:\NIVASafe`; runtime code loads `.env` from the working directory |
| Local API health | `GET http://127.0.0.1:5044/api/v1/health` returned HTTP 200; database `up`, AI `optional-fallback-ready` |
| Provider | ArvanCloud, configured base URL `https://api.arvancloudai.ir/v1` |
| Credential | A setting exists in the protected root `.env`; no secret was read into output. The effective process value was not independently inspected |
| Image approval | `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` is empty in the active configuration; the active artifact checks this gate before the provider call |
| Active artifact fingerprints | `server.js` `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0`; `ai-provider.js` `8784D5C1124B8E727ED33E73E546DA92A0C91243671C89EE521EC67744206FCF` |
| Active artifact time | Files in the release directory were timestamped 2026-10-15 11:35:17 UTC |
| Public hostname | HTTPS request from the current execution environment failed with a network `HttpRequestException`; public status/assets were not verified in this run |

The repository had 414 modified/untracked status entries at the task baseline. RULA-related source files already contained prior edits. Attribution below is limited to the diagnostic-ID change from this execution; unrelated existing changes are not attributed to this run.

## Root-cause findings

### 1. Current live application behavior

The active `POST /api/v1/rula/posture-image-analysis` handler checks `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` before making a provider request. The active value is empty, so the current route should remain blocked before image inference. This is a verified configuration state, not a fresh live request result. The guard was not changed.

### 2. Historical HTTP 401

The prior technical record at `reports/technical-report.2026-10-16.arvan-auth-investigation.en.md` contains these bounded results:

| Probe | Historical evidence |
|---|---|
| `GET /v1/models` | Two HTTP 200 responses, followed by a later HTTP 401 using the same protected configuration source. The successful catalog listed `GPT-5-Mini`, `GPT-4.1-Mini`, `GPT-4o-mini`, and `DeepSeek-V4-Flash` |
| GPT-5-Mini text completion | HTTP 200; provider-reported model `GPT-5-Mini`; 43 tokens reported by the prior record |
| Staging image request | Historical sanitized ID `b8e12c19-f17b-4c7a-9cdd-875209157873`; upstream HTTP 401, application surfaced `503 RULA_IMAGE_AI_UNAVAILABLE`, and no score was saved |
| Separate image response | One image request through the deployed GPT-4.1-Mini adapter reached parsing but failed the RULA response schema. Exact upstream status/model for that request were not retained |
| Current bounded text probe | One `POST /v1/chat/completions` for `GPT-5-Mini`, using the root protected `.env` credential source; client timeout at 15 seconds and no HTTP status/request ID. DNS resolved, TCP/443 connected, TLS 1.3 certificate validation succeeded. Provider-side completion/usage after client abort is unknown |

These facts do not establish a stable valid credential, image-model entitlement, or current vision support. The prior report did not capture a provider request ID or authentication challenge for its later catalog 401, and the staging image request's retained ID is the only actionable correlation reference. The new text request timed out before an HTTP response, despite successful DNS/TCP/TLS checks; it therefore did not establish authentication or model access. The rejected catalog request was not repeated. Invalid key, scope/entitlement, gateway/account/IP policy, API response stalls, and intermittent gateway behavior remain distinguishable only by Arvan account logs/support.

### 3. Deployed/source model drift

The active compiled `ai-provider.js` routes RULA image analysis to GPT-4.1-Mini with GPT-4o-mini fallback. The `.env` setting `AI_RISK_MODEL=GPT-5-Mini` does not override that active image wrapper. Current source `backend/src/ai-provider.ts` routes RULA image analysis to the risk provider using fixed `GPT-5-Mini`; current `backend/src/modules/assessments.ts` checks both privacy approval and vision-capability approval. The active October 15 artifact predates those source changes and has only the privacy gate in the inspected image route. Current source is not the runtime.

The prior Arvan model catalog result is historical evidence of model names being listed, not evidence that the gateway currently grants vision inference for those IDs. One current text completion was attempted but timed out without provider response; no model catalog request was repeated and no image request was sent.

## RULA flow status

| Boundary | Status | Evidence / limitation |
|---|---|---|
| Client selection/upload in live browser | NOT RUN | No authenticated browser session or approved test identity was available in this run |
| Authentication, organization, authorization, quota, consent | MOCK / source only | Targeted registered-member tests exercise mocked boundaries; no active-user session or live request was used |
| Active server image gate | BLOCKED | Active privacy-approval setting is empty; server checks it before provider invocation |
| Arvan authentication/model access | BLOCKED / unresolved | Earlier catalog and text 200s; later 401; current text request timed out before HTTP response; no definitive provider explanation |
| Real image inference | NOT RUN this run; prior malformed/401 evidence | No image was transmitted in this run. Prior synthetic image response did not validate as a RULA object |
| Structured posture parse | MOCK PASS only | Unit tests cover response validation and failures; no real provider response accepted in this run |
| Left/right/both-side isolation | MOCK PASS only | Unit tests exercise selection and result isolation; no live inference |
| Human review and deterministic final score | NOT RUN end-to-end | No actual provider proposal was saved/reviewed; no clinical/ergonomic validation claimed |
| Database save, reload/re-login, report | NOT RUN | No isolated database/test identity was provided; active database was not written |
| Failure/privacy protections | Unit tests only | No gates were bypassed; negative tests use test doubles |
| Browser / Safari | NOT RUN | No browser UAT; Safari/WebKit was not available in this execution |

## Change made in this execution

| File | Change |
|---|---|
| `backend/src/ai-provider.ts` | On non-2xx provider responses, allow only an upstream request ID in UUID format (optional `req_` prefix); omit response body and authentication challenge |
| `backend/src/image-analysis-diagnostics.ts` | Add only valid UUID-shaped request IDs to internal image-analysis audit metadata; retain allowlisted status/code/retryability only |
| `backend/src/ai-provider.test.ts` | Verify a provider 401 retains a valid request ID without leaking its response body, and rejects token-shaped header values |
| `backend/src/image-analysis-diagnostics.test.ts` | Verify valid UUID retention and rejection of bearer/JWT-like and oversized values |

The two existing provider files had extensive changes before this execution; those prior hunks are preserved and are not represented as newly authored here. The two diagnostics files are untracked source additions from the current work. No environment/configuration values, database schema/data, deployment artifacts, or services were changed.

## Validation

| Command/check | Environment | Result |
|---|---|---|
| `pnpm --version` | Repository shell | `11.25.0`; repository pins `pnpm@10.13.1` |
| `pnpm lint` | Repository root | Exit 1. Turbo ran; API lint/typecheck failed with missing `@prisma/client`, `vitest`, `fastify`, and other package/type dependencies (TS2307/related errors). No dependency installation was attempted |
| Vitest 3.2.7 `run src/ai-provider.test.ts src/image-analysis-diagnostics.test.ts src/rula-ai-retry.test.ts src/rula-action-workflow.test.ts src/rula-action-generation.test.ts src/rula-posture-ai.test.ts src/rula-multi-image.test.ts src/rula-evaluation-details.test.ts src/rula-posture.test.ts src/rula-three-stage.test.ts src/rula-report.test.ts src/rula-registered-member.test.ts src/rula-process.test.ts --maxWorkers=2 --minWorkers=1` | Isolated `C:\NIVASafe\.local\rula-root-cause-20261017\backend` | Exit 0; 13 files, 148 tests passed. Provider/database boundaries are mocked; this is not real provider or database E2E |
| TypeScript 5.9.3 `tsc --noEmit -p tsconfig.json` | Same isolated backend | Exit 0 |
| TypeScript 5.9.3 `tsc -p tsconfig.json` | Same isolated backend; output confined to scratch `backend/dist` | Exit 0 |
| `git diff --check -- backend/src/ai-provider.ts backend/src/ai-provider.test.ts backend/src/image-analysis-diagnostics.ts backend/src/image-analysis-diagnostics.test.ts` | Source tree | Exit 0; line-ending warnings only |
| Local health GET | Running API at `127.0.0.1:5044` | HTTP 200; read-only health check |
| Provider text probe `node C:\NIVASafe\.local\rula-provider-auth-probe-2026-10-17.mjs` | One direct GPT-5-Mini text request to configured Arvan gateway; temporary script emitted sanitized metadata only and was removed after execution | Exit 1; timed out at 15 seconds, no HTTP status or provider request ID; provider-side usage unknown |
| `Resolve-DnsName api.arvancloudai.ir`; `Test-NetConnection api.arvancloudai.ir -Port 443`; credential-free TLS handshake | Configured provider host | DNS resolved to two A records; TCP/443 connected; TLS authorized with TLS 1.3 |

Root `pnpm typecheck`, `pnpm test`, and root build were not run after discovering missing dependencies. No Prisma command, seed, smoke script, or database mutation was run. The active public endpoint could not be reached from this execution environment.

## Release and data safety

- **CODE FIXED:** only sanitized correlation-ID diagnostics and tests were added in this execution.
- **STAGING ACCEPTED:** no real staging provider/database journey; therefore not accepted.
- **DEPLOYED:** no. The running release remains `release-20261015-project-source-update`.
- **LIVE ACCEPTED:** no. No live authenticated upload/inference/save/reopen/report flow was performed.
- No process restart, service/task change, configuration change, database write, migration, or production deployment occurred.
- Rollback was unnecessary because no runtime artifact was replaced.

## Exact next requirements

1. Have the ArvanCloud account owner/support correlate sanitized request ID `b8e12c19-f17b-4c7a-9cdd-875209157873` and provide the gateway's reason for HTTP 401, verifying key scope, account/credit state, endpoint/region, IP policy, and image-model entitlement. Do not rotate or expose the key through chat/logs; if rejected, provision a separately authorized staging credential through the secret store.
2. Provide a disposable staging database and an ordinary authenticated test account, plus a synthetic image and explicit test consent. Keep production image approval closed.
3. Only then test the provider's currently authorized model once, validate the real structured result, complete user review/scoring/save/reopen/report, and deploy only after separate artifact rollback checks.

## Tool availability and timeline

- Debug plugin tools: unavailable in this Codex session; available shell, repository, isolated Node/Vitest/TypeScript tools were used.
- 2026-10-17: inspected runtime and historical evidence; confirmed current privacy gate and deployed/source drift; added bounded correlation-ID diagnostics; reran 148 focused tests, isolated typecheck/build, and repository lint check; made one bounded text-only provider request which timed out; separately verified DNS/TCP/TLS. No image or public-host request was made during this run.

