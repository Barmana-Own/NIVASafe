# Customer report — Enamad in the login footer

| Field | Value |
|---|---|
| Project | NIVASafe |
| Gregorian date | 2026-10-19 |
| Jalali date | 1405-07-27 |
| Frontend release | release-login-enamad-20261019-01-r2 |
| Status | DEPLOYED; intermittent external badge image |

## Delivered result

The official Enamad widget, using the supplied image and verification URLs, was added beside the existing Qazvin Science and Technology Park mark and deployed to the public site. The genuine image loaded in the actual public-domain browser. The park mark and desktop/mobile login layout are preserved. The link opens the official verification page in a separate tab.

## Quality and limitation

| Check | Result |
|---|---|
| Frontend tests | PASS: 403 tests |
| Build / typecheck / lint | PASS |
| Final-candidate and public browser | PASS: 8 cases each, 390px and 1280px |
| Official badge image | Genuine image in 5/8 initial views; readable fallback in 3/8 |
| Backup and rollback rehearsal | PASS |
| Public API / database connectivity | PASS |

The external image service was intermittent: both PNG HTTP 200 and failed image requests were observed. A readable Enamad verification link replaces a broken image on failure. The provider's internal cause and the certificate's legal status were not inferred. No code replacement is presently required; if failures persist, Enamad support should inspect the supplied image URL and app.nivasafe.com origin.

## Preservation

Backend, accounts, database, user images and protected settings were unchanged; the API was not restarted. RULA, FMEA, chatbot and support were preserved. Existing RULA image privacy gates remain closed. This delivery does not enable RULA or certify anatomical accuracy.

Evidence: C:/NIVASafe/reports/evidence/login-enamad-20261019-01.
