# RULA Final Candidate E2E and Release Result

| Field | Value |
|---|---|
| Project | NIVASafe |
| Jalali date | 1405-07-26 |
| Gregorian date | 2026-10-18 |
| Status | BLOCKED; final RULA acceptance failed and no release was performed |

## Result

The final candidate was built in isolation. The authenticated image attempt ran through a staging API process started before the final diagnostic-only build; protected configuration was inaccessible, so that process was not restarted and exact final-build runtime parity is unverified. The request reached ArvanCloud, but the upstream image request returned HTTP 401. The same staging runtime returned HTTP 200 for a task-text suggestion, so text access works while image access for this credential or model is not established. The 401 response captured no provider error code or provider request ID. Available evidence cannot distinguish an image-scope credential rejection from missing GPT-5-Mini multimodal entitlement.

No anatomical result or RULA score was produced or saved. RIGHT and LEFT were not attempted; BOTH failed. Review, save, reload, and report generation were not reached for this candidate. A successful run documented on 17 October used a different candidate and environment and is not acceptance evidence for this build.

## Test evidence

| Step | Result |
|---|---|
| Runtime parity with latest diagnostic build | Not verified; staging API process predated that build |
| Regular-user sign-in and organization authorization | Performed with a real staging session |
| Synthetic image and consent | Non-identifying 23,063-byte PNG; consent was checked in the UI |
| Real image request | POST /api/v1/rula/posture-image-analysis reached the provider; upstream HTTP 401; internal request ID 278fd697-c746-4f18-b205-a4d4449cce15 |
| Separate text request | ArvanCloud task-description suggestion using requested model GPT-5-Mini; HTTP 200; internal request ID ebb3f06a-9e19-467c-b977-d24cd292f273 |
| RIGHT / LEFT / BOTH | Only BOTH was attempted and stopped on 401; RIGHT and LEFT were not run |
| Score, review, persistence, report | Not reached; no fabricated score or RULA assessment record was saved |
| Staging database | Separate MariaDB; RulaAssessment and RulaVersion row counts were both zero after the attempt |
| Staging health | API and database were ready at test start; health endpoint returned HTTP 200 |
| Browser | Sign-in and submission were performed in the staging UI; the exact served static bundle provenance was not independently retained, so full candidate browser acceptance is blocked |

Sanitized evidence is in [acceptance-evidence.json](evidence/rula-final-candidate-20261018/acceptance-evidence.json) with test logs in the same folder. Only a synthetic image was used; no real user image or customer data was transmitted.

## Candidate and release state

- Candidate directory: C:\NIVASafe\.local\rula-final-candidate-20261017-053748.
- Requested assessment/image model: GPT-5-Mini. Gateway endpoint: https://api.arvancloudai.ir/v1/chat/completions.
- The existing Arvan request-shape correction remains: RULA vision omits reasoning_effort, uses max_completion_tokens and JSON mode, and has a bounded timeout.
- A diagnostic-only candidate change retains allowlisted provider error codes without storing raw provider bodies, messages, keys, or images. It did not resolve or classify the 401.
- No production source, configuration, service, frontend, database, migration, or image-approval setting was changed.
- The local live-site health endpoint returned HTTP 200, but the active backend binary identity and protected runtime configuration could not be read. Public HTTPS verification from this host was not completed because Schannel reported no credentials available in its security package.
- The live frontend hashes differ from the candidate. No production rollback snapshot was created because there was no deployment.

## Validation

| Command/check | Result |
|---|---|
| Backend Vitest, 60 files | 411 passed, exit 0 |
| Frontend Vitest, 51 files | 339 passed, exit 0 |
| Focused ai-provider and image-analysis-diagnostics Vitest | 50 passed, exit 0 |
| Backend TypeScript noEmit | Pass, exit 0 |
| Backend TypeScript build | Pass, exit 0 |
| Frontend TypeScript tsc -b --noEmit | Pass, exit 0 |
| Frontend TypeScript build | Pass, exit 0 |
| Vite production build | Pass, exit 0; 554.01 kB JavaScript chunk warning remains |
| Prisma schema validation | Pass, exit 0; package.json#prisma deprecation warning |
| Prisma Client generation | Version 6.19.3 generated in isolated dependencies, exit 0; 411 backend tests, typecheck, and build passed again afterwards |
| API contract checker | 90 frontend paths / 154 backend routes; pass, exit 0 |
| Release verifier | 29 checks; pass, exit 0 |
| pnpm | Installed command reports 11.25.0 while the repository pins pnpm@10.13.1. pnpm scripts/install were not run; versioned local binaries were used |

The disposable MariaDB schema was bootstrapped with db push --skip-generate only inside staging. Historical migration replay was not attempted; the known duplicate globalRole column and three checksum mismatches remain untouched. No production backup restore was performed or claimed.

## Required external action

An ArvanCloud account administrator must confirm or enable GPT-5-Mini multimodal/vision access for the credential already loaded by the isolated staging runtime at the endpoint above. Do not send the credential in chat or reports. After that change, one synthetic-image attempt can capture the sanitized provider error code and verify the response. A live release also requires explicit privacy-policy approval for sending the images to the provider and secure access to the protected runtime configuration during deployment.
