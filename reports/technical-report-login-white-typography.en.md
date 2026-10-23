# Login white typography — Technical report

| Project | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|
| NIVASafe | en | 2026-10-23 | 1405-08-01 | release-login-white-typography-20261023-01 |

The supplied original Persian and English white typography is published for dark theme in the desktop login header and mobile main brand area. The existing theme and language controls select the correct original asset immediately. Light theme retains its original blue typography. Native logo icons, auth behavior, all unrelated screens and the API remain unchanged.

| Check | Status |
|---|---|
| Frontend tests | PASS — 533/533 |
| Typecheck, configured lint, compilation and production build | PASS |
| Browser acceptance / published acceptance | PASS — 24 / 3 |
| Supplied PNG bytes, native colors and transparency | PASS |
| Scoped security, source inverse proof and runtime preservation | PASS |

Backend/domain unit suites and dependency audit: NOT_RUN because their source/dependencies are unchanged. Real credential submission and live Enamad provider verification: NOT_RUN; anonymous browser acceptance uses isolated font/seal fixtures.

Only the two existing wordmark image sources now read the existing appearance context. A final scoped CSS supplement clears the former whitening filter. Original sizing constraints and natural proportions are retained. Two new PNGs are byte-identical to the supplied ZIP; all 21 prior stylesheet links remain in order, with one scoped supplement appended. 925 prior non-index public files and 368 private backend files, environment, proxy and API PID 10380 are unchanged. No restart, schema migration or dependency change occurred. Rollback restores C:/NIVASafe/.local/login-white-typography-20261023-01/index.before.html atomically.

The initial test run passed 532/533; one existing source contract asserted an inline blue-only srcSet. Its assertion was updated to the requested theme-selected source and now also requires both supplied white and original blue language paths. No test was removed, and unrelated root test edits were retained. The original failure is archived; the final full suite passes 533/533. A later live QA path requested the already active theme, while the existing menu exposes only its alternate. QA now switches to the opposite theme and back. The 2/3 live failure and original seal are archived; all 24 candidate and 3 public browser cases were rerun on the same unchanged source/build.

Scoped stages 01–03 cover assets/design/frontend; 04–07 preserve existing backend/database/API/auth; 08 reviews exact source and static file trust boundaries; 09 validates existing tests/build; 10 exercises 24 responsive locale/theme cases against the captured original code; 11 publishes immutable assets and switches the index atomically; 12 independently reloads all evidence, verifies three actual public-browser cases, source/runtime/public bytes and documentation. This is a scoped maintenance verdict, not a whole-product certification.

Evidence: reports/evidence/login-white-typography-20261023-01/
