# NIVASafe — Controlled Production Release Technical Evidence

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Technical evidence and operations handoff |
| Language | English |
| Gregorian date | 2026-10-19 |
| Jalali date | 1405-07-27 |
| Release | `release-20261019-safe-r8-uiux-handoff` |
| Source HEAD | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf; existing dirty tree preserved |
| Cutover UTC | 2026-10-19T11:29:53.884Z |
| Delivery | DEPLOYED CODE; LIVE RULA IMAGE DISABLED |

## Tooling actually used

Installed Debug workflow documentation was read. Native Debug and Chrome DevTools plugin tools were not exposed or invoked. Actual tools were PowerShell,Node,pinned pnpm,Prisma/MariaDB,Playwright/Chrome and CUA for the owner-authorized public session. No second pose/AI model was installed.

## Scope and release decision

The owner paused RULA anatomical optimization and authorized a safe code release with image gates closed when organizational privacy approval is absent. No new benchmark,image-provider request,pose model,scoring-threshold change or UI redesign occurred. Existing R8 accuracy failures remain in their original reports. This is acceptance of the scoped code release,not anatomical or live-image acceptance.

## Actual topology and identity

- Windows scheduled task NIVASafe-API → C:/ProgramData/NIVASafe/run-pm2.cmd → PM2 nivasafe-api; actual identity NT AUTHORITY\SYSTEM; Node22.22.3.
- Previous PID14048; current PID11620; actual entry `C:\ProgramData\NIVASafe\releases\release-20261019-safe-r8-uiux-handoff\backend\dist\server.js`; cwd C:/NIVASafe unchanged. Only the API app restarted. Nginx/database were not restarted or reconfigured.
- Public Nginx serves C:/inetpub/nivasafe/app-com and proxies /api/ to127.0.0.1:5044. API/task/Nginx remained running; public health reports release marker and DB up.
- Build source: C:/NIVASafe/.local/rula-final-candidate-20261017-053748.402 relevant files match repository source; the sole workspace difference is the explicit native-build allowlist adapter for pinned pnpm10.13.1.485 existing dirty paths were inventoried; none reset/stashed/discarded.
- Fresh self-contained runtime: pnpm deploy --legacy --prod --offline --ignore-scripts,generated PrismaClient6.19.3 copied from validated generation,all internal dependency links verified. The known legacy workspace self-link was rebased in the package only. New package16643files/783links; immutable marker in backend/release-marker.json.

## Source attribution and changes

The current task changed application deployment configuration only: deployment/ecosystem.config.cjs points the API to the new immutable runtime and adds non-secret APP_VERSION=release-20261019-safe-r8-uiux-handoff. The inactive worker boot path and APP_VERSION were also aligned to this same locked-model backend package at 2026-10-19T12:06:53.218Z. No worker was started and the API was not restarted for this later configuration-only alignment. Business source remains preserved. Evidence: inactive-worker-boot.json and final-runtime-recheck.json.

Previously developed files now carried into runtime include backend/src/ai-provider.ts,rula-posture-ai.ts,rula-geometry.ts,rula-measurement.ts,rula-image-normalization.ts,rula-landmark-localization.ts,modules/assessments.ts,modules/reports.ts,modules/support.ts,frontend/src/features/assessments/rulaMeasurement.ts and associated existing tests. These are carried-forward work,not newly authored anatomy improvements in this release. The support module hash was already equal to live; it was preserved. Full changed artifact paths are in backend-manifest.json/candidate-package.json and deployment-receipt.json; all402 source files are frozen in source-checkpoint.

New operational scripts live in scripts/releases/controlled-20261019/. Their6 negative/positive guard tests prevent rollback over a newer backend/frontend/config or rotated protected settings. Reports,state metadata and the UI/UX inventory are new handoff artifacts. No package manifest,lockfile,Prisma schema/migration,business source,chat workflow or navigation route was modified by this task.

## Preserved RULA and routing

- RULA/FMEA requested model: ArvanCloud GPT-5-Mini; no assessment fallback. Endpoint host/path https://api.arvancloudai.ir/v1. Prior R8 genuine provider evidence returned gpt-5-mini-2025-08-07; no new image request was sent in this release.
- Chat requested/recorded model: ArvanCloud DeepSeek-V4-Flash. The actual public synthetic conversation has1assistant response and348recorded tokens(221input/127output),suffix0c4051fb. Raw upstream HTTP status/request ID were not separately captured; success is supported by the real UI and durable Arvan/model usage record,not a mock.
- R8 experimental landmarks require NODE_ENV=test plus RULA_LANDMARK_EXPERIMENT_V2=1. Production NODE_ENV=production keeps that prototype off while retaining its code. Default deterministic geometry,EXIF normalization,strict parsing,side isolation,human-review enforcement,provenance and historical scoring versions are preserved.
- RULA_IMAGE_PRIVACY_APPROVED_PROVIDER,RULA_IMAGE_VISION_SUPPORTED_PROVIDER and corresponding FMEA image keys remain unapproved/closed. No provider key,JWT secret,AI entitlement,tenant role or protected.env value was changed. Available keys/provider responses do not establish organizational photo-transfer consent.

## Database compatibility and preservation

Read-only production metadata matched all37models/422scalar-or-enum fields; missing columns0,enum conflicts0. Packaged/current schema SHA matches eb872b071bc7807cf22b01932d1df3ec0fd854ca26da60a478e8347a1915fa33. No DDL,migration,seed,reset,DB restore or upload copy was executed. Historical checksum differences remain; the evidence compares LF-normalized source bytes and records2differing history rows without rewriting them. No clean historical migration replay is claimed. A future schema change still requires separate rehearsal/recovery validation.

Aggregate protected domain counts remained User26,Organization21,Project41,FmeaAssessment69,RulaAssessment51,RulaVersion81,SupportRequest1,SupportReply1. Counts plus the read-only deployment operation inventory support preservation; this is not a full-row-content checksum comparison. The one authorized synthetic chat,normal session/audit/usage records and normal quota accounting are expected changes.

## Executed validation and failures

| Command / environment | Exit / result | Evidence |
|---|---|---|
| pnpm10.13.1 exec turbo typecheck --force,candidate |0|typecheck.log|
| pnpm exec turbo lint --force,candidate |0;TypeScript lint scripts|lint.log|
| pnpm exec turbo test --force,candidate |0;609backend+349frontend+19domain=977|test.log|
| pnpm exec turbo build --force,candidate |2first(EBUSY action-progress.js),then0after packaging was serialized|build.log;build-retry.log|
| node scripts/check-api-contract.mjs,repository |0;90frontend/154backend|contract.log|
| node scripts/verify-release.mjs,repository |0;29checks|release-check.log|
| pnpm audit --prod --json,candidate |0;0advisories/478productiondependencies|audit-prod.json|
| node --test rollback-guard.test.mjs |0;6/6|rollback-guard-tests.log|
| exact packaged API+MariaDB+Chrome |0;54checks,18authenticatedscreen captures|staging-smoke.json|
| actual public HTTP+Chrome390/1280 |0;all referenced JS/CSS200;no fatal exceptions/overflow on login|public-after.json|
| final source/security/integrity |0;421checks;0exactsecretmatches|final-security-integrity.json|

Staging uses127.0.0.1:53306 AND verified datadir C:/NIVASafe/.local/rula-authenticated-e2e-20261017-01/mariadb/data,independent JWT secrets/uploads and disposable identities. Packaged NODE_ENV=production/AI_ENABLED=false prevented paid calls. RULA image gate returned503 and stored no score; cross-tenant404,member-to-admin403 and anonymous401 were observed. RULA BOTH reviewed values were saved,reopened after logout/login and exported to real Persian/English PDFs. FMEA create/item/reopen/PDF passed. Ticket create/idempotent replay/operator reply/internal note/status-priority-assignment/member reply/fresh login passed,with3replies and1member notification. Notification record/in-app tests do not certify external email/push delivery.

Harness failures were preserved,not hidden: initial staging query used an unsupported deletedAt filter; the next run omitted the current required FMEA activityDescription; both were corrected in test code and the final run passed. PM2 rehearsal first used an unrecognized config filename,then demonstrated restart/config did not switch the executable; the final connected-manager delete/start procedure switched previous→candidate→previous successfully. A missing wmic metric warning occurred in that isolated rehearsal; it did not prevent process/HTTP verification. Windows ACLs,Defender and protected.env permissions were not weakened.

Existing frontend chunk-size and Turbo output warnings remain. Root full-workspace dependency repair was not attempted; real commands above ran with pinned tooling in the matching isolated candidate.

## Operational release and rollback

Backup `C:/ProgramData/NIVASafe/backups/release-20261019-safe-r8-uiux-handoff`:16420backendfiles/370202639bytes and288frontendfiles/73751813bytes,all reconstructed and hash-verified. The old package retains one historical,unused pnpm API self-reference to its original incoming workspace; compiled non-test modules do not import that self-package. This backup is proven on this host,not advertised as portable to an arbitrary machine. The new package has no external dependency links.

Protected.env backup and protected PM2 runtime snapshot retain the original SYSTEM/Administrators-only ACL; config values are never included in these reports. Original.env hash remains unchanged. PM2's Windows global-pipe behavior was accounted for by unique IPC during rehearsal; production supervisor identity was preserved. No scheduled task was added.

Cutover:API14048→11620,2026-10-19T11:29:49.130Z to 2026-10-19T11:29:49.817Z;frontend index switched 2026-10-19T11:29:53.519Z;public acceptance completed 2026-10-19T11:29:53.884Z.17static files changed after staging;old immutable assets and manually managed web.config were retained. sw.js remained hash-identical(v55). No production rollback was necessary.

Safe rollback command,Administrator on this same host:

    C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\controlled-20261019\release.mjs rollback

It validates current backend/index/config/env anchors before writes,restores only code/service config/static index+changed public files,restarts only nivasafe-api and verifies previous health/hash. It never restores database data or overwrites a subsequently rotated.env. A newer release/config/secret causes refusal and requires reconciliation. Guard anchors and reconstruction/PM2 evidence are durable under this evidence directory.

## Actual artifact identity

| Artifact | Before SHA-256 | Deployed SHA-256 |
|---|---|---|
| index.html | e1c893e440f8b769cb2e119c47d7d682bcd9db092c0f4fd581a097b830885ed9 | 39e4cc72b24a145c52f22b2507d96ec5428947056fd8328a3441f9bcbf3c8d28 |
| main JS | 2b4f0c30678c311d30f4e0bdd67ebefb12da8bb6d1a12cc16a82c65b88094a17 | 101a84293ed5db1bc2c8ac7971c85c6d64f91081334376c1931d645bcb04ac08 |
| main CSS | ea10dc070bd448680addbdc99305ca95b91c4f6efb5c2bbf09ae7ca5a468ce86 | 7fa339e553da2ddf99c51de8b4295ccc511695d0e5cd95d7714ec5d382e345b7 |
| ai-provider.js | 8784d5c1124b8e727ed33e73e546da92a0c91243671c89ee521ec67744206fcf | 04fcebb35d6c54b3e83043fecdcb98a1e94eef61fd2c8fa897e5a7c206d407bc |
| rula-posture-ai.js | See prior artifact manifest | cd2390f25466fd311fc21584346e971df7d9c0ca108a227fb88c76628ab7bf21 |
| rula-geometry.js | See prior artifact manifest | a30bc7f82a5863722c91a8caec997da3b15a2184830108f81bea90f61458f212 |
| modules/assessments.js | f5f8cd21b7c03bcdcbc4a1abf90f45d042646b308e47c25496af9f73b1f59abd | 2cf08b22716d0190e2bb6c71cd59f791a79604d43438385f03e61cca0356ac39 |
| modules/support.js | 6b3042e7f384a6fdd8ef5fe76b9b37750251af812220668cb5410881b18cd332 | 6b3042e7f384a6fdd8ef5fe76b9b37750251af812220668cb5410881b18cd332 |
| modules/reports.js | d028136f9a4acba0e337e11c5e983ce1e7b1617f83c88a072837148a22223e9e | d141bcae3ac06092095eb268eb2a1a5e4aa1b55689f9d6369a702af4cbb39b98 |

Main public assets: /assets/index-CZ6hxJEG.js and /assets/index-17Z8GZRa.css. server.js itself is hash-identical across builds,so identity is proven using actual PID/entrypoint,health APP_VERSION and the changed semantic module hashes,not that entrypoint hash alone.

## Public acceptance limits and handoff

The owner logged into an approved test account without providing credentials to the agent. The same session remained authenticated across deployment. Public RULA form contains title,image input and RIGHT/LEFT/BOTH;FMEA/support/admin/assistant screens loaded with the new main JS and0console errors. The live approved viewport was788px; /fmea scrollWidth805 yielded17px overflow(P2). This is assigned to the next design phase,not silently marked responsive PASS. Public anonymous login and actual authenticated staging covered390/1280. Safari/WebKit,public logout and two-role public ticket mutation were NOT RUN. Existing session is retained for the UI/UX handoff.

No full authenticated screenshot is retained because account/history panels are private. A screenshot buffer-conversion failure was not used as evidence; accepted visual artifacts are public anonymous login and synthetic authenticated staging captures.

## Stage summary and verdict

This incremental release did not re-execute all twelve full-product implementation stages. Stages01/02 were NOT RUN as new analysis/design; existing artifacts and the owner decision were reused. Frontend/backend build,read-only schema compatibility,contract,scoped auth/security and regression checks passed for this release. Full QA Stage10 remains BLOCKED by incomplete public device coverage and the recorded FMEA layout issue. Stage11 code-only deployment PASS. Stage12 full-product acceptance remains BLOCKED: live image privacy approval is absent and anatomical accuracy is not independently validated. Code deployment,design readiness and full-product acceptance are separate states.

| Milestone | Status | Actual environment | Evidence / limitation |
|---|---|---|---|
| Code deployment | PASS | Public + SYSTEM API | deployment-receipt.json; runtime-after.json; public-after.json |
| Backend/frontend matching candidate | PASS | Immutable package + HTTPS | candidate-package.json; artifact-preparation.json |
| RULA RIGHT/LEFT/BOTH controls | PASS | Actual public form | public-authenticated-ui.json |
| RULA real image inference this release | NOT RUN | Live gates CLOSED | No image transferred; prior R8 inference remains historical |
| RULA save/relogin/reopen/PDF | PASS | Exact production-mode package; isolated MariaDB | staging-smoke.json; staging-rula.fa.pdf; staging-rula.en.pdf |
| RULA anatomical accuracy | NOT ACCEPTED | Prior R8 reference benchmark | No new optimization/benchmark; preliminary results require review |
| RULA pilot privacy authorization | BLOCKED | Production | Documented organizational authorization not established; gates unchanged |
| FMEA create/item/reopen/PDF | PASS | Exact package; isolated MariaDB | staging-smoke.json |
| FMEA public screen | PARTIAL | Authorized public session at 788px | Loads; 17px horizontal overflow remains for UI/UX |
| New FMEA AI inference | NOT RUN | Public | Routing verified in released code/tests; no extra paid request |
| Chat real provider + persisted response | PASS | Authorized public synthetic conversation | public-record-check.json: ArvanCloud / DeepSeek-V4-Flash / 348 tokens |
| Tickets requester/operator/reply/private note/tenant | PASS | Isolated real MariaDB/API | staging-smoke.json: 3 replies, 1 member notification |
| Tickets/admin public UI | PASS | Authorized public session | public-authenticated-ui.json |
| Public ordinary-member-to-operator ticket writes | NOT RUN | Public | Full two-role write test performed only in staging |
| Public login/session continuity | PASS | Owner-entered approved test session | Session retained across code cutover; no credentials copied |
| Logout/relogin | PASS | Isolated actual HTTP | staging-smoke.json; public logout not executed to retain operator session |
| Anonymous mobile390/desktop1280 | PASS | Actual public Chrome155 | public-after.json; public-after-login-*.png |
| Authenticated mobile390/desktop1280 | PASS | Real staging Chrome155 | 18 screenshots/pages; staging-smoke.json |
| Authenticated public 390/1280 | NOT RUN | IAB session width788 | Public approved session tested at its available viewport788 |
| Safari/WebKit | NOT RUN | No verified runner | No Safari/iOS compatibility claim |
| Tests/typecheck/lint/build | PASS | pnpm10.13.1 isolated candidate | 977 tests; 6 operational guard tests; build retry0 |
| API contract/static release checks | PASS | Current repository | 90 frontend paths /154 routes;29 checks |
| Production dependency audit | PASS | Candidate | audit-prod.json:0 advisories,478 prod dependencies |
| Schema compatibility | PASS | Read-only production metadata | 37 models/422 fields; no missing columns/enum values; no migration |
| Artifact/config backup + rehearsal | PASS | Independent copies + isolated PM2 | artifact-preparation.json; protected-config-backup.json; pm2-operational-rehearsal.json |
| Privacy/auth/source/data preservation | PASS | Actual release + staging negatives | final-security-integrity.json; public-record-check.json |
| UI/UX handoff | READY | Source checkpoint + running release | docs/uiux-handoff.2026-10-19.md |

Next action to enable images:obtain documented organizational approval for named-pilot transfers to ArvanCloud,then separately configure scoped production capability/consent and run authorized synthetic pilot acceptance. No new provider entitlement problem is asserted. Design work may proceed from docs/uiux-handoff.2026-10-19.md without changing scoring,permissions,privacy,model routing or business workflows.
