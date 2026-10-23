# Owner-requested interface refinements

Date: 2026-10-22. Scope: targeted presentation and corrective-action form repairs in the existing application.

## Acceptance criteria

| ID | Observable behavior |
| --- | --- |
| UI-01 | Hide the pictured RULA image-analysis notice and image-owner selector in the frontend while retaining processing, authorization and consent enforcement. |
| UI-02 | Style the photo-card pencil edit button using the existing design tokens, with visible focus and native disabled behavior. |
| UI-03 | Clear new FMEA and RULA action content, custom selectors and date after confirmed creation; preserve assessment context, failed submissions and duplicate protection. |
| UI-04 | Display corrective actions as responsive cards matching saved assessment surfaces, preserving all existing details, filters, status operations and progress. |

## Implementation boundaries

The active monolithic assessment feature and shared action-card renderer remain in use. Existing APIs, backend code, database schema, provider processing, consent and authorization rules are preserved. No additional product copy, fields, controls, external assets or dependencies are introduced.

The action list needs only scoped CSS because all three registers already share semantic articles. Cards use existing semantic tokens, 16 px gaps and a 10 px border radius. The layout is one column below 960 px, two from 960 px and three from 1440 px. Descriptions and context wrap without truncation. Status and progress remain at the bottom of each card.

Creation forms remount their native and custom controls only after the server confirms success and the scoped draft is cleared. The FMEA risk-row state resets explicitly. Failure and pending submission retain form content. Project and assessment selectors retain the existing context.

## Preservation and publication

The release is assembled from the verified deployed frontend source at `.local/rula-connected-overlay-20261022-01/candidate`. Only approved source replacements and new regression tests may differ. Existing production CSS links and immutable assets are retained; an appended, narrowly scoped stylesheet supplies these presentation changes. The index switches atomically and has a verified previous copy for rollback. Backend processes, environment and proxy configuration must remain identical.

## Validation evidence

Evidence belongs under `reports/evidence/owner-ui-refinements-20261022-01/`. Final results are recorded after executable checks and live browser verification; this document does not assert a completed release before those checks finish.

## Verified delivery

- Deployed entry: `/assets/index-TrGX9YaE.js`; scoped supplement: `/assets/owner-ui-refinements-baaaafaedb21.css`.
- 480 frontend unit/source-contract tests, TypeScript typecheck/lint, shared-domain build and production frontend build: PASS.
- 11 isolated Chrome browser regressions: PASS, covering creation success/failure, duplicate submission, pending assessment switching, delayed IndexedDB date restoration, native date reset/unmount and responsive cards across all three registers.
- Live authenticated browser presentation checks: PASS; no production records were created or changed by these checks.
- Scoped security and preservation review: PASS. Backend/database test suites were not rerun for this frontend-only change; existing contracts and runtime were preserved.
- Test harness failures and subsequent synthetic quota-fixture repair are retained in the evidence history. The source build/artifacts remained unchanged during that test-only repair.
- Earlier source/database ZIP remains its original dated snapshot; this release did not rewrite that deliverable.
