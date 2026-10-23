# RULA review population maintenance

Release: `release-rula-review-population-20261023-01`

## Scope and requirements

| ID | Observable requirement |
|---|---|
| FR-01 | A completed AI observation displays the real advisory angle/score that the model supplied for that image and anatomical side; an abstention never becomes a measured normal value. |
| FR-02 | Completed AI rows do not claim that image analysis or manual review is still waiting. The existing measurement-quality explanation and edit action remain visible. |
| FR-03 | Group A and B show their available provisional results independently. The initial summary describes partial completion when a complete numerical score is unsupported. |
| FR-04 | Force and muscle-use controls receive supported response/activity values separately for each image and side; a photograph alone cannot establish load or repetition. |
| FR-05 | Both existing review tables have visible cell separators, compact unbroken labels and bounded horizontal scrolling on narrow screens. |
| NFR-01 | Preserve all existing consent, tenant authorization, audited measurements, human confirmation, final approval and persistence validation. |
| NFR-02 | Preserve other pages, routes, controls, prior static assets, schemas, dependencies, integrations, private configuration and business data. |

## Verified failure mechanism

The analysis response lifecycle can finish while independent measurement quality rejects some observations. The backend retains original AI values in measurement metadata but replaces rejected audited values with null/false/1. The review table currently reads only the latter, then labels completed observations as waiting. Every image row requires assessor confirmation. A seven-row availability gate also hides an otherwise supported group when the other group is incomplete. The local pose contract has no cervical landmark, and a still image does not measure axial wrist rotation.

The missing angle/status separator is a directionality defect: the angle cell is LTR inside an RTL table, reversing `border-inline-end`. Fixed narrow columns and anywhere word wrapping split Persian labels.

## Design and architecture decisions

Reuse the existing row, summary, control, dialog and TableRegion components. Display advisory AI values independently from audited/approved values, with the existing quality explanations. Preserve unavailable values when the model abstained. An optional strict boolean records whether the original model actually detected a part before audit; legacy numeric AI angles remain readable. Do not change audited values or approval rules to make a summary appear complete.

Only these two table instances receive compact, no-wrap, scrollable layout rules. Number direction remains LTR, while table structure and Persian content remain RTL. Keep existing edit controls at their current accessible touch size.

## Explicit limitations

Unavailable geometry, missing joints, wrist rotation, load and repetition cannot be fabricated to satisfy a complete-looking form. Partial results must be described as partial. Force and muscle-use suggestions continue to require explicit activity evidence. No anatomical-accuracy certification, whole-product security certification or production inference test is implied by synthetic fixtures.

## Delivery evidence

Status: published; independent final review is recorded in the task evidence. Exact source baselines, stage gates, checks and deployment evidence are maintained in `reports/evidence/rula-review-population-20261023-01/` and the task-specific project state.


## Final verification checkpoint

Gregorian: 2026-10-23; Jalali: 1405-08-01; Release: release-rula-review-population-20261023-01.

Build/type/lint/schema and 858 backend / 527 frontend tests PASS. Browser 10 + deployed 3 PASS; strict wire/observation contracts and 10 compatible rollback checks PASS. All previous 18 stylesheet links retained. API PID 10380; database up. No business data migration or mutation.

Unavailable angles remain unavailable. Force and repetitive-muscle controls continue to receive supported server/activity values; a photograph does not establish load, hold duration or repetition. Existing 0/false form defaults remain when no supported suggestion exists and must not be interpreted as measured AI facts. Quality explanations and human confirmation/final approval remain mandatory where already required. No anatomical-accuracy or whole-product security certification is claimed.

The initial complete frontend run passed 526/527; one pre-existing source-string assertion expected the old result assignment. It was updated to retain anatomical-side selection and require the proposal fallback, while behavioral tests remain authoritative. The first manifest, failed report, source and logs are retained in attempt-01-stale-ui-contract. Backend/domain source inputs were proven identical and the already passing 858 backend tests were reused explicitly; frontend tests, type/lint/schema checks and both builds then passed. Early focused runner/typing assertions were corrected before freezing. Compatibility-build environment failures are retained by rollback-compat.mjs; no production dependency was installed or modified. The first browser run passed 9/10; its English tablet keyboard probe chose the RTL scroll key for an LTR region. The original helper, result and screenshots are preserved under attempt01; a direction-aware forward/reverse keyboard assertion then passed all ten cases without product or CSS changes. Independent preflight also corrected a compatibility inventory field mismatch in the release helper before any deployment.

Restore C:/ProgramData/NIVASafe/backups/release-rula-review-population-20261023-01/index.html atomically and use release-rula-review-population-20261023-01-rollback-compatible for the API. That prebuilt artifact retains the previous behavior and adds only acceptance of optional AI provenance, validated against legacy/new stored inference and observation metadata. A bare old strict binary must not be used after new metadata has been stored; no data stripping or rewriting is required.
