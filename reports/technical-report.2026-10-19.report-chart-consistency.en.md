# Report Chart Consistency — Technical Evidence

| Field | Value |
|---|---|
| Project | NIVASafe |
| Gregorian / Jalali date | 2026-10-19 / 1405-07-27 |
| Frontend release | release-report-chart-consistency-20261019-01 |
| Delivery | DEPLOYED — scoped report chart update |
| Repository | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf plus preserved dirty work |

## Scope and root cause

The active report route uses features/assessments/AssessmentPages.tsx. Its FMEA risk chart is the visual reference. More-specific enterprise rules in styles/assessments.css forced RULA to a96px grid chart and action progress to a separate grid with12px wrapping labels, forced direction and mobile stacking. These overrides caused the mismatch. The reference uses intrinsic flex-wrap,112px donuts and11px status badges.

The fix reuses those existing reference classes instead of introducing another chart renderer or new thresholds. It removes only the conflicting chart-specific overrides, adds the shared status badge class and scopes the necessary RULA surface padding. Legacy ring/list components remain intact. Both FMEA chart definitions are kept consistent. Explicit localized dir also prevents an English report container from inheriting RTL. React useId makes detail/heading IDs independent when multiple charts coexist. No business rules changed.

## Exact application/test changes

- frontend/src/components/enterprisePresentation.test.tsx
- frontend/src/features/assessments/AssessmentPages.tsx
- frontend/src/features/assessments/fmea/FmeaReportComponents.tsx
- frontend/src/features/assessments/FmeaActionProgressChart.test.tsx
- frontend/src/features/assessments/FmeaActionProgressChart.tsx
- frontend/src/features/assessments/RulaReportOverview.tsx
- frontend/src/i18n.test.ts
- frontend/src/i18n.tsx
- frontend/src/styles/assessments.css

Operational helper: scripts/releases/report-chart-consistency-20261019-01/static-release.mjs. Baseline, source patches, checked candidate and runner scripts are preserved under C:/NIVASafe/reports/evidence/report-chart-consistency-20261019-01 and .local/report-chart-consistency-20261019-01. No added dependency, API, backend, domain, public-asset, schema or migration change.

## Verification

| Evidence | Actual result |
|---|---|
| tdd-red.log | Expected red:4 failures /10 passes before correction |
| tdd-green.log | Targeted19 tests /3 files passed |
| test.log |425 tests /60 files passed; exit0 |
| typecheck.log /lint.log /build.log | All exit0 with pinned pnpm10.13.1, Node22.22.3 |
| contract.log |93 frontend paths /155 backend routes, exit0 |
| release-check.log |29 checks passed, exit0 |
| browser-baseline.json |4 original synthetic states retained |
| browser-candidate.json |20 cases passed; real components with mocked HTTP boundary,0 runtime exceptions,0 unexpected requests |
| real-staging.json |16 authenticated real API/MariaDB pages passed;2 ordinary users /2 separate organizations; anonymous401, cross-tenant FMEA404 |
| scope-security-integrity.json |9 changed frontend source/test files; candidate/source parity; unrelated sources and schema unchanged |
| prepared.json /backup-manifest.json |543 backup files; clone/hash/mtime reconstruction and isolated old/new/old index swap passed |
| deployment.json | DEPLOYED;23 public document/asset checks, API200/database up; no backend restart |
| final-review.json |559 live files;542 previous non-index files and16 new assets verified; current index matches tested candidate |

Chrome 155.0.8059.80. Component widths320/390/768/1280/1920 ×fa/en ×white/blue. Every case compares the four chart layouts, donut size, legend display, spacing, font/padding/radius, direction and overflow against the actual FMEA reference. Independent detail toggles and unique ARIA controls are exercised. Real staging uses the compiled production bundle at390/1280 ×fa/en ×white/blue ×FMEA/RULA. Only synthetic fixtures are used. Port53306 and isolated MariaDB datadir are verified before use; stage secrets are independent; AI is disabled and external backend fetches are blocked. Stage API5153 was stopped afterward.

### Failures found and resolved

Windows PowerShell5 stopped a test wrapper on informational stderr; the retained interrupted log is not a PASS. The normal PowerShell7 wrapper completed. An existing CSS-string assertion expected the superseded96px grid; it was updated to the requested common layout, retaining the other assertions. Browser comparison exposed RULA12px versus reference11px badges, then inherited RTL in the English reference; scoped badge styling and explicit localized direction corrected both. Initial failing browser artifacts remain retained. No test was removed or weakened to conceal a product defect.

### Not rerun / residual limits

Backend/domain suites, PDF export, Safari and authenticated private production reports: NOT_RUN_THIS_SCOPE. Backend/domain/schema/runtime hashes are unchanged; compatibility is exercised by real staging. The owner permitted synthetic data only, so the private report's automatic AI request was not triggered. This is not real-provider or anatomical-accuracy acceptance. Existing Vite chunk-size warning remains; build exits0. No paid calls were used. Whole-product RULA accuracy/privacy gates remain unchanged.

## Release identity and rollback

- Frontend:release-report-chart-consistency-20261019-01; index SHA256:3ecaddc28249d61daa3c18b52fe98c9ad57a363ce6c36b92f1c8c5ace7b7d396.
- Main JS:/assets/index-D9kN2icT.js; SHA256:5e2e5c17f2551aa581993073734fab67c7d6743c6c1900ebc5616c79e779d8ec.
- CSS:/assets/index-BytX4Awt.css; SHA256:4eea370e9d7331baf9f54027459fdadcb48021cb29d60b1cf75c43a1e7afe80e.
- Backend:release-fmea-ai-reliability-20261019-01; PID13644; server SHA256:e7a26489e1dd96e1c7e9d8c25715c2691e4e6ba590347f088c37961b10be5cb0; not restarted.
- Frontend backup:C:/ProgramData/NIVASafe/backups/release-report-chart-consistency-20261019-01/frontend.
- Candidate staging root:C:/inetpub/nivasafe/staging/release-report-chart-consistency-20261019-01.
- Rollback command:C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\report-chart-consistency-20261019-01\static-release.mjs rollback.

The helper adds immutable hashed assets, switches index atomically last and retains old assets. Rollback verifies active/backup index and managed settings, restores only the previous index, verifies public old assets/health, and does not change newer user data. Live rollback was unnecessary. The deployment compares protected config, proxy, service-worker and managed stylesheet hashes; no migration or protected setting change occurred.

## Security and integrity review

PASS within this change. All source files remain present. Calculations, chart totals, status selection, detail content, score versions and permission/data boundaries are unchanged. Fixed translation text/dir values and React-escaped text introduce no new input or HTML trust boundary. Unique IDs retain accessible associations. The two-user/two-organization staging denials remain enforced. Existing login, support, admin, FMEA/RULA workflows, chat models and unrelated dirty work are preserved. Only the user-requested labels and obsolete chart layout overrides were replaced equivalently. No new production endpoint, fixture inference path or consent bypass exists.

## Scoped delivery stages

This is a bounded presentation change in an existing product, not a new full-stack build. Backend/database implementation stages are not applicable; no new schema/auth architecture is claimed.

| Stage | Status | Evidence |
|---|---|---|
| 10 | PASS | 20 isolated component cases +16 authenticated real API/MariaDB report pages, Chrome155.0.8059.80; no overflow/runtime exception. |
| 11 | PASS | 543-file backup reconstruction and isolated old/new/old index rollback; frontend-only release and23 public document/asset hash checks. |
| 12 | PASS | Final independent checks verify559 live files, all prior assets, exact candidate index, backend PID13644, protected settings and health. Scope only. |
| 01 | PASS | Explicit three-copy/layout requirements and immutable source/integrity baseline. |
| 02 | PASS | Existing FMEA risk chart adopted as the visual/responsive reference; no redesign. |
| 03 | PASS | Nine focused frontend source/test files; shared flex/legend styling, localized direction and unique detail IDs. |
| 04 | NOT_APPLICABLE | Backend source unchanged; compatibility exercised against the exact deployed backend artifact. |
| 05 | NOT_APPLICABLE | Schema/migrations unchanged; staging verifies port 53306 and isolated datadir. No production migration. |
| 06 | PASS | 93 frontend paths /155 backend routes; API contract command exit0. |
| 07 | PASS | Two real ordinary staging users in independent organizations; anonymous401 and FMEA cross-tenant404 retained. |
| 08 | PASS | Scoped security review; no changed auth/transport/tenant/model/consent/upload/HTML-rendering boundary. |
| 09 | PASS | 425 frontend tests /60 files, typecheck/lint/build exit0; pinned pnpm10.13.1. |

Scoped status: COMPLETE. Whole-product PROJECT_STATUS remains INCOMPLETE for prior RULA acceptance; no global completion is claimed.
