# Assessment image connection reliability repair

| Field | Value |
|---|---|
| Task | image-first-attempt-20261022-01 |
| Gregorian date | 2026-10-22 |
| Jalali date | 1405-07-30 |
| Current release | release-image-first-attempt-20261022-02 |
| Deployment time / API PID | 2026-10-22T19:13:32.077Z / 4420 |
| Current status | COMPLETE_SCOPED_REPAIR |

## Current outcome

R2 completed a clean first RULA upload in 39,210 ms and a clean first FMEA upload in 24,967 ms. Each used one upload action, one client request, one transfer authorization, zero failed requests and zero manual retries. Both returned connected ArvanCloud GPT-5-Mini findings. RULA stored eight native local-pose points before returning its response; FMEA returned five validated image-risk proposals. The assessment drafts were not saved by these checks. The independent preservation/final release gate passed; this scoped repair is complete.

The change fixes a reproduced connection-establishment failure, with bounded resources and recovery only before an HTTP request can have been delivered. It preserves the earlier landmark/frame repair, existing UI, schema, image consent, ownership, role/tenant/quota controls and approved provider/model route. The earlier timeout-only V1 failed its actual controlled test; that failed evidence remains history and is not represented as success.

## Failure mechanism and final implementation

Three unauthenticated Node 22 HEAD probes failed with nested UND_ERR_CONNECT_TIMEOUT after 10,579 / 10,495 / 10,497 ms. TCP connected promptly to both resolved CDN addresses, while certificate-verified TLS did not reach secureConnect within the old connector budget. A root-operated curl measurement observed about 19 ms TCP and 14.58 seconds TLS. No credentials, authorization headers or images were sent. This proves the connection-layer failure mechanism; it does not assign every previous 60/120-second response timeout to that same cause.

The pinned public undici@6.29.1 dispatcher is used only for approved assessment images. Its TLS connector allows 30 seconds with certificate verification enabled and normal DNS/SNI. There is no global dispatcher modification, hardcoded IP, DNS override, new provider recipient or TLS bypass. Other text/chat transport remains unchanged.

The dispatcher is one deliberate process-lifetime singleton for one approved origin, with four connections, pipelining one, and 60-second idle/max keep-alive limits. It is not allocated per upload. Idle sockets retire normally and the operating system closes remaining sockets at process exit.

At most three connection establishments share the same bounded 120-second wall-clock budget, including response/body handling. Only proven pre-HTTP UND_ERR_CONNECT_TIMEOUT, DNS EAI_AGAIN and ECONNREFUSED errors qualify. Current authorization/audit runs before every connection attempt. Received HTTP statuses, response-body failures, ambiguous socket resets/TypeErrors and PROVIDER_TIMEOUT cannot enter this recovery path. At most one image payload is delivered by this transport operation. The existing separate RULA malformed-answer validation remains bounded at two validation calls; it was not expanded by R2.

Installed Undici connector/client source confirms that the HTTPS connector callback succeeds only after secureConnect and that an HTTP context/request write cannot exist before that callback. Diagnostics retain only recognized network codes and attempt counts 1–3, not raw exceptions, addresses, headers, image data or credentials.

## Dependency and preservation

Only undici@6.29.1 was added, with exact lock integrity and Node engine >=18.17. Other baseline dependency and development-tool versions remain. Initial preparation detected the pre-existing root Vitest ^4.1.11 versus frozen ^3.2.4 difference; the candidate package/lock were derived from the immutable baseline plus the one verified dependency addition, preserving unrelated working changes. No candidate existed before that preparation check failed.

The package is copied into the private immutable release with every file hash checked; previous dependency links remain. Exactly ai-provider.js and image-analysis-diagnostics.js changed at runtime; no prior module was removed. Private environment, schema/migrations, local pose worker/model, background-worker configuration, frontend/index and published assets are preserved. No migration or R2 NGINX reload occurred.

The existing two image-only HTTPS app/API proxy locations retain read 300 seconds/send 120 seconds. Generic read/send waits remain 120 seconds, with existing TLS and forwarded headers. A real 65,033 ms isolated delayed response through that same block completed with one upstream request, no image and no paid provider call.

## Validation evidence

| Check | Status | Result and limit |
|---|---|---|
| R2 full backend suite | PASS | 824; zero failed/pending; Node 24.19.0 |
| Domain/backend build and type/lint | PASS | Frozen candidate; lint uses the TypeScript no-emit check |
| Production Node provider/diagnostic suites | PASS | 101 on Node 22.22.3; no paid calls |
| Independent focused tests | PASS | 130 across five suites; overlap with full tests, not additive unique coverage |
| Frontend preservation | PASS_REFERENCE | 242 source/700 static files unchanged; prior 475 tests referenced, not rerun |
| Source/security/deployment-helper review | PASS | Frozen hashes, preconnect proof, TLS, consent, quota, no ambiguous replay and resource limits |
| Official npm advisory metadata | PASS_LIMITED | Only undici:6.29.1 queried; empty response, not whole-project assurance |
| Runtime deployment identity | PASS | PID 4420, matching PM2/OS/listener and healthy release; protected routes return 401 |
| Clean RULA first upload | PASS | 39,210 ms; one upload/request/authorization/validation, zero retry/failure; eight durable local points |
| Clean FMEA first upload | PASS | 24,967 ms; one upload/request/authorization, zero retry/failure; five image proposals and current consent receipt |
| Independent final preservation/release review | PASS_SCOPED | 227 candidate files, 75 compiled files, 176 private Undici files, runtime/privacy/preservation and both actual controls verified |
| Clinical/generalized anatomical accuracy | NOT_RUN | No such certification from transport checks |
| New export/mobile/portrait QA | NOT_RUN | Frontend/export paths unchanged; prior point-repair evidence retained |
| Whole-project security/penetration audit | NOT_RUN | Review is limited to changed boundaries |

RULA analysis d9fbbf13-e8a7-45e7-8e31-24e33cad126f was durable before the client response; the assessment draft was not saved. FMEA image request d775323d-4150-4838-bc14-cb7ba4e590e7 returned a validated preview, rather than a durable AIAnalysisRequest image result; its image-route audit, current consent and usage were verified. Text follow-ups are excluded from its timing/counts. No official assessment approval was performed.

## Retained failed attempt and operational history

V1 increased the outer provider deadline but did not resolve the real workflow: request 9b9f5cdf-cec3-4631-9cdf-50881321646b failed PROVIDER_TIMEOUT after 120,051 ms, with one upload and zero retries. Its dispatch/failure pair remains in controlled-ui-failure-audit.json. Earlier first calls also succeeded, so a universal first-click semantic defect is not claimed.

The first V1 direct NGINX reload failed with Windows OpenEvent access denied 5 against the SYSTEM master, before any API switch. Its initial recovery flag was FAILED_REQUIRES_ATTENTION. Follow-up verification established restored proxy bytes on disk and healthy unchanged previous API PID 13180, with no data change. The existing SYSTEM NginxReloadOnce task was verified and invoked without changing definition, permissions or triggers. Result 0 and the new worker creation at the task's 11:42:08 run prove the actual reload. Future completion checks also require LastRunTime to advance. This known permission failure is separate from the earlier point-release startup timeout with an unproven cause. All failed/recovery/retry evidence remains.

## Evidence and final gate

Evidence is under reports/evidence/image-first-attempt-20261022-01/: candidate-r2.json, build-validation-r2.json, backend-tests-r2.json, production-node-tests-r2-summary.json, security-review-r2.json, deployment-review-r2.json, deployment-r2.json, controlled-live-r2.json, controlled-fmea-live-r2.json and both live first-upload screenshots. The official package-only query is retained in undici-npm-advisory-review.json. V1 evidence remains unchanged.

Current R2 functional and independent final acceptance are PASS_SCOPED. All twelve scoped stages are complete. This is not a claim that every provider request will succeed, a clinical accuracy certification or whole-project completion.

Final preservation review also reconciled the rolling audit export: the refreshed R2 snapshot is retained separately, and the historical 28-row file was restored only after an exact frozen-hash match. All 21 V1 evidence hashes now match; the failed controlled records were unchanged. See evidence-reconciliation-r2.json and independent-final-review-r2.json.
