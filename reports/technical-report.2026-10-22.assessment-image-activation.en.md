# NIVASafe — Assessment image-analysis repair and activation technical report

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Technical |
| Language | English |
| Gregorian date | 2026-10-22 |
| Jalali date | 1405-07-30 |
| Release | release-assessment-image-activation-20261022-01 |
| Source baseline | Frozen previous release release-rula-direct-consent-20261022-01 |
| Final deployment time | 2026-10-22T17:11:54.251Z |
| API PID recorded at deployment | 16632 |
| Status | DEPLOYED; authenticated public image analysis, persistence and PDF download PASS for both methods |

## Scope and root cause

Empty operational flags prevented image transfer independently of account consent. FMEA also lacked a separate consent check and fresh authorization at its HTTP transfer boundary. V2 consent covered only `rula-posture`; it was not assumed to authorize FMEA.

The existing React/Vite frontend, Fastify backend, Prisma/MySQL persistence, protected file storage and deployment architecture were retained. The candidate started from the previous frozen release source with only relevant changes overlaid. Unrelated changes in the existing checkout are not represented as part of this deployment.

## Implementation and trust boundaries

Operational activation through `RULA_IMAGE_PROCESSING_ENABLED_PROVIDER` and `FMEA_IMAGE_PROCESSING_ENABLED_PROVIDER` is separated from claims of verified provider privacy conditions. An explicitly empty value disables that scope even if a legacy approval setting is populated. Deployments without the new key retain compatible legacy behavior. Vision capability and provider availability are independently checked. Legacy privacy-approval fields remain empty in this deployment.

Current consent version `image-processing-account-2026-10-22-v3`, with purpose `assessment-images`, covers both authorized image types. V1/V2 receipts remain preserved and do not count as current consent. Users must save their own choice again. Historical photo-owner grants remain visible and owner-revocable, with outdated-policy status until replaced under the current policy.

RULA retains account, photo-owner, role, organization, quota, file type/signature/size, validated-result persistence and protected-retrieval controls. FMEA checks current consent and fresh authentication, organization, role and quota before transfer. Both paths record a hash-based transfer audit and refresh authorization at dispatch. FMEA compares the same current consent receipt again after the mandatory audit. Failed mandatory audit or changed authorization stops transfer.

Image requests reject provider redirects and do not automatically replay timed-out transfers. RULA's existing bounded malformed-structured-answer retry remains a separate control. Invalid JSON or incomplete FMEA rows fail rather than becoming empty success. The existing RULA instruction against inventing missing task, duration, repetition or force context is included in the release.

## Changed runtime components

| Compiled module | Relevant responsibility |
|---|---|
| `ai-provider.js` | Image transfer boundary, redirect rejection and automatic replay prevention |
| `fmea-process.js` | Explicit validation of FMEA image output |
| `image-processing-consent.js` | V3 and assessment-images purpose |
| `image-provider-approval.js` | Operational activation separated from verified provider conditions |
| `modules/assessments.js` | FMEA image policy, current consent, refreshed access, mandatory transfer audit and safe errors |
| `posture-image-authorizations.js` | Preservation and display of historical photo-owner grants |
| `rula-posture-ai.js` | Preservation of the instruction against inventing absent assessment context |

Frontend changes are limited to existing consent copy. No new page, button, field, section or layout was introduced. Database schema, dependencies and unrelated contracts were unchanged.

## API and configuration

| Path with `/api/v1` prefix | Behavior |
|---|---|
| `GET/PUT /profile/image-processing-consent` | Current-version account acceptance/withdrawal; no acceptance on another user's behalf |
| `GET /fmea/image-analysis-policy` | Provider readiness with current consent and quota; private, no-store response |
| `POST /fmea/process-image-analysis` | Valid file, current consent, refreshed access and mandatory transfer authorization audit |
| `GET /rula/image-analysis-policy` | Image readiness with current consent and access |
| `POST /rula/posture-image-analysis` | Processing with preserved RULA boundaries |
| `GET /rula/posture-image-analysis/:id` | Stored findings scoped to the original user and organization |
| `GET /reports/{rula|fmea}/:id.pdf` | Protected report generation under existing access controls |

The requested assessment model remains GPT-5-Mini through ArvanCloud. A new policy version does not itself create user consent. Actual provider retention, deletion, training-use, recipient and processing-location conditions remain unknown; activation is not represented as their legal approval.

## Executed validation

| Check | Result and scope |
|---|---|
| Candidate backend tests | PASS — 744; failed 0; pending 0 |
| Candidate frontend tests | PASS — 475; failed 0; pending 0 |
| Typecheck and lint | PASS — each package's lint uses the same TypeScript no-emit check |
| Backend and frontend builds | PASS |
| Independent scoped security review | PASS after preserving historical owner grants; 58 focused tests |
| Independent real integration | PASS — 11 checks; two actual image requests, one for each method |
| Missing, V2 and withdrawn consent | PASS — both paths denied without external transfer; withdrawal after success also checked |
| Persistence and retrieval | PASS — durable RULA result retrieval and save/reopen of both assessment drafts |
| Actual PDFs | PASS — RULA 45,103 bytes; FMEA 59,554 bytes |
| Release health and unauthenticated routes | PASS — release/database health; five protected-route 401 responses |
| Authenticated public-site image transfer | PASS — three controlled attempts; two successful results, saved drafts and downloaded PDFs |
| Deployment runtime identity guards | PASS — five Node tests rejecting version-label, PM2-path, actual-entry or listening-PID mismatches |
| Independent final release review | PASS — PID 16632 and actual entrypoint; 73 modules matched, no prior module missing and 20 reachable assets |
| Public PDF text parsing | PASS — all five RULA pages and all eleven FMEA pages contain text |
| Whole-repository scan, new dependency advisory audit and external penetration test | NOT_RUN — this delivery has a focused review; dependency versions did not change |
| Independent anatomical accuracy | NOT_RUN — successful transport does not certify accuracy |

Recorded build and typecheck commands:

```text
backend: node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
backend: node node_modules/typescript/bin/tsc -p tsconfig.json
frontend: node node_modules/typescript/bin/tsc -b --noEmit
frontend: node node_modules/vite/bin/vite.js build --configLoader runner
node scripts/releases/assessment-image-activation-20261022-01/synthetic-integration.mjs --execute
node --test scripts/releases/assessment-image-activation-20261022-01/runtime-identity.test.mjs
```

Complete suite counts are recorded in `backend-tests-final.json` and `frontend-tests-final.json`. The existing nonblocking warning about a production chunk larger than 500 KB remains.

The five new tests cover release tooling and are separate from the 744/475 application test counts. Application runtime source did not change again after those application suites ran.

Source tests and builds used Node 24; production runs Node 22. The genuine public-browser check verified image analysis, persistence and PDFs on that deployed runtime. These validation environments are not represented as identical.

## Independent environment, failures and repairs

The fixed image was a synthetic illustration without a real person. The request guard accepts only the specified endpoint, requested model, approved image hashes and `redirect:error`; its persistent ceiling is four total attempts and two per method. Exactly two attempts ran; successful responses were not replaced with mocks. Both usage records identify `gpt-5-mini-2025-08-07`. Two transfer receipts and two usage records were stored; no quota reservation remained. Assessments stayed `IN_PROGRESS`, and final human approval was not performed.

Initial bootstrap using the application account failed because it lacked schema-creation privileges; P1010 occurred before any provider call. Following authorization, the independent server on 53306 used the existing identity-verified datadir and a new random schema. No production grant or password changed. The synthetic account, membership and organization were disabled, sessions revoked, and only the independent server started for the test was stopped; its schema remains available for diagnosis. Final evidence confirms server shutdown and zero listeners on 53306.

Initial candidate preparation failures involving unbuilt workspace exports and missing Node test types were repaired in the test environment. Failed evidence was retained; no assertion was removed or test skipped to obtain success.

## Authenticated public browser verification

After the user personally saved V3 consent, the UI confirmed the checked option and recorded-consent status. The owner-authorized check followed only the known synthetic image hash in two existing user-owned drafts; other concurrent user requests were excluded from its counts.

| Assessment | Persisted public-check outcome |
|---|---|
| RULA — `92927dab-e99e-4c0c-a8a5-08feb3f9652f` | DRAFT; two saved and two linked images; new image model gpt-5-mini-2025-08-07; human review required |
| FMEA — `d65ce6f0-de88-49e8-a69c-6e79700c3e28` | DRAFT; increased from 20 to 25 rows, including five image-generated rows |
| Public RULA PDF | New 73,547-byte download; hash recorded in evidence |
| Public FMEA PDF | New 116,886-byte download; hash recorded in evidence |

This public check made three controlled outbound attempts: two RULA attempts, including an initial connection failure and success after an explicit manual retry, and one successful FMEA attempt. Two successful results were recorded with Audit events and connected status. These counts are separate from the two successful independent-environment calls. The initial connection failure's underlying cause was not determined; read-only unauthenticated GET probes under Node 22 and Node 24 returned the expected 401. That observation does not establish the POST failure's cause. TLS was not weakened and no automatic image replay occurred.

The unrelated draft was preserved. The public check updated only the specified synthetic records; a claim of no production-record changes would be inaccurate for this stage. Both assessments remained DRAFT and no official approval was performed. [Browser evidence](evidence/assessment-image-activation-20261022-01/live-browser-results.json), [RULA ready](evidence/assessment-image-activation-20261022-01/live-rula-image-ready.png), [RULA saved](evidence/assessment-image-activation-20261022-01/live-rula-saved.png), [FMEA ready](evidence/assessment-image-activation-20261022-01/live-fmea-image-ready.png) and [FMEA saved](evidence/assessment-image-activation-20261022-01/live-fmea-saved.png) remain retained.

Public PDF parsing read five RULA pages and eleven FMEA pages, confirming text on every page. This verifies parsing and nonempty content; it does not alone establish visual layout quality on every page.

## Deployment, recovery and integrity

Final deployment is recorded at the time and PID in the metadata table. Earlier deployment attempts temporarily disrupted API availability; the previous release was restored. The `17:05:31.171Z` result with PID 13288 was a false positive based on a version label: the operating system still executed the previous V2 release file. The user's V2-expectation error when saving consent and an independent process-path inspection exposed the mismatch. This result remains preserved in the [initial declaration evidence](evidence/assessment-image-activation-20261022-01/deployment-initial-label-only.json).

The final correction used `Client.executeRemote('restartProcessId', ...)` with `env.current_conf` containing the correct `pm_exec_path`, `script`, `pm_cwd` and `exec_interpreter`. Only the API was restarted, and saved PM2 state was aligned. Both PM2's path and the actual operating-system command line for PID 16632 confirm the `release-assessment-image-activation-20261022-01` entrypoint; APP_VERSION alone is not a success criterion. [Failure and recovery evidence](evidence/assessment-image-activation-20261022-01/deployment-failure.json) also remains retained; no database data restoration occurred.

Seven compiled modules were updated, and the HTML JavaScript entrypoint changed. Global CSS and its existing supplement, previous assets, the private `.env` file, schema and dependency versions were preserved. No migration ran. A private rollback snapshot is retained for this release. Evidence identifies the candidate source and its distinction from the working checkout; no whole-checkout deployment is claimed.

For rollback, restore the verified entrypoint snapshot and private process-manager configuration, restart only the API with the correct executable path, and check release/database health and assets. This change requires neither deleting old assets nor a database rollback. Do not delete or downgrade newly recorded consent receipts or findings.

## Handover status and remaining limitation

Activation and technical controls passed independent verification, and public deployment is recorded with the actual process identity. The user personally saved V3 consent, confirmed in the UI; authenticated image analysis for both methods, persistence and public PDF downloads passed. Consent was neither recorded on the user's behalf nor silently upgraded. Draft findings still require human review and a separate official-approval decision. The initial connection failure's cause and actual provider conditions remain unknown; no whole-repository security assurance, independent anatomical accuracy or legal compliance is claimed.

## Stage summary for the scoped repair

The recorded final status is `PASS_SCOPED_REPAIR`, limited to this repair.

| Stage | Status and evidence |
|---|---|
| 01 — Analysis | PASS — image-gating cause and preservation scope established |
| 02 — UI | PASS — existing consent surface only; unrelated UI preserved |
| 03 — Frontend | PASS — consent copy/version; 475 tests, typecheck and build |
| 04 — Backend | PASS — targeted image-processing repair; typecheck and build |
| 05 — Data | PASS — schema/migrations unchanged; real independent persistence and public test drafts |
| 06 — Integration | PASS — 11 real independent checks and public image/PDF routes |
| 07 — Access | PASS — current consent, role, organization, owner, quota and pre-transfer authorization |
| 08 — Security | PASS — independent scoped trust-boundary review; no unresolved material introduced finding |
| 09 — Testing | PASS — 744 and 475 application tests plus five release-identity tests |
| 10 — QA | PASS — public RULA/FMEA save/reopen; connection failure and manual retry documented |
| 11 — Deployment | PASS — executable, process manager, listener, health, assets and private ACLs |
| 12 — Final review | PASS — independent release/source matching, regression, persistence and PDF checks |

## Evidence inventory

- [Change description](../docs/assessment-image-activation-2026-10-22.md)
- [Candidate and file scope](evidence/assessment-image-activation-20261022-01/candidate.json)
- [Build and validation](evidence/assessment-image-activation-20261022-01/build-validation.json)
- [Genuine integration](evidence/assessment-image-activation-20261022-01/synthetic-integration.json)
- [Detailed independent result](evidence/assessment-image-activation-20261022-01/synthetic-integration/result-1792687670787-2b90532b.json)
- [Successful deployment](evidence/assessment-image-activation-20261022-01/deployment.json)
- [Deployment failure and recovery](evidence/assessment-image-activation-20261022-01/deployment-failure.json)
- [Initial false-positive version-label declaration](evidence/assessment-image-activation-20261022-01/deployment-initial-label-only.json)
- [Independent final release review](evidence/assessment-image-activation-20261022-01/independent-final-review.json)
- [Public browser results and PDFs](evidence/assessment-image-activation-20261022-01/live-browser-results.json)
- [Public PDF text validation](evidence/assessment-image-activation-20261022-01/live-pdf-validation.json)
- [Final stage and scope verification](evidence/assessment-image-activation-20261022-01/final-verification.json)
- [Customer report](customer-report.2026-10-22.assessment-image-activation.en.md)
