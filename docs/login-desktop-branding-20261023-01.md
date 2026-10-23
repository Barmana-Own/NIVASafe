# Login desktop branding maintenance

Release: `release-login-desktop-branding-20261023-01`

Status: implemented, validated and published. Independent final acceptance is governed by reports/evidence/login-desktop-branding-20261023-01/final-review.json.

## Stage 01 — scope and observable requirements

This maintenance change affects only the existing login screen above the existing 900 px mobile boundary. It evolves the current login page and does not create a new authentication architecture.

| ID | Required behavior |
|---|---|
| FR-01 | On desktop, replace only the toolbar icon with the supplied Persian or English typographic brand asset for the selected locale. Preserve the existing mobile icon. |
| FR-02 | On desktop, place the existing login-card icon inline beside the welcome heading. |
| FR-03 | On desktop, hide only the existing welcome-message paragraph. Preserve its translation and mobile visibility. |
| FR-04 | On desktop, make footer logos smaller, remove the park logo's white border/tile treatment and use the requested monochrome appearance. Preserve seal/link behavior and alternative text. |
| FR-05 | Reduce desktop header/footer height while preserving controls, focus visibility and usable content layout. |
| FR-06 | At 900 px and below, preserve existing login/landing behavior, mobile form navigation, icons, footer and responsive layout. Preserve all other pages. |
| NFR-01 | Preserve login validation, submission locking, credentials/session handling, redirects, API contracts and server authorization. |
| NFR-02 | Preserve all previous routes, content, source, styles outside the authorized scope, public assets, backend files, environment, proxy and managed API identity. |

Inputs are the owner's supplied typography archive and the existing login layout. Asset verification is an implementation prerequisite: select the correct locale variants, inspect file type/content and preserve all supplied originals outside public output if they are unsuitable for direct publication. Do not invent a substitute wordmark.

## Stage 02 — existing UI architecture and preservation rules

The current surface is `frontend/src/features/account/AccountPages.tsx`, with existing authentication and responsive styles. Reuse its toolbar, welcome heading/icon, footer logos, theme/language controls and form. Scope new desktop rules to the login page and the existing desktop breakpoint; registration, recovery, mobile and authenticated pages remain unchanged.

Preserve real RTL/LTR behavior, locale selection, readable wordmark proportions, meaningful image alternatives, keyboard focus and all existing form states. Avoid image distortion, header/footer overflow and exposing removed welcome text as a required field. The owner's visibility request applies only to the desktop welcome paragraph.

Verification must include Persian and English, white and blue themes, desktop widths immediately above 900 px and representative larger screens, plus mobile widths at/below 900 px. Compare mobile geometry/content and all unrelated login handlers against the frozen initial baseline. Confirm password visibility, validation/error states, duplicate-submit protection and link destinations through isolated synthetic fixtures; do not use real credentials or production business writes.

## Initial integrity and handoff

The initial source snapshot contains 530 unchanged files. Runtime entry is `/assets/index-BPiIxoch.js`. The existing API is `release-rula-review-population-20261023-01`, PID 10380; its identity and database health were verified during preparation. All 890 current public files and 368 private backend files are inventoried. Environment values are never copied into evidence; only their file hash is recorded. Managed config, proxy config and the original public index have local rollback/reference snapshots.

Evidence: `reports/evidence/login-desktop-branding-20261023-01/runtime-before.json`, `baseline.json`, `initial-candidate-manifest.json`, `integrity-baseline.json` and `scope.json`. The final `candidate.json` must be generated only after the authorized implementation is complete and reviewed.


## Published verification checkpoint

Gregorian: 2026-10-23; Jalali: 1405-08-01; release: release-login-desktop-branding-20261023-01. Frozen source files: 533. Frontend tests 533/533, typecheck/lint/compilation/build and 26+3 browser acceptance checks PASS. The browser gate compares unchanged mobile geometry, controls and navigation against the actual pre-change published baseline.

The runtime source changes are limited to LoginPage markup in AccountPages.tsx, a stylesheet import in main.tsx, and login-desktop-branding.css. Native picture/source media selection uses the two unchanged supplied RGBA PNGs; the original icon is the mobile fallback. Existing markup wrappers use display:contents outside desktop. Desktop styles scope the welcome alignment, instruction visibility, 64 px header, smaller trust marks and footer spacing to the login page, excluding registration and simple recovery forms. The blue theme uses a CSS white wordmark for contrast, preserving the supplied files. The park JPG retains its authentic navy background and white artwork; only the added white frame is removed. The first unit run passed 532/533: one old source contract required a direct toolbar img. Its single assertion was expanded to verify the native picture boundary, both locale assets and localized original mobile fallback. Root and candidate tests were patched independently to preserve unrelated pre-existing root work. The initial repair guard stopped before source mutation on that pre-existing difference; its reset logic was corrected before execution to retain the updated manifest. Original failed evidence, both original tests and the initial helper remain under attempt-01-toolbar-markup. The first 26-profile browser run blocked publication: the inherited explicit 76 px header height defeated the initial minimum-height rule, and the picture source introduced an 8 px mobile flex gap. The repair sets an explicit shared desktop header height and matching reserved space/form cap, and hides only the new source layout box. The harness also canonicalizes omitted undefined properties and loopback URL origins to the stored JSON baseline format; all geometry, asset, boolean and zero-pixel-difference assertions remain. Failed source/build/helper/measurements/screenshots are retained under attempt-02-header-mobile.

Rollback restores C:/NIVASafe/.local/login-desktop-branding-20261023-01/index.before.html atomically and retains immutable assets. API release-rula-review-population-20261023-01, PID 10380, its private files, environment and proxy are unchanged; no API restart or database migration was performed.

Prior non-index public files retained: 889; private backend files retained: 368. All nineteen prior stylesheet links are preserved; one new scoped desktop branding stylesheet is added. Source and supplied assets are bound to candidate.json and assets-inspection.json.
