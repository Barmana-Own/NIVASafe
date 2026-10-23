# Mobile login branding — Customer report

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | Customer report | English | 2026-10-23 | 1405-08-01 | release-login-mobile-branding-20261023-01 |

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
