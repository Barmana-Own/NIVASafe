# Files upload controls — 2026-10-22

## Scope and acceptance

Owner-requested maintenance of the existing Files page only: slightly reduce the upload selection box height and offer the existing organization-image picker alongside local file selection. Preserve optional reference, supported local document/video/image types, report navigation, organization file list, preview/download/delete actions, and role boundaries.

## Implementation

- Reuse the existing organization-scoped, authenticated image picker with one image and the existing 10 MiB upload limit. The picker stages a File; only the existing explicit upload action sends the multipart request.
- Keep a single source of selection: choosing an organization image clears the native input; selecting a local file clears the staged organization image. Replace the multipart file field with the staged image before submission.
- Require a native file only when no organization image is staged. Prevent overlapping submissions, disable selection during upload, retain inputs after failure, and reset native/staged selection and the scoped draft after success.
- Scope all added CSS to the Files page upload form. Use a 150 px desktop selection container, existing semantic tokens, 44 px buttons, and stacked controls on small screens. Both real buttons sit outside the native file-input label.

## Preservation and security boundaries

No API, backend, database, dependency, picker implementation, consent, or authorization changes. The server remains authoritative for organization ownership, upload permission, signature/type/size validation, and authenticated file retrieval. All report/list/action source blocks and supported native file types remain intact.

The frozen candidate derives from the verified knowledge-options release, with exactly three changed paths: FilesPage, its scoped stylesheet addition, and the new browser regression suite. Publication retains all prior immutable static files and stylesheet links, publishes only referenced new JavaScript plus the scoped stylesheet, and switches the index atomically with a verified rollback copy. Private environment, API process/configuration and reverse proxy are protected by hashes and process identity checks.

## Validation evidence

Evidence directory: `reports/evidence/files-organization-image-picker-20261022-01/`.

The dedicated six-case isolated browser suite covers organization selection and filtering, exactly one multipart file, duplicate submission prevention, replacement of either selection source, both failure/retry paths, responsive RTL/LTR layouts, cancellation/list failure, and read-only permissions. Browser mutations use synthetic fixtures. Production acceptance is read-only.

This is a scoped frontend maintenance task; rebuilding backend architecture, persistence, authentication, or the entire twelve-stage project is not applicable. Existing project status and unrelated source changes remain preserved. Final validation and publication results are appended only after execution.

## Verified delivery

- Published JavaScript entry: `/assets/index-BU9bVbwJ.js`; scoped stylesheet: `/assets/files-upload-picker-205970d2baab.css`.
- Shared-domain build, 480 frontend unit/source-contract tests, TypeScript typecheck/lint, compilation and production frontend build: PASS.
- All six isolated Chrome browser cases: PASS, zero failed/skipped cases. Tested Persian RTL light layouts at 1280/390 px and English LTR blue at 1024 px.
- First browser attempt: four cases passed; the layout test incorrectly counted a native file input's implicit button role as an actual nested button. A single test locator was corrected; the original manifest/test/failure evidence was retained and all six browser cases rerun. Runtime source and validated production artifacts did not change during this test-only correction.
- Read-only authenticated production acceptance: PASS. Selection box measured 174.2 px before and 150.0 px after; both choices, organization picker, optional reference, reports and file list were verified. No production files were uploaded, replaced or deleted for acceptance.
- Independent scoped security/regression review, immutable artifact/public-byte verification and final preservation review: PASS.
- Backend/database test suites: NOT_RUN_FRONTEND_ONLY_CHANGE. No migrations, backend restart or persistence changes were required. This is not a repository-wide security audit or a new full-stack release.
