# NIVASafe R8 — Landmark localization engineering evidence

|Field|Value|
|---|---|
|Project|NIVASafe|
|Report type|Technical|
|Language|English|
|Gregorian date|2026-10-19|
|Jalali date|1405-07-27|
|Generated UTC|2026-10-19T07:29:29.296Z|
|Candidate|rula-landmarks-r8-20261019-axisfix|
|Revision|e5bf3f050bd6e127e13918c8d3eefcd3f8376acf + preserved worktree|
|Release|BLOCKED / NOT DEPLOYED|

**ANATOMICAL ACCURACY FAIL. SOURCE REPAIRS VERIFIED. STAGING WORKFLOW VERIFIED. NOT DEPLOYED.**

R8 improved localization on a small paired subset but did not meet the independent acceptance target. The automatic predictor is unsuitable for release. The existing testing site, credentials, data, uploads, service configuration and privacy gates were not changed.

## Delivered

1. Preserved R7 and the original40; generated24 distinct analytic scenes with16development/8held-out split, immutable image/coordinate hashes and no model-generated ground truth. Ten distinct new benchmark scenes received real model requests (2dev,8held); this is not24 tested human photographs.
2. Added body/side/pixel-frame validation, deterministic geometry experiments, controlled uncertainty and provenance; tested cropping/grid without adopting them. No second ML model was installed or used.
3. Fixed a proven unnecessary gravity dependency in joint-relative calculations; trunk still requires gravity. Stored facing/up reference to make future errors reproducible.
4. Retained mandatory review and rejected tampering; corrected misleading RULA export wording for unobservable motion.
5. Verified genuine staging analysis, manual-reference correction, persistence, fresh sessions, reports/PDF and Chrome mobile/desktop.
6. Passed977 tests, build/typecheck/lint, contract/release checks and candidate production-dependency audit.

## Accuracy and remaining limits

The frozen eight-scene localization experiment produced **14/41 within±15°, numeric coverage30/41 (73.2%), max error208.14°**. The matched old-contract control produced10/41 within±15° with19/41 numeric coverage. More output did not establish reliable anatomy. The original40 are repeated samples of one drawing: R7 had21numeric/40 and21within15; R8-01 had10numeric/40 and6within15. Later partial coordinate replay is not new inference. A fresh BOTH after the geometry fix yielded8numeric/10,5within15,max110.71°. Full final-build holdout/40 inference was not repeated after the repair; the cap was30attempts.

The neck reference is a drawing proxy. No real-worker generalization or qualified ergonomic validation is claimed. Manual controls were filled by the automated test using known synthetic references, not by an ergonomist. Full-score category accuracy remains NOT VERIFIED.

## Live state and handover

Production remains the old packaged backend/static build. Live compiled RULA routing still includes older GPT model paths; no account-usage attribution is proved. Candidate routing is GPT-5-Mini for assessments and DeepSeek-V4-Flash for chat. Live privacy approval and operational rollback are unverified. Candidate-only190-file recovery passed. Safari/WebKit/iOS and real-photo evaluation were NOT RUN.

The next product decision is whether to retain an explicitly assisted manual-measurement workflow, or separately authorize an offline specialist pose-estimation study. RTMPose/MMPose is documented only as a proposal; no download/inference occurred. Accuracy, qualified acceptance and genuine production privacy/rollback gates must pass before activation. An API key or HTTP200 is not consent or anatomical accuracy.

Evidence: [acceptance-matrix.md](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/acceptance-matrix.md) / [heldout-metrics.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/heldout-metrics.json) / [legacy-40-before-after.md](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/legacy-40-before-after.md).

## Confirmed mechanisms and honest unknowns

- R6-02: reference elbow90°, model180°, old overlay154.983°. R6-37: reference90°, model180°, overlay25.017°. Mislocalization and unsupported direct degree guesses occur before deterministic scoring. No universal90/180flip, coordinate/radian conversion or EXIF cause was established for that old PNG. The exact internal model reasoning remains UNKNOWN.
-144 R6/R7 per-joint comparisons are in legacy-landmark-errors.json/.csv, with pixel/normalized/torso/arm errors, nearest-joint/body diagnostics and overlays for both outliers. Nearest-reference labels are diagnostics, not proof of internal reasoning.
- The matched heldout subset improves shoulder227.58→61.71px(N7), elbow232.89→64.91px(N7), wrist273.10→97.29px(N5). Counts are paired, not selected aggregate populations. This remains poor localization. Five nonzero signed cases uniquely reconstruct an incorrect facing flag from captured points and deterministic output. A global sign correction would damage other cases.
- Gravity was unnecessarily required before every angle calculation. A red test reproduced the problem. The corrected engine uses gravity only for trunk-vs-upright, preserving joint-relative vectors and signed-side requirements. This local mathematical repair is not evidence of VLM accuracy. Facing/up provenance is now retained.
- Crop contracts failed; exact lost response fields cannot be attributed retrospectively. Heldout rig18/22 failed localization_schema_invalid, baseline rig19 failed overlay_landmark_out_of_bounds. Rig24's new-contract request ended length with EMPTY_PROVIDER_RESPONSE. These were actual upstream200, not401/entitlement errors. They are not silently reclassified as successful abstentions. Safe future shape diagnostics were broadened; no full private response logging was added.
- No numerical threshold or model was selected from heldout outcomes. The post-evaluation gravity repair came from an analytic invariant, not threshold fitting. The original full experiment remains labeled R8-01; only a partial deterministic replay and one fresh authenticated BOTH validate the repaired inference build. No full recharged heldout claim is made.

## Benchmark/provenance and acceptance

|Metric|R7-contract contemporaneous control|R8 localization experiment|
|---|---:|---:|
|Distinct held-out scenes|8|8|
|All reference part measurements|55|55|
|Independently measurable image-plane references|41|41|
|Emitted numeric on measurable references|19|30|
|Within ±5° / all measurable|5/41|5/41|
|Within ±10° / all measurable|7/41|13/41|
|Within ±15° / all measurable|10/41 (24.4%)|14/41 (34.1%)|
|Within ±15° / emitted numeric|10/19|14/30|
|Numeric coverage|46.3%|73.2%|
|MAE / median / P90, numeric only|21.55 / 13.00 / 65.00|32.31 / 15.07 / 83.83|
|Maximum signed-convention absolute error|97.00|208.14|
|Wrong numeric estimates (>15°)|9|16|
|Measurable but validly abstained|17|1|
|Measurable missing due to response/parse failure|5|10|
|Correct non-axial unobservable abstentions /14|13|9|
|Unobservable references lost to parser/response failure|0|5|
|Wrong numeric on unobservable references|1|0|
|Base-category matches / all measurable|6/41|13/41|
|Numerical outliers >45° without a specific quality flag|3|7|

The55 part references comprise41measurable image-plane values and14non-axial unobservable values. Axial wrist twist is separately unmeasurable; it is not assigned a3D reference angle. Percentages retain all41measurable references; missing provider/schema results are counted separately, not called valid refusals. MAE/median/P90/max are numeric-only and must be read with coverage. Absolute error uses the frozen signed convention, not wrapping/clamping to reduce208.14°.

By-part/side/view/person metrics, false-accept/reject rates, localization errors and an exploratory2000-resample scene-cluster interval are in heldout-metrics.json. The prototype's within15/all-measurable interval is7.5–58.1%; it describes only eight synthetic scene clusters, not people. A low-bit bootstrap-index defect was corrected in the analysis helper; before-QA output was retained and no prediction or accuracy count changed. Development-only confidence sweeps show no validated operating point; ten already-correct R7 raw estimates had been withheld by the old agreement gate.

Base-category agreement13/41 follows existing software angle conventions; it is not full RULA or cervical validation. No independently complete scores including3Dtwist/load/muscle/modifiers exist. Existing Cornell tables and historical scoring versions were not changed. [Cornell worksheet](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf), [implementation notes](https://ergo.human.cornell.edu/ahRULA.html) checked2026-10-19.

## Model routing and real execution

Gateway: HTTPS api.arvancloudai.ir /v1/chat/completions. Requested GPT-5-Mini; confirmed image responses returned gpt-5-mini-2025-08-07.30attempts capped globally:28image responses200;2automatic RULA-report text attempts(#20/#21,PID4588) have no captured response near shutdown and remain UNKNOWN. They consumed budget and are not chat acceptance. One image finish_reason=length produced no content. No other model/provider was tried; assessment fallback is prohibited in the candidate. FMEA/chat had no real requests added and their unit/model-contract regressions passed. Codex's own model is unrelated to application outbound routing. Account dashboard/export was unavailable; other GPT usage attribution is NOT PROVEN.

Primary experimental API PID4588 and repaired inference PID2692 ran under Administrator from C:/NIVASafe/.local/rula-final-candidate-20261017-053748/backend/dist/server.js with unique health markers. Loaded response provenance demonstrates the new frame fields, and parser hashes match the final artifact. Final report-only wording was then rebuilt and actual PDF/browser rechecked with AI disabled; inference/scoring artifacts did not change. server.js alone is not a sufficient identifier. [candidate-manifest.final.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/candidate-manifest.final.json).

Staging port5153; MariaDB53306 AND datadir C:/NIVASafe/.local/rula-authenticated-e2e-20261017-01/mariadb/data verified before writes. Fresh DB/users/org/JWT/uploads separate from live. Prisma6.19.3 generated setup reused. db push --skip-generate applied only to new empty guarded staging schemas, without a data-loss flag. No live DB/schema/migration/checksum/credential/ACL/service change. Historical migration replay was not performed or certified.

Three BOTH routes and actual UI's independent RIGHT/LEFT returned200 on R8-01; numeric usefulness failed. The repaired code's fresh BOTH returned200,8numeric/10,5within15,max110.71°, then manual-reference edit, DB save, logout/login, freshGET, report/PDF200. The existing14-part metadata survived reviewed edits and relogin. A persistence comparison initially failed on0.31142857142857144→0.3114285714285714 JSON roundoff; a recursive<1e-10 comparison limited to persistence fixed the harness, not the accuracy tolerance. Strings/keys/enums remain exact.

Real Chrome155.0.8059.80/PlaywrightCore1.64.1 checked390/1280, upload/consent/review/save/reload on R8-01; final-build provider-free browser reopened real stored inference, downloaded PDF and exercised503/manual retry/zero new records. No fixture API interception or mocked login/provider. English browser/no whole-page overflow/no fatal page exceptions. Final English/Persian PDFs6pages, FApage1/ENpage5 rendered and inspected. Unobservable movement now says Not measurable in image. Safari/WebKit/iOS and authenticated Persian-browser UAT NOT_RUN; Persian PDF was inspected separately.

## Actual validation and resolved command failures

|Command / environment|Exit / result|
|---|---|
|Pinned pnpm10.13.1 / Node22.22.3, isolated candidate|Confirmed; restricted cache EPERM resolved through approved Administrator execution, no ACL weakening|
|pnpm exec turbo build --force|0; final report build; existing >500KB chunk and Turbo test-output warnings retained|
|pnpm exec turbo typecheck --force|0|
|pnpm exec turbo lint --force|0; repository lint is TypeScript, not ESLint|
|pnpm exec turbo test --force|0;609backend +349frontend +19domain =977; no skipped/flaky retry claim|
|Isolated pnpm verify:contract / verify:release|1/1 because scripts absent in that validation copy; NOT source failures|
|Authoritative checkout verifiers, repeated after final source edits|0/0;90frontend paths/154routes;29staticchecks|
|pnpm audit --prod --json, candidate|0;478production dependencies, zero advisories|
|Independent supplied-coordinate geometry QA|165/165; no inference/clinical claim|
|Targeted R8 tests|9localization +57reference/band +gravity/report/frontend regressions, included in total|
|Real-provider authenticated staging|PASS mechanics; anatomical FAIL|
|Provider-free provenance/browser|Initial false failure on JSON roundoff; corrected, finalPASS|
|Live image E2E / live deployment / live rollback|NOT_RUN / NOT_DEPLOYED / NOT_RUN|

Red/green logs are retained for localization module absence, explicit unknown subject, frontend provenance, gravity dependence and unobservable report wording. Initial command-path/quoting errors were corrected and never counted as valid test runs. No tests were deleted or tolerances weakened for accuracy.

## Security, preservation and release

Changed boundary review covered finite/bounded coordinates, max9landmarks, duplicate/side/subject mismatch, dimensions, envelope/connectivity checks, null handling, metadata copying, fail-closed test-only experiment selection and mandatory review. Real401unauthenticated/cross-tenant,403viewer/consent,415signature and400review tampering passed; false confirmations/gate failure stored no assessment. Invalid direct benchmark output is never sent to a save route. Source imports no ground truth, new ML dependency or debug endpoint. Candidate audit0; this is not a whole-production penetration test. User-authored review metadata is not cryptographically immutable.

Before-task inventory476Git entries and recoverable scoped source snapshot are baseline.json/git-status.before.txt. Unrelated modifications were preserved and are not attributed to R8. ai-provider.ts, scoring tables, schema/migrations, support, FMEA and chatbot source were not changed by R8. Changed paths:

- C:/NIVASafe/backend/src/modules/reports.ts
- C:/NIVASafe/backend/src/rula-measurement-report.test.ts
- C:/NIVASafe/backend/src/rula-geometry.ts
- C:/NIVASafe/backend/src/rula-geometry.test.ts
- C:/NIVASafe/backend/src/rula-posture-ai.ts
- C:/NIVASafe/backend/src/rula-measurement.ts
- C:/NIVASafe/backend/src/rula-landmark-localization.ts
- C:/NIVASafe/backend/src/rula-landmark-localization.test.ts
- C:/NIVASafe/backend/src/rula-landmark-reference.test.ts
- C:/NIVASafe/backend/test-fixtures/rula-landmarks-r8-reference.json
- C:/NIVASafe/frontend/src/features/assessments/rulaMeasurement.ts
- C:/NIVASafe/frontend/src/features/assessments/rulaMeasurement.test.ts
- C:/NIVASafe/scripts/rula-benchmark/generate-r8.mjs
- C:/NIVASafe/docs/rula-landmarks-r8.md
- C:/NIVASafe/project-state.json
- C:/NIVASafe/project-integrity-manifest.md

The live API remains PID14048/SYSTEM via existing NIVASafe-API task/PM2, entrypoint C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js. Public/localhealth and login/assets200. Static root C:\inetpub\nivasafe\app-com; live index SHA E1C893E440F8B769CB2E119C47D7D682BCD9DB092C0F4FD581A097B830885ED9. Live RULA compiled routing includes GPT-4.1-Mini then GPT-4o-mini, whereas the candidate is locked GPT-5-Mini. Effective in-memory use/account billing is not proved by those literals; live vision was not invoked. Image privacy/capability approval was absent/unmatched in inspected environment sources.

Candidate recovery: C:/NIVASafe/.local/rula-landmarks-r8-20261019/artifact-snapshot→C:/NIVASafe/.local/rula-landmarks-r8-20261019/artifact-rehearsal,190files restored with hashes. This is NOT a live binary/config/service rollback. No live backup/cutover/DBrestore rehearsal occurred because accuracy blocked release. No production artifact was replaced, process restarted or vision gate enabled.

## Reproduction, next decision and workflow state

Pure reference regeneration: node scripts/rula-benchmark/generate-r8.mjs <NEW_OUTPUT_DIRECTORY>; existing frozen output is never overwritten. Geometry/forensic/metric scripts are under C:/NIVASafe/.local/rula-landmarks-r8-20261019. Paid runners retain a30-request persisted cap and must not be relaunched by deleting their ledger.

See C:/NIVASafe/docs/rula-landmarks-r8.md for blinded ergonomist/annotation/consent protocol and a separately authorized offline RTMPose/MMPose proposal. [Official pose inference documentation](https://github.com/open-mmlab/mmpose/blob/main/docs/en/user_guides/inference.md) supports the architecture option, not a performance promise for NIVASafe. Nothing was downloaded/installed. The immediate decision is manual assisted measurement versus authorization for a different non-generative landmark architecture. No credential rotation or generic vision-entitlement action is justified by these results. Later release still requires accuracy/qualified acceptance, actual organizational privacy approval and a proven live rollback.

|Stage|Status|Evidence / scope|
|---|---|---|
|01|PASS|Scoped RULA requirements and preservation baseline|
|02|PASS|Existing review UI preserved; controlled uncertainty states reused|
|03|PASS|Typed frontend provenance round-trip; real browser checks|
|04|PASS|Geometry dependency repair; isolated experimental localization contract|
|05|PASS|Disposable DB/datadir guard; no live migration|
|06|PASS|Real authenticated API/manual correction/save/reopen/PDF|
|07|PASS|401/403 and tenant/review denial checks|
|08|PASS|Changed trust-boundary review; candidate audit0; not a production pentest|
|09|PASS|977 tests and final build/typecheck/lint|
|10|FAIL|Independent accuracy/coverage and outlier goals failed|
|11|BLOCKED|No accuracy/qualified/privacy acceptance or live rollback rehearsal|
|12|FAIL|Overall release not accepted; project remains incomplete|

PROJECT_STATUS remains INCOMPLETE.

|Milestone|Status|Evidence / interpretation|Artifact|
|---|---|---|---|
|Final candidate|PASS|rula-landmarks-r8-20261019-axisfix; real inference PID2692 / Administrator; parser hash matches final artifact|[candidate-manifest.final.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/candidate-manifest.final.json)|
|Frozen legacy40|FAIL|R6raw30/40; R7raw31/40, numeric21/40; R8-01 numeric10/40, within15=6/40; partial replay22/40 numeric,13/40 within15 is NOT fresh inference|[legacy-40-before-after.md](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/legacy-40-before-after.md)|
|Independent holdout|FAIL|24 scenes generated (16dev/8held); 8held tested per contract; prototype14/41 within15, coverage30/41|[heldout-metrics.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/heldout-metrics.json)|
|Joint localization|PARTIAL|Paired shoulder/elbow/wrist errors decrease, but remain61.71/64.91/97.29px; five uniquely inferred facing errors|[matched-joint-errors.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/matched-joint-errors.json)|
|Angle to score|PARTIAL|Existing tables/bands preserved and tested; only13/41 reference base categories match prototype; full ergonomic score truth unavailable|[heldout-metrics.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/heldout-metrics.json)|
|Abstention / 3D|FAIL|No axial degree fabricated; wrong numeric predictions remain;14 non-axial unobservable refs:9 correctly withheld,5 parser failures|[development-calibration.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/development-calibration.json)|
|Real Arvan model / budget|PASS|30 capped attempts:28 confirmed image HTTP200 GPT-5-Mini→gpt-5-mini-2025-08-07;2 report text outcomes UNKNOWN|[request-budget-ledger.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/request-budget-ledger.json)|
|Authenticated RIGHT/LEFT/BOTH|PASS|API/browser transport and review mechanics; three BOTH200 + separate UI RIGHT/LEFT200; fresh fixed BOTH200. Not anatomical acceptance|[final-candidate-e2e.axisfix.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/final-candidate-e2e.axisfix.json)|
|Save/reopen/PDF/browser|PASS|Real MariaDB; manual reference edits; logout/login/freshGET/report/PDF200; Chrome155 at390/1280; final provider-free browser/pass|[persistence-provenance.final.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/persistence-provenance.final.json)|
|Tests / build|PASS|609backend +349frontend +19domain=977; build/typecheck/lint0;90/154 contract;29 static release checks; audit0|[report-validation-exits.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/report-validation-exits.json)|
|Live routing audit|PARTIAL|Live PID14048 remains old packaged release and includes GPT4.1/GPT4o RULA paths; no billing attribution or live vision invocation|[live-runtime-readonly.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/live-runtime-readonly.json)|
|Live deployment / rollback|BLOCKED|NOT DEPLOYED.190 candidate artifacts reconstructed; live service/config rollback NOT RUN. Privacy/qualified/accuracy approval absent|[artifact-recovery.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/artifact-recovery.json)|

## All forty frozen comparisons

Four repeats of one drawing. R8-01 is actual inference before the gravity repair. Post-fix replay is partial deterministic reuse of captured coordinates, not fresh provider inference. Missing orientation is NOT_REPLAYABLE, not a numeric success.

|ID|Side / part|Ref°|R6°|R7 raw°|R7 numeric°|R8-01 geometry°|R8-01 numeric°|R8 abs error°|Partial replay°|Reason|
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
|R6-01|LEFT upperArm|10|90|20|ABSTAIN|33.69|33.69|23.69|33.69|REVIEW REQUIRED|
|R6-02|LEFT lowerArm|90|180|168|ABSTAIN|63.43|63.43|26.57|63.43|REVIEW REQUIRED|
|R6-03|LEFT wrist|0|0|5|5|14.25|14.25|14.25|14.25|REVIEW REQUIRED|
|R6-04|LEFT neck|0|0|0|0|0.00|0.00|0.00|0.00|REVIEW REQUIRED|
|R6-05|LEFT trunk|0|0|0|0|0.00|0.00|0.00|0.00|REVIEW REQUIRED|
|R6-06|RIGHT upperArm|60|30|75|ABSTAIN|48.37|48.37|11.63|48.37|REVIEW REQUIRED|
|R6-07|RIGHT lowerArm|90|60|90|ABSTAIN|107.19|107.19|17.19|107.19|REVIEW REQUIRED|
|R6-08|RIGHT wrist|0|10|10|10|28.69|28.69|28.69|28.69|REVIEW REQUIRED|
|R6-09|RIGHT neck|0|0|0|0|0.00|0.00|0.00|0.00|REVIEW REQUIRED|
|R6-10|RIGHT trunk|0|0|0|0|0.00|0.00|0.00|0.00|REVIEW REQUIRED|
|R6-11|LEFT upperArm|10|20|0|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-12|LEFT lowerArm|90|160|90|ABSTAIN|—|—|—|54.63|REFERENCE_FRAME_UNKNOWN|
|R6-13|LEFT wrist|0|0|0|ABSTAIN|—|—|—|3.27|REFERENCE_FRAME_UNKNOWN|
|R6-14|LEFT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-15|LEFT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-16|RIGHT upperArm|60|70|40|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-17|RIGHT lowerArm|90|90|60|ABSTAIN|—|—|—|103.59|REFERENCE_FRAME_UNKNOWN|
|R6-18|RIGHT wrist|0|5|20|ABSTAIN|—|—|—|3.74|REFERENCE_FRAME_UNKNOWN|
|R6-19|RIGHT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-20|RIGHT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-21|LEFT upperArm|10|0|90|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-22|LEFT lowerArm|90|90|180|ABSTAIN|—|—|—|101.31|REFERENCE_FRAME_UNKNOWN|
|R6-23|LEFT wrist|0|0|0|0|—|—|—|2.73|REFERENCE_FRAME_UNKNOWN|
|R6-24|LEFT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-25|LEFT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-26|RIGHT upperArm|60|25|30|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-27|RIGHT lowerArm|90|135|60|ABSTAIN|—|—|—|114.44|REFERENCE_FRAME_UNKNOWN|
|R6-28|RIGHT wrist|0|10|10|10|—|—|—|24.44|REFERENCE_FRAME_UNKNOWN|
|R6-29|RIGHT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-30|RIGHT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-31|RIGHT upperArm|60|45|70|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-32|RIGHT lowerArm|90|60|45|ABSTAIN|—|—|—|158.20|REFERENCE_FRAME_UNKNOWN|
|R6-33|RIGHT wrist|0|-10|10|ABSTAIN|—|—|—|13.24|REFERENCE_FRAME_UNKNOWN|
|R6-34|RIGHT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-35|RIGHT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-36|LEFT upperArm|10|90|15|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-37|LEFT lowerArm|90|180|90|ABSTAIN|—|—|—|148.84|REFERENCE_FRAME_UNKNOWN|
|R6-38|LEFT wrist|0|0|0|0|—|—|—|8.33|REFERENCE_FRAME_UNKNOWN|
|R6-39|LEFT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-40|LEFT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|

[legacy-40-before-after.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/legacy-40-before-after.json) / [legacy-40-before-after.csv](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/legacy-40-before-after.csv) include unchanged originals, signed/absolute errors, provenance and replay limitations.

## Post-report final verification

Dates 2026-10-19 / 1405-07-27; UTC 2026-10-19T07:35:03.937Z.57 scoped integrity/redaction/security checks PASS; this is not anatomical acceptance. Live PID/entrypoint/API artifact hashes/index remained identical to the before-task read-only observation. Public/local health and login/assets again200. No live deployment/restart occurred.

No native callable Debug or Chrome DevTools tool was in the available inventory. Installed Debug entry/diagnosing/TDD skills were read and applied. Actual tools: PowerShell, Node, Prisma/MariaDB, Playwright/Chrome, sharp, image inspection, Poppler and official web sources. No installed WebKit executable was present; NOT_RUN. Evidence: C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/final-integrity-security-check.json and C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/webkit-availability.json.
