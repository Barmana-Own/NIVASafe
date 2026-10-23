# NIVASafe — Assessment image connection repair technical report

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Technical |
| Language | English |
| Gregorian date | 2026-10-22 |
| Jalali date | 1405-07-30 |
| Task | image-first-attempt-20261022-01 |
| Current release | release-image-first-attempt-20261022-02 |
| Baseline | release-image-first-attempt-20261022-01; prior landmark fix preserved |
| Deployment / API PID | 2026-10-22T19:13:32.077Z / 4420 |
| Status | COMPLETE_SCOPED_REPAIR |

## Current outcome and architecture

R2 passed clean first image uploads for RULA (39,210 ms) and FMEA (24,967 ms). Each used one UI upload, one client request, one transfer authorization, zero failed requests and zero manual retries. Both responses identify connected ArvanCloud gpt-5-mini-2025-08-07. RULA returned eight native local-pose points and FMEA five validated risk proposals. Final independent preservation/release acceptance passed for this scoped repair.

The existing React/Vite, Fastify, Prisma/MySQL and server-local pose architecture remains. Exactly ai-provider.js and image-analysis-diagnostics.js changed relative to V1. No module, page, route, data path or test was removed. The earlier failed V1 controlled case remains failed history, not a success claim.

## Proven connection mechanism and implementation

Three nonbillable Node 22 HEAD probes reproduced nested UND_ERR_CONNECT_TIMEOUT after 10,579 / 10,495 / 10,497 ms. TCP established to both DNS-resolved CDN addresses while verified TLS exceeded the old ten-second connection budget. Root curl measurements observed roughly 19 ms TCP and 14.58 seconds TLS. No credentials, authorization headers or image data were sent. This proves a connection-layer failure, not a universal explanation for every earlier response timeout.

A public pinned undici@6.29.1 Agent is scoped to approved assessment images only: 30-second TLS connect, rejectUnauthorized:true, normal DNS/SNI, four connections, pipelining one and 60-second idle/max keep-alive. It is one deliberate process-lifetime singleton for one approved origin; no per-upload pool allocation, global dispatcher, hardcoded IP or TLS bypass. Idle resources are bounded, and the OS closes remaining sockets on process termination.

Three maximum pre-HTTP connection attempts share one bounded 120-second clock across authorization, connection and response/body handling. Only UND_ERR_CONNECT_TIMEOUT, EAI_AGAIN and ECONNREFUSED qualify. Installed official connector/client code confirms secureConnect precedes callback, HTTP context and request writing. Fresh current authorization, mandatory audit and after-audit recheck run before each attempt. Existing transactional quota remains outside the bounded connection recovery.

HTTP statuses, body/parser failures, ambiguous socket errors/TypeErrors and PROVIDER_TIMEOUT cannot trigger this loop. At most one image payload is delivered per transport operation. Existing separate RULA malformed-answer validation remains capped at two validation calls and was not expanded. Redirects still fail closed, and the approved gateway/model identity is preserved. Diagnostics retain only allowlisted codes and counts 1–3, without raw exceptions, addresses, headers, credentials or payloads.

## Dependency, configuration and immutable deployment

Only undici@6.29.1 was added with exact integrity/lock entries and Node >=18.17 compatibility. Other baseline dependencies and development versions remain unchanged. Initial candidate preparation detected root Vitest ^4.1.11 versus frozen ^3.2.4; immutable baseline manifests plus only the verified Undici addition resolved that isolation mismatch without rewriting unrelated working changes. The package is privately copied into the immutable release, each file hash matched, and old dependency links preserved.

Deployment verified actual PM2 entry, OS command line, listening PID 4420, health and protected image-route 401 responses. Schema, migrations, private environment, local-pose Python/model, background-worker configuration, frontend/index and assets remain unchanged. R2 did not reload NGINX. Existing image-only proxy read 300/send 120 seconds and generic read/send 120 seconds remain; its original header/TLS preservation and real isolated 65,033 ms one-upstream-request test remain valid. No operational rollback test was run for this successful R2 rollout; source/backup recovery guards were reviewed.

## Executed validation

| Check | Status | Result and scope |
|---|---|---|
| Full R2 backend tests | PASS | 824; zero failed/pending; Node 24.19.0 |
| Domain/backend build/type/lint | PASS | Lint is the same TypeScript no-emit check |
| Production Node provider/diagnostic tests | PASS | 101 on Node 22.22.3; no paid calls |
| Independent focused tests | PASS | 130 across five suites, overlapping full suite |
| Frontend preservation/reference | PASS_REFERENCE | 242 source/700 static hashes match; prior 475 passing tests, no rerun |
| Frozen source/security/deployment-helper review | PASS | Source hashes, preconnect proof, TLS/resources, fresh consent/quota, replay boundaries and private dependency/rollback source |
| Official package advisory metadata | PASS_LIMITED | Empty official npm response for undici:6.29.1 only; not whole-project assurance |
| R2 runtime identity | PASS | Exact new immutable entry/PID/listener, protected 401 checks, preserved schema/UI/proxy/pose/private config |
| Actual clean RULA first upload | PASS | 39,210 ms; one upload/request/authorization/validation; zero retries/failures; eight durable local points |
| Actual clean FMEA first upload | PASS | 24,967 ms; one upload/request/authorization; zero retries/failures; current consent and five image rows |
| Independent final preservation/release review | PASS_SCOPED | 227 candidate, 75 compiled and 176 private dependency files verified; both actual controls and preservation reviewed |
| New export/mobile/portrait checks | NOT_RUN | Unchanged frontend/handlers; prior point-repair checks retained |
| Clinical/population accuracy or whole-project penetration audit | NOT_RUN | Not established by scoped transport repair |

The 101 and 130 focused counts overlap with 824 and are not added as unique coverage. Full backend commands/results are in build-validation-r2.json; production and independent commands are in production-node-tests-r2-summary.json and security-review-r2.json.

## Actual result semantics

RULA request 49901b6c-f37f-4b23-ba7d-efa6f5ef6d24 produced durable analysis d9fbbf13-e8a7-45e7-8e31-24e33cad126f before its response. The assessment draft itself was not saved. Eight points retain MEDIAPIPE_POSE_LANDMARKER provenance; no clinical certification or official assessment approval was performed.

FMEA image request d775323d-4150-4838-bc14-cb7ba4e590e7 had 24,287 ms provider time and 24,967 ms total time. Its image-route audit, current consent receipt and usage identify the actual five-row image result. Text follow-ups are excluded from counts/timing. FMEA returns a validated preview and does not create RULA's durable AIAnalysisRequest image-result record. Its assessment draft was not saved by this test.

## Retained failures and repair history

V1's deadline-only actual first upload failed PROVIDER_TIMEOUT after 120,051 ms; one upload/zero retries. That failure is immutable in controlled-ui-failure-audit.json. Earlier first calls also succeeded, so an always-first-click semantic failure is not asserted.

V1 initially failed direct NGINX signaling with Windows OpenEvent access denied 5 before API switch; recovery initially reported FAILED_REQUIRES_ATTENTION. Follow-up verified original proxy bytes restored on disk, no signal reaching the SYSTEM master, and healthy unchanged previous API PID 13180/no data change. A verified existing SYSTEM NginxReloadOnce task then succeeded without definition/permission/trigger changes. Its result 0 and matching new worker creation prove the actual run; future checks also require LastRunTime advance. This known permission cause is separate from the older point-release startup timeout whose cause remains unproven. All failed/recovery/retry and preparation-rework artifacts remain retained.

## Handoff and final gate

Candidate, build, production Node, security, deployment-helper, runtime and live evidence use the R2-suffixed files in reports/evidence/image-first-attempt-20261022-01/. The two actual controls are controlled-live-r2.json and controlled-fmea-live-r2.json, with live-first-upload-r2.png and live-fmea-first-upload-r2.png. Source state and prior runs are preserved; this report claims neither every future provider call nor whole-project completion.

Current R2 functional and independent final outcome is PASS_SCOPED. All twelve scoped gates and report/state/manifest reconciliation are complete; historical global project state is preserved.

Evidence reconciliation: a rolling audit export was refreshed after R2. The full new export is retained as recent-image-attempts-r2.json; the historical 28-row export was restored only after exact original SHA verification. All 21 V1 frozen hashes now match, and failed controlled evidence never changed. This transparent reconciliation is recorded in evidence-reconciliation-r2.json.
