# Mobile login branding — Technical report

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | Technical report | English | 2026-10-23 | 1405-08-01 | release-login-mobile-branding-20261023-01 |

On the mobile login landing view, the header icon is displayed in the main brand area with the selected Persian or English typography directly beneath it. Navigation and appearance controls use the freed header space. The original published icon and wordmarks are reused.

This change applies only to the mobile landing view at 900 px and below. Desktop and the mobile login form remain visually unchanged. Buttons, features, illustration, footer, authentication behavior and navigation are preserved. Short landscape screens scroll vertically to keep all content reachable.

## Validation

| Check | Status |
|---|---|
| Frontend tests | PASS — 533/533 |
| Typecheck/lint, compilation and production build | PASS |
| Actual-artifact / deployed browser acceptance | PASS — 32 / 3 |
| Desktop and mobile form preservation | PASS |
| Scoped security and runtime/asset preservation | PASS |

Backend/domain unit suites and dependency audit: NOT_RUN — these source/dependency boundaries are unchanged. Real credentials and the external Enamad service were not exercised; browser acceptance uses isolated local fixtures.

Published to the application server.

## Implementation and preservation

AccountPages.tsx adds only the localized image to the existing main-brand container; main.tsx imports login-mobile-branding.css. All new styles exclude the mobile form, registration and recovery screens and stay at or below 900 px. The original hidden subtitle node is retained. The main icon and wordmark form a centered vertical stack with compact sizes for shorter viewports. The original PNG bytes and desktop styling remain unchanged; the blue theme uses the existing white CSS treatment. At short landscape heights, the landing-only viewport sizing chain permits vertical document scrolling rather than clipping existing content.

Rollback restores C:/NIVASafe/.local/login-mobile-branding-20261023-01/index.before.html atomically and retains immutable assets. API release-rula-review-population-20261023-01, PID 10380, private files, environment and proxy are unchanged. No API restart or migration occurred.

Scoped stages: 01–02 requirements/design;03 frontend;04–07 existing backend/database/API/auth preserved;08 security;09 tests/typecheck/lint/build;10 responsive layout and desktop/form pixel comparison;11 immutable frontend publication;12 independent final review.

The first browser run passed 12 desktop profiles and failed 20 mobile profiles at the protected form pixel comparison. Original and candidate form geometry, controls and focus matched; the physical pointer position after the moved landing CTA produced different input hover paint. Paired diagnostics against the original published bytes proved exact pixel equality after the same normal CTA navigation, neutral pointer and clean reload of the unchanged form URL. The original 52 baseline captures and failed attempt remain archived. A separate 20-profile canonical form baseline comes only from the original published artifact; exact zero-pixel comparison and original post-click behavior checks remain required. Navigation bounds checks also cover direct label spans. A second run passed 31 of 32 profiles; one runtime theme switch was observed before its inherited-color transition finished. Both original and candidate artifacts reproduced the timing. The harness now waits at most two seconds for the same exact baseline color before retaining all existing assertions. The next run passed all 32 functional cases, but a repeated runtime capture reused a screenshot filename and invalidated an earlier evidence hash. That ledger and the actual remaining files were retained with the mismatch recorded. Capture names now include a unique sequence, and every recorded screenshot hash is verified before acceptance. A further run passed 31 cases and found a desktop screenshot difference at 1920×1080, English, blue. The unchanged published artifact independently reproduced the exact same alternate frame, stable with no running animations; the paint cause remains unproven. Only that one profile permits either of two fixed, provenance-bound original-artifact frames, with zero differing pixels, all original structural assertions, no retries, no masks, no tolerance and no automatic expansion. Every other profile retains its single original oracle. Product source, tests and build were unchanged during these harness corrections.

Evidence: reports/evidence/login-mobile-branding-20261023-01/ (candidate, original assets, build, baseline comparison, security, deployment and final review).
