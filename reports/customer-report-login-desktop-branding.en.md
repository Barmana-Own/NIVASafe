# Desktop login branding — Customer report

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | Customer report | English | 2026-10-23 | 1405-08-01 | release-login-desktop-branding-20261023-01 |

The desktop login header uses the supplied Persian typography by default and switches to the supplied English typography with the selected language. The original form icon sits beside the welcome heading; the existing instruction sentence is hidden only on desktop. Header and footer are shorter, both footer marks are smaller, and the park logo has no added white border, padding or tile.

These changes apply from 901 px upward. The original mobile header icon, instruction, landing/form navigation, controls and layout at 900 px and below remain unchanged. The original park artwork and Enamad verification link/fallback are preserved. Other pages and authentication behavior are unchanged.

## Validation

| Check | Status |
|---|---|
| Frontend tests | PASS — 533/533 |
| Typecheck/lint, compilation, production build | PASS |
| Isolated actual-artifact / deployed browser acceptance | PASS — 26 / 3 |
| Scoped security and existing runtime/asset preservation | PASS |

Backend/domain unit suites and dependency audit: NOT_RUN — those sources and dependency files are unchanged. Real credential submission and the external Enamad service were not exercised; browser acceptance uses isolated local fixtures.

Published to the application server.
