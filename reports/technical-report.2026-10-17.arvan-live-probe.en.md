# Technical Report — ArvanCloud Gateway and RULA Image Path

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Technical |
| Language | English |
| Jalali date | 25 Mehr 1405 |
| Gregorian date | 17 October 2026 |
| Repository | `C:\NIVASafe` |
| Branch / HEAD | `main` / `e5bf3f050bd6e127e13918c8d3eefcd3f8376acf` |
| Status | Source adapter fix verified; not deployed; full RULA acceptance blocked |

## Technical result

The active backend runs from Scheduled Task `NIVASafe-API` as `SYSTEM`; PM2 process PID `14048` executes `C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js`. The active Node runtime is `v22.22.3`, API listener `127.0.0.1:5044`, and gateway `https://api.arvancloudai.ir/v1`. Local health returned HTTP 200 and database `up`. Windows WinHTTP and Node proxy variables were unconfigured.

The protected `.env` credential was loaded by the service process; its value and length were not recorded. The active adapter uses `Authorization: Bearer`. From the actual service identity, DNS, TCP/443 and TLS 1.3 passed. `GET /v1/models` returned HTTP 200, request ID `256a01685555c42803455537a1e6f769`, and 90 model IDs. The effective risk model `GPT-5-Mini` and chat model `DeepSeek-V4-Flash` both appeared exactly in that catalog. A GPT-5-Mini text request to `/v1/chat/completions` returned HTTP 200, request ID `596d29f1304466279c7827552c2ea38c`, and 30 tokens with the expected response.

The historical HTTP 401 did not recur with the current credential. Current authentication and model access are valid, but the exact historical cause cannot be proven without the old safe response body, a credential/configuration snapshot, or the provider's request log. The prior timeout also did not recur: the current service-identity text request completed in about 7.6 seconds. DNS/TCP/TLS evidence does not indicate a Windows egress block; the precise cause of the earlier timeout remains unknown.

## Image request failure and correction

The active build and source initially sent `reasoning_effort: "low"` for structured GPT-5 requests. One image request received HTTP 400 with a gateway description that `reasoning_effort` conflicted with its internal `***.effort` setting; response ID `80f4229da023dbad3489c29dbe6b22df`. This was a request-format conflict, not the current authentication failure.

In `backend/src/ai-provider.ts`, output-token options now accept an explicit flag so only the ArvanCloud adapter omits `reasoning_effort`. The GapGPT adapter retains its previous behavior. `backend/src/ai-provider.test.ts` now asserts the omitted parameter while retaining the model, 3,000-token budget, JSON mode, and image payload checks.

The updated source was built in the isolated copy under the same `SYSTEM` identity, Node runtime, PM2 configuration, and protected credential. Its actual adapter sent a synthetic PNG stick-figure image to `/v1/chat/completions`. The gateway returned HTTP 200, response ID `39d8e2dad3c1c44ee13a893e5f5a69ca`, and model `gpt-5-mini-2025-08-07`. The isolated RULA parser accepted the real response: one side, seven body parts, five available angles, one row requiring human review, and eight overlay landmarks. Raw response text and image bytes were not retained. Sanitized metadata is retained at `.local/rula-arvan-runtime-probe-20261017.json`, `.local/rula-arvan-synthetic-vision-20261017.json`, and `.local/rula-arvan-adapter-live-test-20261017.json`.

Two preceding diagnostic observations are also relevant: a short 1,200-token probe returned no parseable content; a 3,000-token response with `reasoning_effort` returned JSON but failed parser validation. With the conflicting parameter omitted, the patched adapter's 3,000-token request parsed successfully.

## Application route and safety boundaries

The active profile in `deployment/ecosystem.config.cjs` leaves `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` and `RULA_IMAGE_VISION_SUPPORTED_PROVIDER` empty. The application route therefore remains fail-closed before sending an image. No consent gate, access policy, credential, service setting, or database record was changed. The image call used only the synthetic fixture and the isolated adapter; the authenticated HTTP route was not invoked.

No usable staging database, separate test identity, or tenant was present in the isolated copy. Assessment persistence, reload, report generation, tenant authorization, and negative-role tests were therefore not run. A real DeepSeek chat completion was also not run; only its exact catalog entry was confirmed.

## Files and validation

| File | Change |
|---|---|
| `backend/src/ai-provider.ts` | Omit `reasoning_effort` only for structured GPT-5 requests through ArvanCloud |
| `backend/src/ai-provider.test.ts` | Assert the conflicting parameter is omitted while preserving the image payload |

Both files already contained prior working-tree changes; only the targeted changes above were added in this turn, preserving the pre-existing edits.

Validation ran in the isolated copy at `C:\NIVASafe\.local\rula-root-cause-20261017\backend`:

| Command | Result |
|---|---|
| `C:\Runtime\node\node.exe node_modules\vitest\vitest.mjs run src/ai-provider.test.ts src/rula-posture-ai.test.ts src/rula-ai-retry.test.ts --configLoader runner --maxWorkers=2` | Exit 0; 3 files, 55 tests passed |
| `C:\Runtime\node\node.exe node_modules\typescript\bin\tsc --noEmit -p tsconfig.json` | Exit 0 |
| `C:\Runtime\node\node.exe node_modules\typescript\bin\tsc -p tsconfig.json` | Exit 0 |
| `git diff --check -- backend/src/ai-provider.ts backend/src/ai-provider.test.ts` | Exit 0; existing line-ending warnings only |
| `GET http://127.0.0.1:5044/api/v1/health` | HTTP 200; database up; active PID unchanged |

The full root workspace, `pnpm lint`, and full test suite were not run in this turn. No migration, seed, smoke script, or database write was run.

## Deployment, plugin availability, and handoff

The source fix was not copied to the active build and the service was not restarted. Active PID `14048` retained start time `2026-10-16T22:28:44.251Z`. Three temporary scheduled tasks were removed after their probes; three sanitized JSON evidence files remain under `.local`. No callable Debug plugin tools were exposed in this session; local Debug skills and shell, Node, and PowerShell were used.

Full acceptance requires an isolated staging database, organization, and regular test account. After explicitly authorizing the synthetic-image test, configure the RULA privacy and vision gates for ArvanCloud in staging only, then test the authenticated endpoint, persistence, reload, and report. Do not publish the backend until that route-level verification is available.
