# RULA photo and side values — customer report

| Project | Report | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | Customer | English | 2026-10-22 | 1405-07-30 | release-rula-photo-side-values-20261022-01 |

## Delivered behavior

The existing RULA review controls now show supported provisional angles, detected status and suggested scores before manual confirmation. Each selected photo and anatomical side keeps its own observations and force/muscle-use values through selection, edits, save and reopen. Existing side tabs control the existing adjustment fields. The preliminary summary uses only usable observations; human review and final-status restrictions remain enforced. No new product control, label, section, layout or stylesheet was added.

## Quality and release

The frontend and backend were deployed together after 849 backend tests, 510 frontend tests, shared-domain checks and 17 isolated actual-page browser scenarios passed. Typecheck, lint, production builds, schema validation, public asset bytes, API health and protected-route denial checks passed. Four-photo/single-side/bilateral selection, manual values, late responses and save/reopen were covered with synthetic data.

## Practical limits

A still image cannot establish load weight, repetition rate or hold duration. Suggestions use only sufficient explicitly entered activity facts: a hold longer than 60 seconds supports muscleUse=true, a load above 10 kg supports force 3, a static 2–10 kg load supports force 2, and explicit zero load supports force 0. Unknown facts do not generate new claims; existing saved/manual values are preserved. Symmetric postures may produce equal independent results. Hidden or conflicting joints, wrist rotation and unsupported camera views continue to require review; this release does not certify anatomical accuracy.

No live customer image was sent to an AI provider during verification. The existing design and data remain preserved. The independent final evidence gate passed for this scoped correction.
