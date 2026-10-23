# Report Chart Update — Customer Delivery

| Field | Value |
|---|---|
| Project | NIVASafe |
| Gregorian / Jalali date | 2026-10-19 / 1405-07-27 |
| Frontend release | release-report-chart-consistency-20261019-01 |
| Delivery | DEPLOYED — scoped report chart update |
| Repository | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf plus preserved dirty work |

## Delivered changes

- Both FMEA and RULA report progress labels now read «درجریان» and «باقی مانده»; English equivalents are “In progress” and “Remaining.”
- Both progress charts and the RULA risk chart now share the FMEA risk chart's donut size, legend styling, spacing and responsive behavior.
- The FMEA heading is «توزیع سطح ریسک FMEA» / “FMEA risk-level distribution.”
- Counts, percentages, semantic colors, expandable details, scores and assessment data are preserved. Persian/English direction is explicit and consistent.

## Quality and publication

| Check | Result |
|---|---|
| Frontend tests | PASS —425 tests /60 files |
| Typecheck / lint / build | PASS —all four package commands exit0 |
| Synthetic browser coverage | PASS —20 component states and16 pages using the real isolated API/database |
| Widths | Components:320/390/768/1280/1920; real pages:390/1280 |
| Languages / themes | Persian/English; white/blue |
| API contract / release | PASS —93 frontend paths /155 backend routes and29 release checks |
| Public website | PASS —23 document/asset hash checks; API200 and database up |
| Backup / rollback | PASS —543-file backup and isolated restoration/swap rehearsal |

Only static frontend files were published. Backend PID13644 remains unchanged. Existing data, accounts, uploads, protected settings and AI model routing were preserved. No AI calls were made.

## Acceptance limits

The private production report was not reopened for testing; the owner required synthetic data only. Report-page acceptance uses the same published bundle against real isolated staging. Public acceptance covers served artifacts and health. PDF and Safari were not rerun for this presentation-only task. Existing RULA anatomical-validation and image-authorization limitations are unchanged. No new blocker remains for this scoped change.

Backup: C:/ProgramData/NIVASafe/backups/release-report-chart-consistency-20261019-01/frontend

Evidence: C:/NIVASafe/reports/evidence/report-chart-consistency-20261019-01
