# NIVASafe — RULA anatomical recovery and final acceptance evidence

|Field|Value|
|---|---|
|Project|NIVASafe|
|Report|Technical report|
|Language|English|
|Gregorian / Jalali|2026-10-18 / 1405-07-26|
|UTC|2026-10-18T21:46:45.378Z|
|Revision|e5bf3f050bd6e127e13918c8d3eefcd3f8376acf + preserved worktree|
|Executed candidate|rula-image-plane-audit-20261018-r7-final; PID 8300|
|Delivery|BLOCKED / NOT DEPLOYED|

**SOURCE SAFETY VERIFIED / STAGING CORE E2E PASS / ACCURACY FAIL / NOT DEPLOYED / LIVE VISION DISABLED.**

## Scope and observed causes

R6 originals are frozen under frozen-r6-* and frozen-40-comparisons.json. These 40 rows are four inference samples of one 1000×700 two-panel synthetic drawing. Exact coordinates are from the preserved make-reference.ps1, not GPT output. Head/neck is a drawing-axis proxy, not a professionally validated cervical measurement. No labels were changed or difficult cases removed.

All 10 old large angle errors arose in model-derived degrees accepted without anatomical/landmark consistency checks. Stored high-confidence overlays also miss the actual joints. R6-02: elbow reference 90°, model 180°, old overlay geometry 154.983°. R6-37: model 180° while overlay geometry 25.017°. This disproves a single universal mirror/supplement correction. The old parser passed degree values through; no radians/vector transform produced those values. PNG EXIF rotation was not involved. **The exact internal model reasoning remains UNKNOWN.** Complete per-row signed errors, camera projection, visibility, landmark availability and pixel errors are in forensic-40.json/.md.

A separate real canary correctly read randomly generated digits/circles/triangle, request03d3849e93d8ef056d9787d5ef24e1db. It supports image transport/recognition for that control, not anatomical reasoning or all gateway behavior. Credentials/entitlement are not diagnosed as the remaining problem.

## Implemented architecture and safeguards

1. Validate auth/tenant/role, file signature/MIME, explicit consent and approved provider gates. Decode only PNG/JPEG/WebP with10 MiB input/output bounds,24M decoded pixels, bounded dimensions/time. sharp0.35.5 auto-orients and strips metadata. JPEG orientation6 was analytically tested40×20→20×40. This addresses a separate risk, not the original PNG cause.
2. Keep RULA/FMEA on Arvan GPT-5-Mini and chat on Arvan DeepSeek-V4-Flash. RULA image detail is high. Existing reasoning_effort omission and no fallback remain. No real FMEA/chat test was repeated and no model-substitution claim is made.
3. Validate named, normalized coordinates, side, view, facing, upright reference, visibility/confidence. Reject duplicate/unknown points, null visible coordinates, missing fields, invalid ranges/types, side mixing and malformed/truncated JSON with safe codes. Valid uncertainty is distinct from parsing failure.
4. Convert normalized X/Y back to pixels before deterministic vectors/angles. Signed arm/trunk/head-axis conventions, interior elbow, wrist deviation, mirror/rotation, coincident vectors and unsuitable views have analytic checks. Axial wrist twist/depth are not inferred from a2D line.
5. A final review found the prompt requested neck tilt from upright while the auditor used an upper-trunk reference. That newly exposed contract inconsistency was fixed and test-first verified. The defined neck value is explicitly only a relative head-axis image-plane proxy; RULA thresholds/tables were not redefined. It is **not** presented as the historical elbow90° cause.
6. The unreliable VLM landmark strategy was **not adopted as an automatic replacement measurement source**. Geometry audits internal consistency; agreement is not independent truth. Disagreement/missing evidence withholds the model angle, not an invented correction. No180-angle/clamp heuristic was used to force the benchmark.
7. Existing JSON retains typed pre-audit AI angle, mapped provisional score, geometric audit angle, dimensions/view/required points, controlled reason and image-plane-audit-v1. Reviewer values/source USER remain separate; RulaVersion/audit records actors/versions. This is retained application provenance, not cryptographic tamper proof against a malicious authorized author.
8. New image observations require explicit review. Real400/zero-row tests reject confirmation-only of a conflicted AI row or omitted/false requiresReview. Draft score indices remain provisional and hidden until review; no unreviewed/failure score is presented as a final posture assessment. An intentional manual acknowledgement is not an ergonomist certification.
9. The actual browser screenshot exposed free-form provider prose that contradicted withheld table values. Its image-UI paragraph was removed; API notes/text analysis remain compatible and controlled per-part warnings remain. Final real BOTH UI verified provider notes present but not displayed.

## Accuracy and independent references

|Metric|Frozen R6|Final raw model|Final published output|
|---|---:|---:|---:|
|Unchanged original denominator|40|40|40|
|Numeric estimates|40|40|21|
|Within ±15°|30/40|31/40|21/40|
|Abstentions|0|0|19|
|MAE, numeric estimates only|16.5°|12.7°|1.1905°|
|Median, numeric estimates only|0°|0°|0°|
|Max, numeric estimates only|90°|90°|10°|

All 40 references remain. Only21 numeric outputs were published;19 abstentions do not count as successes. The defined 2D drawing references are geometrically measurable, so intrinsic2D-unmeasurability count is0. The guard withheld9 wrong raw estimates and10 raw estimates already inside tolerance. The lower numeric-only error is selective coverage, not acceptance of the original task. Raw31/40 versus old30/40 is a small change on repeated samples, with the90° outlier still present. No clinically validated accuracy claim is made.

|Part|Numeric within ±15° / original|Numeric|Abstentions|
|---|---:|---:|---:|
|upperArm|0/8|0|8|
|lowerArm|0/8|0|8|
|wrist|5/8|5|3|
|neck|8/8|8|0|
|trunk|8/8|8|0|

Per-side numbers are in accuracy-metrics.final.json. Base table-band mapping is consistent for21/21 published numeric rows, but only18/40 original base-score categories match the known drawing references. Even an angle within15° can cross a score boundary. Complete independently verified final RULA reference scores:0, because axial rotation/load/modifiers are unestablished. Final-score agreement is NOT_VERIFIED, not100%. Cornell2001 tables/thresholds and legacy-average compatibility were preserved;19 domain tests pass.

Fourteen mathematical cases /70 checks plus10 direct geometry tests cover neutral/flexed/extended/raised/left/asymmetric/mirrored/scaled/rotated, missing/occluded/frontal/oblique/unknown frames. They verify geometry with supplied coordinates, not VLM accuracy on workers. Earlier pre-axis real bilateral/occluded controls are in accuracy-metrics.before-axis-alignment.json and original primary evidence; they are supplementary. The final two controls received local503 before upstream because the seven-call harness budget had been consumed by five image calls and two automatic RULA report text calls. They were not retried or marked PASS. This is a test-budget result, not Arvan401, account quota, or proof that ambiguity handling passed real inference on the final prompt.

## Every original40 rows

|ID|Side / part|Reference°|R6 old°|Final° / abstention|Old abs error°|Final abs error°|Review state|
|---|---|---:|---:|---|---:|---:|---|
|R6-01|LEFT / upperArm|10|90|ABSTAIN|80|—|CONFLICT; REQUIRED|
|R6-02|LEFT / lowerArm|90|180|ABSTAIN|90|—|CONFLICT; REQUIRED|
|R6-03|LEFT / wrist|0|0|5|0|5|ESTIMATED; REQUIRED|
|R6-04|LEFT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-05|LEFT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-06|RIGHT / upperArm|60|30|ABSTAIN|30|—|CONFLICT; REQUIRED|
|R6-07|RIGHT / lowerArm|90|60|ABSTAIN|30|—|CONFLICT; REQUIRED|
|R6-08|RIGHT / wrist|0|10|10|10|10|ESTIMATED; REQUIRED|
|R6-09|RIGHT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-10|RIGHT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-11|LEFT / upperArm|10|20|ABSTAIN|10|—|CONFLICT; REQUIRED|
|R6-12|LEFT / lowerArm|90|160|ABSTAIN|70|—|CONFLICT; REQUIRED|
|R6-13|LEFT / wrist|0|0|ABSTAIN|0|—|UNMEASURABLE; REQUIRED|
|R6-14|LEFT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-15|LEFT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-16|RIGHT / upperArm|60|70|ABSTAIN|10|—|CONFLICT; REQUIRED|
|R6-17|RIGHT / lowerArm|90|90|ABSTAIN|0|—|CONFLICT; REQUIRED|
|R6-18|RIGHT / wrist|0|5|ABSTAIN|5|—|UNMEASURABLE; REQUIRED|
|R6-19|RIGHT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-20|RIGHT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-21|LEFT / upperArm|10|0|ABSTAIN|10|—|CONFLICT; REQUIRED|
|R6-22|LEFT / lowerArm|90|90|ABSTAIN|0|—|CONFLICT; REQUIRED|
|R6-23|LEFT / wrist|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-24|LEFT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-25|LEFT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-26|RIGHT / upperArm|60|25|ABSTAIN|35|—|CONFLICT; REQUIRED|
|R6-27|RIGHT / lowerArm|90|135|ABSTAIN|45|—|CONFLICT; REQUIRED|
|R6-28|RIGHT / wrist|0|10|10|10|10|ESTIMATED; REQUIRED|
|R6-29|RIGHT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-30|RIGHT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-31|RIGHT / upperArm|60|45|ABSTAIN|15|—|CONFLICT; REQUIRED|
|R6-32|RIGHT / lowerArm|90|60|ABSTAIN|30|—|CONFLICT; REQUIRED|
|R6-33|RIGHT / wrist|0|-10|ABSTAIN|10|—|CONFLICT; REQUIRED|
|R6-34|RIGHT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-35|RIGHT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-36|LEFT / upperArm|10|90|ABSTAIN|80|—|CONFLICT; REQUIRED|
|R6-37|LEFT / lowerArm|90|180|ABSTAIN|90|—|CONFLICT; REQUIRED|
|R6-38|LEFT / wrist|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-39|LEFT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-40|LEFT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|


## Executed candidate, provider and persistence

Marker **rula-image-plane-audit-20261018-r7-final**, actual PID8300, identity **SRV9298144857\Administrator**, entrypoint **C:\NIVASafe\.local\rula-final-candidate-20261017-053748\backend\dist\server.js**. API5153, frontend15144, disposable MariaDB53306, exact datadir C:\NIVASafe\.local\rula-authenticated-e2e-20261017-01\mariadb\data verified before writes. Separate DB/org/accounts/JWT/uploads; existing generated Prisma6.19.3 reused. Disposable db push --skip-generate used no data-loss flag and was not historical migration replay. No live schema/checksum edit occurred.

Final component hashes: provider 04FCEBB35D6C54B3E83043FECDCB98A1E94EEF61FD2C8FA897E5A7C206D407BC; posture F45BB530E3B5FE3ECBF5B8391199D42DC9CC92DCECBBDE366E9E6D624D78623C; geometry EE24713F1C3C7CA5A6CEC0C9C7DF92D54D9B4F55682D4830B6403E2189A8FC3A. server.js alone is not a build identity. Source/candidate parity and all final asset hashes are recorded. No application source changed after this final run.

Across this task **19 real calls** were accepted, all requested GPT-5-Mini and returned gpt-5-mini-2025-08-07:12 initial differential/UI/control calls plus7 final calls (5 images,2 RULA report text suggestions). All upstream200. The final three BOTH submissions and browser's independent RIGHT/LEFT completed with no observed application502, then normal-user review/save, fresh GET, logout/login/reopen/report/PDF passed. Safe request IDs/times/PIDs are in real-provider-requests.final.json. Historical401/internal502 attribution remains unknown; no unsupported model or fallback was used in these recorded calls. No inference about other Arvan account consumers is made.

Final stored metadata was compared with the actual inference response after manual edits. Only MariaDB last-digit geometry serialization was allowed<1e-10 in persistence equality; original ±15° grading was unchanged. Four final records preserve14-part AI/audit metadata alongside USER edits. Fresh ordinary-user report JSON and English/Persian PDF200 were verified with provider disabled. PDFs are synthetic-reviewed-report.final.en.pdf/.fa.pdf; manual reference correction proves mechanics, not AI accuracy.

Real Chrome155.0.8059.80 via Playwright Core1.64.1 executed final upload/consent/BOTH/14 edits/save/reload/fresh login at390/1280, without API/provider mocks. No page exceptions or whole-document overflow. Safari/WebKit/iOS and authenticated Persian RTL browser: NOT_RUN. Persian PDFs were checked separately. A provider-free real browser checked503 privacy-gate error, explicit manual retry and zero new assessments.

## Commands and failures retained

|Actual command/check|Exit / result|
|---|---|
|pnpm10.13.1, Node22.22.3|Pinned process PATH; no global change|
|pnpm exec turbo build --force; final api build / web build|0; fresh artifacts, no cached result accepted|
|pnpm exec turbo lint --force / typecheck --force|0 /0; lint is TypeScript, not ESLint|
|pnpm exec turbo test --force|0;541 backend +348 frontend +19 domain =908|
|pnpm verify:contract / verify:release|0 /0;90 frontend paths,154 routes;29 checks|
|pnpm audit --prod --json|0; zero candidate production advisories|
|Final run-candidate-e2e.mjs, max7 provider attempts|1 overall: core40 comparisons/UI/persistence passed; two supplemental controls were locally budget-blocked503|
|verify-final-provenance.mjs, AI disabled|0; real stored records/fresh session/report/PDF/review denial, zero provider calls|
|Poppler / pypdf PDF inspection|0; final PDFs: 6 pages each; Persian first-page and English data-table renders inspected; no Safari pass|

Initial red geometry/parser/normalization/high-detail/frame tests and subsequent green results are preserved. Early copy/sync commands used the wrong cwd and were corrected to absolute paths. Isolated pnpm install hit ERR_PNPM_UNEXPECTED_STORE and was corrected with the existing store-dir, without global config/ACL changes. The lock-only source command updated package metadata; active packaged runtime dependencies were not replaced.

The first browser attempt passed waitForFunction timeout as its argument, leaving15s while the second side took~22s; only browser coverage was rerun after fixing it. Persistence verification was corrected for unordered DB rows and insignificant JSON float serialization. A reused attachment correctly produced RULA_IMAGE_UPLOAD_ORDER before the minimal review-denial check; an empty logout test's incorrect JSON content-type was removed. These were harness issues, not accepted authorization bypasses. Original failures remain available. Vite's existing>500kB warning remains.

## Security, preservation and release

Reviewed upload/decode bounds, gateway/model restrictions, auth/tenant/consent/quota, parsed output, review mutation, exports, error/log redaction and metadata retention. No new debug endpoint, security bypass, secret logging, arbitrary outbound URL, ACL/firewall change or production mock was added. Normal staged denials401/403/415 and review400 passed. Candidate dependency audit is zero findings; no full audit of the older running release is claimed. Model confidence is uncalibrated, and paid-request concurrent coalescing is not independently certified.

460 prior Git entries were recorded. Existing navigation, support, FMEA/chat rules, data, uploads and historical scoring remain; broad git diff is not attribution to this task. Root/candidate schema hashes match. Exact task paths:

|Path relative to C:\NIVASafe|Task change|
|---|---|
|backend/src/ai-provider.ts|RULA-only high image detail; existing model/reasoning compatibility retained|
|backend/src/ai-provider.test.ts|High-detail request regression|
|backend/src/rula-posture-ai.ts|Strict landmark schema, frame-aligned prompt, deterministic consistency audit|
|backend/src/rula-geometry.ts|Pixel-aware vectors, unsigned/signed angles, view/visibility/degeneracy states|
|backend/src/rula-measurement.ts|Bounded provenance and explicit review resolution|
|backend/src/rula-image-normalization.ts|EXIF normalization, metadata stripping, bounded raster decode|
|backend/src/rula-posture.ts|Optional JSON metadata and conflict-review enforcement|
|backend/src/modules/assessments.ts|Image normalization and actual-dimension context|
|backend/src/modules/reports.ts|Controlled RULA per-part export uncertainty|
|backend/src/rula-geometry.test.ts|10 vector/frame/edge tests|
|backend/src/rula-geometry-reference.test.ts|70 independent reference tests|
|backend/src/rula-image-measurement.test.ts|13 schema/frame/uncertainty tests|
|backend/src/rula-image-normalization.test.ts|2 decode/EXIF resource tests|
|backend/src/rula-measurement-report.test.ts|1 export uncertainty regression|
|backend/src/rula-posture.test.ts|Provenance/review schema regression|
|backend/src/rula-registered-member.test.ts|Actual-route normalization and review-denial regressions|
|frontend/src/features/assessments/AssessmentPages.tsx|Retain AI metadata across edits, localized controlled warnings, suppress contradictory image prose|
|frontend/src/features/assessments/rulaMeasurement.ts|Bounded typed metadata and localized labels|
|frontend/src/features/assessments/rulaMeasurement.test.ts|3 metadata/review tests|
|frontend/src/features/assessments/rulaPostureReview.ts|Confirmation alone cannot resolve an AI conflict|
|backend/test-fixtures/rula-geometry/|reference-cases.json; provider-reference.json; independent-bilateral.png; occluded-right.png|
|backend/package.json|sharp0.35.5|
|pnpm-lock.yaml|Decoder lock entries; pre-existing package changes preserved|
|docs/rula-image-plane-accuracy-r7.md|Scoped architecture and evidence handoff|
|project-state.json|Append R7 result; INCOMPLETE remains|
|project-integrity-manifest.md|Append preservation review|

Live remains PID14048, NT AUTHORITY\SYSTEM, existing NIVASafe-API scheduled task / PM2 nivasafe-api, C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js; static C:\inetpub\nivasafe\app-com. Public/local health, public login/assets200. Public JS index-C58TrXm0.js SHA2B4F0C30678C311D30F4E0BDD67EBEFB12DA8BB6D1A12CC16A82C65B88094A17 and index E1C893E440F8B769CB2E119C47D7D682BCD9DB092C0F4FD581A097B830885ED9 remain old. The old provider SHA8784D5C1124B8E727ED33E73E546DA92A0C91243671C89EE521EC67744206FCF differs from the candidate; prior R6 evidence records alternative RULA model paths in it. No account-usage attribution beyond actual request evidence is implied.

Production image approval/capability keys did not match/be present in inspected file/PM2 configuration. No legitimate policy approval was invented. **NOT DEPLOYED**: accuracy FAIL is the primary gate; lawful production image approval and operational service/config rollback remain unverified. No migration is needed for these additive JSON/code fields; migration drift is not used to explain vision errors or gate code-only work unnecessarily. No live restart, static swap, DB/data/account/config/provider-key/upload change occurred.

Candidate reconstruction: C:\NIVASafe\.local\rula-anatomy-20261018-r7\artifact-snapshot-final; rehearsal C:\NIVASafe\.local\rula-anatomy-20261018-r7\artifact-rehearsal-final;119 file hashes and asset references match. This is candidate file recovery, **not** protected live config backup/service rollback. Dependencies remain in the isolated install. A future live cutover needs the actual active release/config snapshot in protected storage and an operational component rollback; never roll back newer user data for a code-only release.

## Remaining work / stage gate

Automatic joint localization and measurement still fail the required target. A validated landmark source and representative, independently annotated/ergonomist-reviewed images are needed; the generative model contract must remain unchanged. No key rotation, entitlement purchase, Defender/ACL/firewall change is justified. Additional final real ambiguous/nonzero-trunk controls remain unrun after the bounded budget. Production privacy authorization is a separate owner policy action, not a substitute for measurement accuracy. No Windows operator access action is needed to reproduce this checkpoint.

Existing architecture stages01–08 were reused with scoped repairs;09 tests PASS;10 accuracy FAIL;11 publication BLOCKED;12 release acceptance NOT_PASSED. Project remains INCOMPLETE.

## Acceptance matrix

|ID|Requirement|Status|Evidence under reports/evidence/rula-anatomy-2026-10-18-r7|Limit / blocker|
|---|---|---|---|---|
|M01|Original 40-case references and baseline preserved|PASS|frozen-40-comparisons.json; frozen-r6-reference-geometry.png|Four repeats of one drawing, not40 different postures|
|M02|Original error provenance / exact internal VLM cause|PARTIAL|forensic-40.json / .md|Model-derived wrong angles/bad points confirmed; internal model reasoning UNKNOWN|
|M03|Independent deterministic geometry|PASS|independent-geometry-tests.log; neck-axis-green.log|14 analytic cases,70 checks +10 vector/frame tests; not3D anatomy|
|M04|≥38/40 numeric anatomical target|FAIL|accuracy-metrics.final.json; before-after-40.final.md|21/40 numeric successes;19 abstentions; raw maximum90°|
|M05|True pose/cervical accuracy and complete reference scores|NOT_VERIFIED|Reference notes; accuracy-metrics.final.json|No qualified ergonomist or independently verified full modifiers/twist|
|M06|Authenticated real RIGHT/LEFT/BOTH, repeated BOTH|PASS|final-candidate-e2e.json|Three BOTH API samples plus browser independent sides; technical pass only|
|M07|Final nonzero-trunk / occluded real-provider controls|NOT_RUN|final-candidate-e2e.json → independentBenchmarks|2 local503s from test budget before upstream; earlier controls are supplementary older-prompt evidence|
|M08|Genuine Arvan model acceptance|PASS|real-provider-requests.final.json|19 accepted real calls; all GPT-5-Mini snapshot; accuracy is separate|
|M09|Human review / no automatic invented correction|PASS|persistence-provenance.final.json|Actual400 confirmation-only denial; source USER review required; no clinical certification|
|M10|RULA scoring rules and old-version compatibility|PASS|axis-final-test.log; unchanged shared/domain|Mapping 21/21; base-category GT agreement 18/40, not full score certification|
|M11|DB save/fresh GET/logout/login/reopen/report/PDF|PASS|final-candidate-e2e.json; persistence-provenance.final.json|Manual synthetic-reference correction is not AI accuracy|
|M12|Real final Chromium UI,390/1280|PASS|screenshots/final-candidate-*; final-candidate-e2e.json|No intercept mocks; Safari/WebKit/iOS not run|
|M13|Contradictory raw narrative hidden|PASS|Browser check unvalidated-ai-narrative-not-rendered|Provider prose present in response but not displayed; structured warnings retained|
|M14|Persian RTL browser / Safari/WebKit/iOS|NOT_RUN|No such browser acceptance claimed|Persian PDF inspected separately|
|M15|Build/lint/typecheck/tests|PASS|axis-final-exits.json; neck-axis-final-build.log|541 backend +348 frontend +19 domain =908; lint is TypeScript|
|M16|Contract / static release checks|PASS|contract.log; release.log|90 paths /154 routes;29 static checks|
|M17|Scoped security/dependency review|PASS|audit-prod.json; review in this report|Zero candidate production advisories; older live runtime not certified|
|M18|Candidate file recovery|PASS|artifact-recovery.final.json|119 files/asset references reconstructed; not live config/service rollback|
|M19|Live code release / operational rollback|BLOCKED|live-runtime-readonly.json; public-readonly.json|Accuracy FAIL; legitimate privacy approval absent; operational rollback not rehearsed|
|M20|Production vision legitimately enabled|BLOCKED|live-runtime-readonly.json → imageGates|No policy authorization invented; gates remain closed|
|M21|Authenticated public image-to-report|NOT_RUN|No live mutation/image/provider request made|NOT DEPLOYED|
|M22|Preserve non-RULA features/data|PASS|Scoped changes; contract/regression logs|No new public support/chat/FMEA acceptance claimed; no production changes|

## Tools and primary references

Debug entry/diagnosis/TDD skills were used; no native Debug/Chrome DevTools callable tools existed. Actual tools: PowerShell/exec_command, Node fetch/process/files, Prisma/MariaDB CLI, pinned pnpm/Vitest/TypeScript/Turbo, installed Chrome through Playwright Core, view_image, PDF skill/Poppler/pypdf and primary-source web reads. Codex's model is separate from NIVASafe's outbound models. No native plugin/Safari execution is claimed.

[Cornell worksheet](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf), [Cornell notes](https://ergo.human.cornell.edu/ahRULA.html), [sharp orientation](https://sharp.pixelplumbing.com/api-operation/), [sharp decoder limits](https://sharp.pixelplumbing.com/api-constructor/). These support rules/version and decoder behavior, not model accuracy.
