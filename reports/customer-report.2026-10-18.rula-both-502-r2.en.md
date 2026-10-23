# NIVASafe RULA BOTH Failure Status

| Item | Value |
|---|---|
| Project | NIVASafe |
| Report type | Customer report |
| Language | English |
| Jalali date | 1405-07-26 |
| Gregorian date | 2026-10-18 |
| Delivery status | Blocked; not deployed |

## Summary

An earlier run received HTTP 200 from the AI gateway, but the BOTH response did not satisfy the application's response contract and the API returned HTTP 502. A separate BOTH run succeeded, so the failure is intermittent. The model prompt now states the required schema more precisely, and safe validation-reason diagnostics were added. The updated candidate has not been re-tested against the real gateway because the current staging runtime and authorized access to protected configuration were unavailable.

## Work and evidence

1. The RULA BOTH prompt now requires LEFT and RIGHT results under `sides.LEFT` and `sides.RIGHT`, with all seven body parts present for each side.
2. Response validation failures now carry an allowlisted diagnostic code without storing private answer text. Consent, role, file, and tenant checks were not changed.
3. The candidate backend build and 414 backend tests, 29 focused frontend tests, typecheck, build, API contract check, and 29 release checks passed. See the [technical report](technical-report.2026-10-18.rula-both-502-r2.en.md) and [evidence summary](evidence/rula-both-502-2026-10-18/evidence-summary.json).

## Unverified items and impact

- The updated candidate was not exercised against ArvanCloud; repeated BOTH, browser, and fresh persistence/reload checks were not run. The intermittent 502 is not considered fixed.
- The previous candidate has one failed and one successful BOTH run. The two upstream calls in the failed run returned HTTP 200, but their response shape was not retained. Missing vision entitlement has not been proven.
- The candidate was not deployed, and live image-processing permissions were not changed. The local API health endpoint returned HTTP 200 with version `0.1.0`; the current account could not read the executable path.
- Browser and Safari/WebKit acceptance were not run. The open browser tab points to a stale staging route, and Playwright is absent.

## Required next action

An authorized Windows staging operator must execute the runbook at `reports/evidence/rula-both-502-2026-10-18/ADMIN-RUNBOOK.md` under the existing identity that can access protected runtime configuration. Backend release remains on hold until the new evidence passes. No live files, services, database, or production uploads were changed in this run.
