# Frontend delivery checkpoint

STAGE_03_STATUS: PASS

The existing React/TypeScript/Vite structure and RTL design system remain in use. Account image consent is independently default-false, version V2 identifies Arvan and presents purpose/data/retention/deletion disclosure before the checkbox. General terms retain their separate existing version. Prior V1 receipts do not silently renew.

Authenticated photo owners can issue and revoke scoped grants in account settings. Uploaders choose their own image or a received owner grant before file selection; the backend remains authoritative. No repeated processing-consent dialog is added at upload. Loading, expired/missing grant and account-consent states prevent client dispatch. Tenant/user changes reload/reset scoped grant data, and selection changes cancel stale image analysis.

The actual deployed frontend baseline retained an additional job/task-length check inside the image dispatch function despite its upload-triggered queue. The release candidate explicitly removes this image-only precondition. Text-only analysis retains its activity requirements. Optional inference request identifiers are kept in the response cache; BOTH's existing side-by-side request behavior remains.

## Evidence

- Working frontend typecheck and production build: PASS.
- Working focused consent/ownership/queue/card tests: 46 PASS; backend version-alignment integration assertion explicitly deferred to Stage06 and retained in source.
- Existing UI rules and localized copy: 113 PASS.
- Isolated release-candidate focused suite: 159 PASS; 1 integration assertion deferred until backend backport.
- Candidate typecheck and production build: PASS.
- `reports/evidence/rula-direct-consent-20261022-01/frontend-validation.json`.
- `frontend-backport.json`: nine existing files changed, six added, 203 existing source files preserved, none removed.
- `frontend-working-hunks.patch`: focused changes over the working-tree baseline; existing unrelated edits were not exported.

## Release constraints

Preserve the active production global CSS and apply only the scoped consent/ownership rules from this patch as a separate versioned supplement. No unrelated FMEA, shell, logo, typography or layout change is authorized. The browser regression must exercise actual image upload before job/task completion, rather than only the automatic-mode helper. Actual provider calls and public activation are not claimed by this frontend checkpoint.
