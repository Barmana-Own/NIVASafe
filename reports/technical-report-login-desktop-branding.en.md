# Desktop login branding — Technical report

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | Technical report | English | 2026-10-23 | 1405-08-01 | release-login-desktop-branding-20261023-01 |

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

## Implementation and preservation

The runtime source changes are limited to LoginPage markup in AccountPages.tsx, a stylesheet import in main.tsx, and login-desktop-branding.css. Native picture/source media selection uses the two unchanged supplied RGBA PNGs; the original icon is the mobile fallback. Existing markup wrappers use display:contents outside desktop. Desktop styles scope the welcome alignment, instruction visibility, 64 px header, smaller trust marks and footer spacing to the login page, excluding registration and simple recovery forms. The blue theme uses a CSS white wordmark for contrast, preserving the supplied files. The park JPG retains its authentic navy background and white artwork; only the added white frame is removed. The first unit run passed 532/533: one old source contract required a direct toolbar img. Its single assertion was expanded to verify the native picture boundary, both locale assets and localized original mobile fallback. Root and candidate tests were patched independently to preserve unrelated pre-existing root work. The initial repair guard stopped before source mutation on that pre-existing difference; its reset logic was corrected before execution to retain the updated manifest. Original failed evidence, both original tests and the initial helper remain under attempt-01-toolbar-markup. The first 26-profile browser run blocked publication: the inherited explicit 76 px header height defeated the initial minimum-height rule, and the picture source introduced an 8 px mobile flex gap. The repair sets an explicit shared desktop header height and matching reserved space/form cap, and hides only the new source layout box. The harness also canonicalizes omitted undefined properties and loopback URL origins to the stored JSON baseline format; all geometry, asset, boolean and zero-pixel-difference assertions remain. Failed source/build/helper/measurements/screenshots are retained under attempt-02-header-mobile.

Rollback restores C:/NIVASafe/.local/login-desktop-branding-20261023-01/index.before.html atomically and retains immutable assets. API release-rula-review-population-20261023-01, PID 10380, its private files, environment and proxy are unchanged; no API restart or database migration was performed.

Scoped workflow: 01–02 requirements/design;03 frontend implementation;04–07 existing backend/database/API/auth boundaries preserved;08 security review;09 tests/typecheck/lint/build;10 desktop and mobile browser comparison;11 immutable frontend publication;12 independent evidence/document review.

Exact archive and asset evidence: reports/evidence/login-desktop-branding-20261023-01/assets-inspection.json.

Initial source/runtime baseline, browser baseline comparisons and final immutable evidence are retained under reports/evidence/login-desktop-branding-20261023-01/.
