# Login dark-theme typography

Release: release-login-white-typography-20261023-01

FR-01: Use the two supplied, unchanged white PNGs for the selected language in dark theme (existing blue theme value).
FR-02: Preserve original blue typography in light theme.
FR-03: Switch assets immediately with the existing theme and locale controls in desktop header and mobile main area.
NFR-01: Preserve mobile form icon, welcome icon, layout limits, responsive navigation, auth/data/API/configuration and every unrelated screen.

Design: reuse existing theme context and the two wordmark locations. Keep current dimension constraints and natural image proportions; remove the previous CSS whitening only for these wordmarks. No new visible controls or content.

Integrity baseline: 534 source files, 926 public files and 368 private backend files. Preserve all21 current stylesheet links, original blue PNGs and prior scopes. Environment is hash-only.

Stages01–02 PASS; later verification is recorded in reports/evidence/login-white-typography-20261023-01/scope.json.

## Final verified delivery

Gregorian 2026-10-23; Jalali 1405-08-01. Published /assets/index-CHHIHdD3.js, with both native white PNGs, all 21 previous stylesheet links and one supplement. Tests533/533; type/lint/build PASS; browser24+3 PASS; scoped security/preservation PASS. Backend/domain unit suites, dependency audit, real credential submission and live Enamad verification NOT_RUN: unchanged boundaries or external provider outside anonymous UI scope. One legacy inline blue-only source assertion was updated to the requested theme/locale asset contract; initial532/533 evidence archived and final533/533 verified. No auth/data/API/configuration change or restart. Final gate: reports/evidence/login-white-typography-20261023-01/final-review.json.
