# Technical Report — ArvanCloud 401 and RULA Vision Investigation

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Technical report |
| Language | English |
| Jalali date | 1405-07-24 |
| Gregorian date | 2026-10-16 |
| Branch / HEAD | `main` / `e5bf3f050bd6e127e13918c8d3eefcd3f8376acf` |
| Delivery status | Gateway authentication is inconsistent; RULA and result persistence remain blocked |

## Root-cause conclusion

**The historical 401 cannot be attributed conclusively.** A credential exists in protected `C:\NIVASafe\.env` and the application release loads that file from its working directory. The same source was accepted for two requests during this investigation, while a later `GET /models` using the same configuration source returned HTTP 401. Presence is established; stable validity, endpoint/model entitlement, and gateway consistency are not. The latest 401 was recorded without response body, `WWW-Authenticate`, or provider request ID; the rejected request was not repeated.

The historical report `reports/final-debug-rula-tickets.md` records staging request `b8e12c19-f17b-4c7a-9cdd-875209157873`: upstream HTTP 401, sanitized application response `503 RULA_IMAGE_AI_UNAVAILABLE`, and no saved result. The request-time effective credential and model were not retained sufficiently to match that event to the current runtime.

## Current runtime

| Item | Evidence |
|---|---|
| Process manager | PM2 runtime launched from `C:\ProgramData\NIVASafe\run-pm2.cmd` |
| API process | PID 832, Node.js v22.22.3, PM2 online, started `2026-10-15T11:47:45Z` |
| Executed artifact | `C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js` |
| Working directory | `C:\NIVASafe`; deployed server loads `.env` from the working directory |
| Proxy / port | Nginx on 80/443; API on `127.0.0.1:5044`; local health HTTP 200 |
| Provider / base URL | ArvanCloud; `https://api.arvancloudai.ir/v1` |
| Credential source | Protected `C:\NIVASafe\.env`; no key in saved PM2 environment, but the deployed server loads it at startup |
| RULA image approvals | `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` and `RULA_IMAGE_VISION_SUPPORTED_PROVIDER` are empty in active PM2 configuration; the application must remain fail-closed |

## Deployed/source configuration drift

The deployed October 15 `backend/dist/ai-provider.js` routes RULA images through `RulaImageFailoverProvider`: primary `GPT-4.1-Mini`, fallback `GPT-4o-mini`. The PM2 and `.env` assessment model setting `GPT-5-Mini` does not override that image wrapper. Current `backend/src/ai-provider.ts` instead routes RULA images to the configured assessment provider using fixed `GPT-5-Mini`. Current source was not built or deployed during this investigation.

## Provider checks

| Check | Observed result |
|---|---|
| `GET https://api.arvancloudai.ir/v1/models` using the protected key | Two requests earlier in this turn returned HTTP 200; the successful catalog contained exact IDs `GPT-5-Mini`, `GPT-4.1-Mini`, `GPT-4o-mini`, and `DeepSeek-V4-Flash`. A later request returned HTTP 401 after the diagnostic script was corrected. |
| `POST /v1/chat/completions`, model `GPT-5-Mini`, short text request | HTTP 200; reported model `GPT-5-Mini`; expected `PASS` response received; reported usage 24 input + 19 output = 43 tokens. |
| Synthetic image through the deployed adapter, model `GPT-4.1-Mini` | One request. The adapter returned content, but the local parser rejected it with `RULA_IMAGE_AI_INVALID_RESPONSE`. The exact HTTP status, reported model identity for that response, and parser subreason were not captured. The request was not repeated. |
| Historical independent response | `C:\NIVASafe\backups\rula-three-stage-live-evidence.json`, dated October 9, records an Arvan response reported as `gpt-5-mini-2025-08-07`. The saved answer parsed with the current deployed parser: RIGHT side, six detected parts, one requiring review, and eight overlay landmarks. This is historical evidence only, not current release or persistence acceptance. |

The current image probe used the deployed `getAIProvider("arvancloud", "risk", "GPT-4.1-Mini")` adapter, parser/build artifacts and synthetic-only `frontend/test-fixtures/rula-ai-synthetic.png`. It did not invoke the authenticated application endpoint and therefore did not exercise JWT, tenant authorization, AI allowance reservation, or per-image consent. No gate or user record was changed; provider-side usage for the one image call was not captured.

## Diagnostic-probe defect and correction

`.phase03-final-validation-20261016/scripts/check-vision-models.mjs` previously selected a key only from PM2 state or `process.env`. PM2 does not retain the key, and the shell did not export it; the script did not load the protected root `.env`, so it could send `Bearer undefined`. The script now loads the protected file in memory, exits without sending a request when no key exists, and prints only status plus a small allowlisted set of model IDs. `node --check` passed with exit code 0. Its rerun reported `credentialPresent:true` but still returned HTTP 401. This probe defect could explain some diagnostic 401s but does not explain the latest 401.

## RULA and database status

- The direct synthetic provider request reached response parsing, but no valid RULA structure was produced in the current probe.
- Privacy/capability gates are empty. No live user request should reach image analysis until the exact privacy and model capability approvals are in place. No gate, authorization, quota, or consent setting was changed.
- No isolated staging `.env` or test-user credential file was available under `.phase03-final-validation-20261016`; only staging identifiers remain. The active database was not accessed for writes.
- Authenticated regular-member upload, manual review, save, reload, and report rendering: **NOT RUN**. No result was fabricated or persisted.

## Changes, validation, and deployment

The only non-report file changed is `.phase03-final-validation-20261016/scripts/check-vision-models.mjs`. Four dated bilingual reports were added. Application source, protected `.env`, PM2, services, Nginx, database, migrations, and user records were not changed. No service restart or deployment occurred.

| Command / check | Result |
|---|---|
| `node --check .phase03-final-validation-20261016/scripts/check-vision-models.mjs` | PASS, exit 0 |
| `GET http://127.0.0.1:5044/api/v1/health` | PASS, HTTP 200 |
| ArvanCloud model catalog | PARTIAL: HTTP 200 followed by HTTP 401 on a later request |
| GPT-5-Mini text inference | PASS as a direct provider probe; not application end-to-end |
| Current RULA image probe | FAIL at response parsing; output did not satisfy schema |
| Isolated DB, authenticated user, save/reopen/report | NOT RUN; staging DB and test-user credentials were unavailable |
| Full build/test/lint/typecheck | NOT RUN; application source was not modified and scope was provider diagnosis |
| Service restart / deployment / migration | NOT RUN |

## External requirement

The ArvanCloud account owner must review provider-side logs/support for the 401 on `/v1/models` and `/v1/chat/completions` and confirm key authorization for the intended vision model. Any key rotation or entitlement change must be made through the protected server secret store; never send the key in chat. An isolated staging database and ordinary test-user credentials are required to complete the application save/reload journey. Image gates should only be changed after privacy approval and a successful exact image/JSON test in staging; no such change was made here.
