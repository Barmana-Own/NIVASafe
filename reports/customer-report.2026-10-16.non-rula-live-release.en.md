# Customer Report — Non-RULA Live Release

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Customer report |
| Language | English |
| Jalali date | 1405-07-24 (24 Mehr 1405) |
| Gregorian date | 2026-10-16 |
| Release ID | `nivasafe-non-rula-20261016T222844Z` |
| Delivery status | Partial live release |

## Summary

The updated frontend is live at `https://app.nivasafe.com`, and the existing support-inbox correction is active in the backend. Public HTTPS and service-health checks passed. In Chromium, the mobile login rendered without page-level horizontal overflow at widths from 320 through 414 pixels, and its text inputs use a 16-pixel font.

## Delivered

- A freshly built frontend bundle was deployed; the JavaScript and CSS served from the public host match the release candidate.
- Mobile authentication inputs were set to at least 16 pixels while retaining the password-visibility control.
- Related dashboard-card CSS was balanced in the released bundle.
- The existing narrow support fallback for an active, protected system administrator was enabled; access remains limited to the current organization.
- Static assets and the backend support module were backed up, with restoration rehearsed.

## Acceptance limits

- Approved live test-account sessions were unavailable. Member ticket creation, admin replies, status changes, and persistence after reload were not verified on the live site; the earlier complete journey was verified only in staging.
- Authenticated dashboard and admin pages, the collapsed sidebar, FMEA, corrective actions, notifications, and other protected workflows were not tested live.
- Safari/WebKit/iOS was unavailable. Chromium testing is not Safari verification.
- A live screenshot was not produced because the browser screenshot API timed out. Existing fixture images are staging evidence only.
- A full backend build could not be verified because the installed development type dependency `@types/pdfkit` is incomplete. The production dependency audit was not run in this release.

## Release state

The frontend was published to `C:\inetpub\nivasafe\app-com`. The support module was installed in the active backend runtime, and only the API service was restarted. The API reported `healthy` and the database reported `up` afterward. No migration, data change, configuration change, privacy-gate change, or secret change was made.

**Result:** A live release occurred, but completion of all non-RULA capabilities is not yet verified. The Persian result and technical evidence are in `reports/NIVASafe-NON-RULA-LIVE-RELEASE-RESULT.fa.md` and its evidence folder.

## Separate RULA phase

Real RULA image-vision analysis was not exercised in this release. The prior report records an HTTP 401 from the ArvanCloud gateway; it remains unresolved and deferred.
