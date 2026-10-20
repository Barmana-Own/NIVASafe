# RULA report image filename visibility

The explicit request removes image filenames from the evaluation table display. Desktop image headings and mobile image detail metadata now show side and RULA result without the original filename. Image snapshots, scores, row count, side labels, stage-two image selection and stored filenames are preserved.

Validation: 214 frontend tests/34 files PASS; lint/typecheck/build PASS. Regression assertions verify filenames (including script-like names) are absent while per-image scores and LEFT/RIGHT labels remain. No API, authorization, persistence or schema changes. React escaping and existing permission boundaries are preserved. Frontend-only PWA v49; rollback and production health/asset evidence are recorded in project-state.json.
