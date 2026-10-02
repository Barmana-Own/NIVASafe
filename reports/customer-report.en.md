# Customer Delivery Report — NIVASafe Visual Regression Stability

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Customer |
| Language | English |
| Jalali date | 10 Mehr 1405 |
| Gregorian date | 2 October 2026 |
| Revision | `17c0d8b` (working-tree changes are uncommitted) |
| Delivery status | Implemented and validated locally; not released |

## Summary

The visual-difference limit was reduced from 8% to 2%, and browser-test inputs were made more stable. The complete visual suite passed twice consecutively, and a deliberate, substantial layout displacement was rejected by the test. This stage did not change production behavior, appearance, or APIs.

## User-visible quality improvements

- Existing visual coverage was retained, with 16 new baselines for FMEA/RULA lists and forms, Knowledge, Notifications, Members, and Profile.
- Key pages were exercised at mobile, tablet, and desktop widths; selected Persian/RTL, English/LTR, and theme variants remain covered.
- Browser tests no longer depend on the live availability of the external Vazirmatn font CDN; the font files are used only by the test environment.

## Quality and validation

- Visual tests: 52 of 52 passed in each of two consecutive full runs.
- Browser interaction tests: 90 of 90 passed.
- Overflow tests: 108 of 108 passed.
- Vitest: 124 of 124 passed; lint, typecheck, and build also succeeded.
- Negative control: a temporary 140px RULA report displacement caused a 3% image difference and failed at the 2% limit; after removing it, the original baseline passed.

## Limitations and release status

No GitHub Actions run was observed, and no release or deployment was performed. The local environment used pnpm 11.19.0 while the repository/CI specifies 10.13.1; verifying Corepack with that version was blocked by restricted system-cache access. The successful build emitted a warning that the JavaScript chunk exceeds 500 KB.

## Summary

The local visual-regression hardening stage is complete. The GitHub workflow and its specified pnpm version still need to be observed in CI before relying on remote-run evidence.

## Delivery update — 2 October 2026

Browser readiness now waits on actual route content, loader completion, fonts, decoded images, and settled layout geometry. Subscription-trial tests now use one controlled instant for trial creation and expiry checks; the 14-day duration and access rules remain unchanged.

Additional validation covered 96 browser interaction tests, 108 overflow tests, two consecutive visual runs at 52/52 each, 12 subscription-boundary tests, all 152 backend tests in a single-worker run, and 12 shared-domain tests. Backend lint, typecheck, and build also passed. One parallel backend run had a transient timeout in an unrelated AI-provider test; the test passed alone and the full suite passed with one worker.

No visual baseline was updated in this stage. The subscription change is limited to an internal clock seam and tests; API, database, and user-facing behavior are unchanged. Remote CI and release were not performed.

## Final quality-gate update — 2 October 2026

The current local release-quality checks passed: 99 browser interaction/accessibility checks, 108 overflow checks, 52 strict visual comparisons, 295 workspace unit/domain/backend tests, plus lint, typecheck, build, API-contract, and release verification. Additional local browser checks cover PDF and video previews, modal keyboard focus, background scroll locking, and focus restoration.

No production behavior or screenshot baseline changed in this final gate. The GitHub workflow is configured for pull requests and pushes, but a remote CI result was not observed. No deployment or production request was performed. The build still reports a non-failing large-JavaScript-chunk warning.

One initial browser-suite run had a timeout on a wide RULA report viewport. The exact test and the next complete browser run passed; the timeout could not be reproduced. This is recorded for CI observation, and it did not require changing application behavior or visual baselines.
