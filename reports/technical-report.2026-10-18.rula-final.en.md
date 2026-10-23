# NIVASafe Final Candidate RULA E2E and Release — Technical Report

| Field | Value |
|---|---|
| Project | NIVASafe |
| Jalali date | 1405-07-26 |
| Gregorian date | 2026-10-18 |
| Environments | Source at C:\NIVASafe; isolated candidate; no live deployment |
| Status | BLOCKED; final image request returned upstream HTTP 401 |

## Scope and preservation

The active repository at C:\NIVASafe was inspected. Git status contained 432 entries at the start of this phase, reflecting extensive prior modifications. No reset, clean, stash, live migration, or wholesale source replacement was performed. Provider diagnostics use a strict error-code allowlist and do not store response bodies, provider messages, credentials, or images. Two identical duplicated regression tests added in this phase were removed and the suites rerun.

The Debug plugin had no callable tools in this session. Native PowerShell, Node.js, Vitest, TypeScript, Vite, Prisma, and local HTTP checks were used.

## Environments

| Component | Path or identity | Result |
|---|---|---|
| Source repository | C:\NIVASafe | Preserved; prior modifications retained |
| Isolated candidate | C:\NIVASafe\.local\rula-final-candidate-20261017-053748 | Built and validated |
| Staging API | 127.0.0.1:5153 | Health endpoint returned HTTP 200 during test |
| Staging UI | 127.0.0.1:5175 | Sign-in and UI request attempted; exact served bundle provenance was not retained |
| Staging MariaDB | 127.0.0.1:53306, database nivasafe_rula_final_20261017 | Separate from active database |
| Active API | 127.0.0.1:5044 | Health endpoint returned HTTP 200; active binary identity could not be verified |
| Active service manager / Windows execution identity | NOT_VERIFIED | Process metadata and ProgramData release path were inaccessible; the earlier PM2/scheduled-task description was not treated as current proof |
| Protected runtime configuration | backend/.env and protected runtime paths | Read denied with EPERM/Access denied; no contents were exposed or changed |
| Public application | https://app.nivasafe.com | TLS verification from this host failed with a Schannel credentials error; no release occurred |

Staging API and MariaDB processes were stopped after testing. The local static proxy emitted ENOENT for C:\NIVASafe\.local\frontend\dist\index.html during shutdown, so the exact candidate bundle was not independently proven in the browser. This was isolated and did not affect the live site.

## RULA provider and authenticated flow

The candidate provider settings in code are:

- Provider: ArvanCloud.
- Endpoint: https://api.arvancloudai.ir/v1/chat/completions.
- Requested assessment/image model: GPT-5-Mini.
- Request shape: Bearer authentication in the adapter; no reasoning_effort for vision; max_completion_tokens; JSON response mode; bounded timeout.

A normal organization member with an authenticated staging session, explicit UI consent, and a synthetic 23,063-byte PNG invoked POST /api/v1/rula/posture-image-analysis. The audit record used internal request ID 278fd697-c746-4f18-b205-a4d4449cce15 and recorded upstreamStatus 401. A separate task-description suggestion using the same ArvanCloud runtime succeeded with HTTP 200, internal ID ebb3f06a-9e19-467c-b977-d24cd292f273. The runtime credential is present and can authorize text inference; that does not establish vision entitlement.

The provider response body and upstream request ID were not retained, and the provider error code was null. The authenticated model catalog was not queried because the protected runtime configuration was inaccessible. The evidence therefore cannot distinguish a credential rejected specifically for image inference from missing model/vision entitlement or account policy. A scoped diagnostic change was added to retain only allowlisted provider error codes and syntactically safe request IDs on a future run. The API process that handled the image request had been started before that diagnostic build; the candidate was rebuilt afterwards but not restarted because its protected runtime configuration was inaccessible.

No image response was parsed. Only BOTH was attempted; RIGHT and LEFT were not retried after the provider rejection. No score, review, save, reload, or report was produced for this candidate. Staging counts for RulaAssessment and RulaVersion were both zero. No placeholder result was stored.

The 17 October report documents successful RIGHT/LEFT/BOTH calls and persistence for a different checkout/candidate. That historical evidence is not acceptance for this candidate or the live site.

## Prisma and database

A disposable MariaDB at port 53306 was used for staging. Its schema was bootstrapped with prisma db push --skip-generate against that disposable database only; this was not a clean migration-history replay. Prisma validation for the candidate schema passed with exit code 0 and emitted a package.json#prisma deprecation warning. The active database schema was not compared because its protected configuration was inaccessible. No live schema was changed. The known duplicate globalRole column and three migration checksum mismatches were not edited or replayed. No production dump restore was performed or claimed because a sanitized, accessible dump was not available and no live data change was made.

The provider-diagnostic change did not modify Prisma schema or migration files. Compatibility of the full RULA persistence candidate with the active database remains unverified because the active schema could not be read.

## Tests and commands

Vitest, TypeScript, Vite, and Prisma binaries came from the candidate dependency tree and ran with Node v22.22.3. The repository pins pnpm@10.13.1, but the installed pnpm command reported 11.25.0; pnpm installation/scripts were not used.

| Exact command/check | Result |
|---|---|
| CWD candidate backend; C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --reporter=dot | 60 files, 411 tests passed, exit 0 |
| CWD candidate frontend; C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --reporter=dot | 51 files, 339 tests passed, exit 0 |
| CWD candidate backend; C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run src/ai-provider.test.ts src/image-analysis-diagnostics.test.ts --reporter=dot | 2 files, 50 tests passed, exit 0 |
| CWD candidate backend; C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -p tsconfig.json --noEmit | Exit 0 |
| CWD candidate backend; C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -p tsconfig.json | Exit 0 |
| CWD candidate frontend; C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -b --noEmit | Exit 0 |
| CWD candidate frontend; C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -b | Exit 0 |
| CWD candidate frontend; C:\Runtime\node\node.exe .\node_modules\vite\bin\vite.js build --configLoader runner | Exit 0; 554.01 kB main JS chunk warning over 500 kB |
| CWD candidate backend; Prisma validate --schema .\prisma\schema.prisma with a non-connecting isolated validation URL | Exit 0; package.json#prisma deprecation warning |
| CWD candidate backend; C:\Runtime\node\node.exe .\node_modules\prisma\build\index.js generate --schema .\prisma\schema.prisma | Prisma Client 6.19.3 generated in candidate dependency tree; exit 0 |
| Candidate backend Vitest, typecheck, and build after Prisma generation | 60 files / 411 tests; typecheck and build exit 0 |
| Package-level backend/frontend lint scripts | Each package lint script is the same TypeScript noEmit command recorded above; both passed. Root Turbo/pnpm orchestration was not invoked |
| C:\Runtime\node\node.exe .\scripts\check-api-contract.mjs | 90 frontend paths / 154 backend routes; exit 0 |
| C:\Runtime\node\node.exe .\scripts\verify-release.mjs | 29 checks passed; exit 0 |
| pnpm --version | 11.25.0, exit 0; differs from repository pin 10.13.1 |

Logs are in reports/evidence/rula-final-candidate-20261018. These checks validate source/build/contracts; they do not prove provider success, persisted RULA output, or live deployment.

## Candidate source and artifacts

The safe provider diagnostic and regression coverage are in:

- backend/src/ai-provider.ts
- backend/src/ai-provider.test.ts
- backend/src/image-analysis-diagnostics.ts
- backend/src/image-analysis-diagnostics.test.ts

Two identical duplicate tests were removed from the test files. All four files were already modified in the baseline; attribution is limited to the diagnostic block and its tests. No schema, migration, live config, UI, API contract, chat model, or support feature was changed.

| Artifact | Candidate SHA-256 | Currently served SHA-256 |
|---|---|---|
| Frontend index.html | 9821696BFA822DE6D710414C9CEF45E1B4925451FBA28134048993911CEDD9F4 | E1C893E440F8B769CB2E119C47D7D682BCD9DB092C0F4FD581A097B830885ED9 |
| Frontend JS | F6BB690167D9F4C00DC27190AFF820AC905728A4FDCD8CCEE7F5BD3BF356ECBA | 2B4F0C30678C311D30F4E0BDD67EBEFB12DA8BB6D1A12CC16A82C65B88094A17 |
| Frontend CSS | 7FA339E553DA2DDF99C51DE8B4295CCC511695D0E5CD95D7714EC5D382E345B7 | EA10DC070BD448680ADDBDC99305CA95B91C4F6EFB5C2BBF09AE7CA5A468CE86 |
| Candidate backend ai-provider.js | 30630A5F6BD2292F15F7E1883DE9FFA902855872F07129FF921BD56B699F6CF0 | Active backend binary hash NOT VERIFIED; protected ProgramData path denied |

Candidate backend dist was rebuilt after Prisma Client generation at 2026-10-18 01:33:55 -07:00. Candidate asset paths are frontend/dist/index.html, assets/index-BzxJh6jI.js, and assets/index-17Z8GZRa.css. Served paths are /index.html, /assets/index-C58TrXm0.js, and /assets/index-BR-uyfeR.css under C:\inetpub\nivasafe\app-com. Exact hashes and sizes are also in acceptance-evidence.json.

## Deployment and rollback

No backend or frontend deployment occurred. No live service was restarted, no live migration was run, and no privacy/vision setting was changed. No production backup or rollback rehearsal was created. The upstream 401, inaccessible runtime configuration, and unverified active binary identity block a safe RULA release.

## UI, support, and other regression scope

No UI, navigation, support-ticket, FMEA, chat-model, or database-schema source was changed for this task. The full frontend test suite, frontend build, API contract check, and release verifier passed. Authenticated support-ticket round trips, Safari/WebKit, and live UI/support smoke were not rerun in this RULA phase. Previous UI/support release evidence remains historical and is not recertified here.

## Required external action

An ArvanCloud account administrator must confirm or enable GPT-5-Mini multimodal/vision entitlement for the credential already loaded in the staging runtime at the endpoint above. Do not send the key in chat. After that change, retry one synthetic image request with the diagnostic candidate. The privacy-policy owner must separately authorize provider transmission for any live test. After a successful image response, repeat RIGHT/LEFT/BOTH, parsing, human review, save, fresh-session reload, and report generation on this exact candidate, then verify the active binary and rollback path before deployment.
