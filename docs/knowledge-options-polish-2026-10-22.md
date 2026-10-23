# Knowledge creation option cards

Date: 2026-10-22. Classification: targeted CSS presentation repair.

## Approved scope and preservation

Improve the seven existing knowledge-creation option cards: visibility, selected users, allowed global organizations, user publication, AI readability, global default and attachment. Keep every field, label, hint, form name, native input, role boundary and submission behavior intact. Existing document cards, quota summaries, search, content inputs and other pages are outside this change.

`GeneralPages.tsx` is byte-identical to the deployed baseline. No JavaScript, API, authentication, authorization, database, upload validation or dependency change is required. Super administrators retain seven option cards; organization administrators and HSE managers retain their existing five-card form without global fields.

## Design

Reuse semantic light/dark tokens and the existing typeface. Remove the gray background that made unused grid cells look like an unfinished section. Use consistent 16 px card padding, rounded borders, readable helper text, visible focus and clear checked states. Retain native multiple-selection and file-input semantics.

The grid uses three columns above 1200 px, two from 761–1200 px and one below 761 px. The attachment spans the full row, with its description and chooser aligned horizontally on larger screens and stacked on mobile. Checkboxes remain real native form controls with custom visual styling and a native forced-colors fallback. No new copy, icons, buttons or assets are added.

## Verification and publication

The candidate is assembled from `.local/owner-ui-refinements-20261022-01/candidate`. Only the scoped CSS suffix and the new knowledge browser regression test may differ. Root stylesheet prefix preservation is checked against a pre-change copy.

Build/type/lint/unit evidence, five isolated browser cases and scoped security review must pass before publication. Browser cases cover responsive layout, both text directions and themes, keyboard operation, multiple selection, existing submission payloads and attachment handling, quota-disabled upload and failure-state preservation. Synthetic tests do not write production knowledge records.

Publication adds one immutable scoped stylesheet and one stylesheet link. The JavaScript entry, prior CSS links, static assets, API process, environment and reverse proxy remain unchanged. The previous index is retained for atomic rollback. Final executable evidence and live screenshots are stored in `reports/evidence/knowledge-options-polish-20261022-01/`; results are recorded only after execution.

## Verified delivery

- Published scoped CSS: `/assets/knowledge-options-66be69d4f673.css`. Existing JavaScript entry unchanged.
- 480 frontend unit/source-contract tests, shared-domain build, TypeScript typecheck/lint and production frontend build: PASS.
- 5 isolated Chrome browser cases: PASS with zero failures or skipped cases. Layout, both directions/themes, keyboard controls, multi-selection, existing upload/submission contracts, disabled quota and failure retention were verified using synthetic fixtures.
- Authenticated live presentation: PASS, seven cards retained, transparent grid wrapper, full-width upload and no page overflow. No knowledge records or attachments were created or modified on production for this verification.
- Scoped source/security, immutable publication and independent final preservation gates: PASS. Forced-colors fallback was reviewed in CSS; no browser forced-colors test is claimed.
- Backend/database tests: NOT_RUN; no backend or persistence change. Their existing authorization/upload contracts and running process were preserved.
