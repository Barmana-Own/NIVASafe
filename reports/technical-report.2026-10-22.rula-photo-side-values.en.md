# RULA photo and side values — technical report

| Project | Report | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | Technical | English | 2026-10-22 | 1405-07-30 | release-rula-photo-side-values-20261022-01 |

## Scope and result

The existing RULA review controls now show supported provisional angles, detected status and suggested scores before manual confirmation. Each selected photo and anatomical side keeps its own observations and force/muscle-use values through selection, edits, save and reopen. Existing side tabs control the existing adjustment fields. The preliminary summary uses only usable observations; human review and final-status restrictions remain enforced. No new product control, label, section, layout or stylesheet was added.

## Root causes and implementation

- Supported AI suggestions were hidden behind full manual review completion; visibility and approval are now separate predicates.
- Force and muscle-use were captured from shared component state; each single-side observation now accepts validated optional adjustments and anatomical provenance, with legacy fallback retained.
- A completed saved-photo batch could select an earlier image; completions now respect the selected photo reference and preserve manual edits.
- New-photo requests omitted structured activity context in the deployed baseline; it is included, and later context edits update deterministic suggestions without another paid image request.
- Local-pose prompt wording permitted flat camera context while the parser read nested geometry only. The prompt now specifies exact nesting; correctly typed same-side flat cues remain compatible without borrowing another side or weakening geometry audit.

## QA repairs and retained evidence

Partial historical BOTH-side snapshots now hydrate each existing side from its own explicit values or the original per-photo scalar fallback before RIGHT publication. This prevents missing LEFT modifiers inheriting RIGHT after selection or save/reopen. Undetected qualitative claims remain hidden, and supported provisional rows show actual detected status while review remains pending.

The initial backend test attempt passed 845/849; four failures were missing read-only deployment/probe fixture files in the isolated snapshot. Exact unchanged fixtures were restored from the prior frozen release. The next frontend attempt passed 505/509; three RULA source-spelling test cases tracked superseded global setters and one prior sidebar assertion tracked a superseded collapsed prop. Six exact assertions were updated with stronger side/state/mobile preservation checks; no runtime code was changed to satisfy these spellings and no test was removed. The complete suites were rerun. A separate contract audit initially used the internal inference schema on a wire response containing the durable-result UUID; it now validates the actual strict wire schema plus required UUID, and passed 81 responses/12 image observations. That initial audit failure is retained in contract-audit-attempt-01.json. Original evidence remains under attempt-01-missing-contract-fixtures/ and attempt-02-contract-and-partial-snapshot-repair/.

## Contracts and data integrity

Image response: sides.LEFT or RIGHT.adjustments?:{force?:integer0..3,muscleUse?:boolean}. Persisted single observation: adjustments?:{force:integer0..3,muscleUse:boolean}, bodySide?:LEFT|RIGHT. Existing snapshots without these keys retain their original fallback behavior. The server independently scores each side of each photo and selects the worst whole observation; it does not combine unrelated body parts. Added provenance mismatches fail validation. No database schema, migration, dependency, authentication or authorization change was introduced.

## Verification

| Check | Result |
|---|---|
| Backend unit / API / contract regression suites | PASS — 849/849, pending 0 |
| Frontend unit / rendering / contract regression suites | PASS — 510/510, pending 0 |
| Shared domain tests and build | PASS |
| Frontend and backend typecheck / lint / production build | PASS |
| Prisma schema validation | PASS; schema and migrations unchanged |
| Strict built backend contracts on browser inference/save payloads | PASS — 81 responses, 12 image observations |
| Isolated actual-page browser scenarios | PASS — 17 |
| Public index/assets, API health and unauthenticated denial smoke | PASS |
| Independent scoped security / preservation review | PASS |
| New live customer image / external AI transfer | NOT_RUN — synthetic fixtures used; no customer image transferred |
| Clean database migration / whole-project security certification | NOT_RUN — no migration; outside scoped maintenance verification |

## Limits and reference

A still image cannot establish load weight, repetition rate or hold duration. Suggestions use only sufficient explicitly entered activity facts: a hold longer than 60 seconds supports muscleUse=true, a load above 10 kg supports force 3, a static 2–10 kg load supports force 2, and explicit zero load supports force 0. Unknown facts do not generate new claims; existing saved/manual values are preserved. Symmetric postures may produce equal independent results. Hidden or conflicting joints, wrist rotation and unsupported camera views continue to require review; this release does not certify anatomical accuracy.

Context derivation follows the [Cornell RULA worksheet](https://www.ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf). Browser input images/accounts/records are generated synthetic fixtures; all external browser requests are blocked. No production account, consent, assessment, upload or database data was modified for verification. Tests are code/contract evidence and do not measure clinical or anatomical model accuracy.

## Release, preservation and rollback

Release release-rula-photo-side-values-20261022-01; browser entry /assets/index-B64rjN8v.js. All 804 prior non-index assets and all 14 stylesheet links are preserved. Backend modules changed: modules/assessments.js, rula-adjustments.js, rula-posture-ai.js, rula-posture.js, rula-report.js. Private environment, proxy, worker/model and existing data paths are preserved. Deployment changes the managed API executable/version and the frontend module URL. No database migration ran. To revert, restore the verified index/configuration backup from C:/ProgramData/NIVASafe/backups/release-rula-photo-side-values-20261022-01 and restart the previous managed API release; retain immutable assets and user data. The release helper attempts both local rollback layers independently.

## Scoped workflow

| Stage | Status | Evidence |
|---|---|---|
| 01 | PASS | Repository baseline, user scope and failure mechanisms inspected. |
| 02 | PASS | Existing UI/control inventory reused; new UI excluded. |
| 03 | PASS | Photo/side state, provisional visibility and contextual adjustment binding implemented. |
| 04 | PASS | Backend context suggestions, side provenance and geometry response contract implemented. |
| 05 | PASS | Existing JSON persistence reused; schema/migration changes not applicable. |
| 06 | PASS | Additive optional JSON contracts, legacy fallback, save/reopen browser flow and API tests verified. |
| 07 | PASS | Existing authentication/tenant/consent/subject authorization retained; denial tests and public401smoke verified. |
| 08 | PASS | Scoped independent security and release-helper review; in-scope defects fixed. |
| 09 | PASS | Domain/frontend/backend suites and new regressions passed. |
| 10 | PASS | Isolated actual-page browser matrix and live read-only smoke passed. |
| 11 | PASS | Immutable backend/frontend artifacts deployed; rollback retained; no migration or data mutation. |
| 12 | PASS | Independent final source/artifact/evidence and preservation review passed. |

## Evidence inventory

Evidence directory: reports/evidence/rula-photo-side-values-20261022-01/. Authoritative candidate.json, build-validation.json, e2e-validation.json, security-review.json, deployment.json and live-ui.json are hash bound. Baseline browser failures are retained as regression evidence. Unrelated root working-tree changes were excluded through a frozen prior release baseline. No full-product readiness claim supersedes historical limitations.
