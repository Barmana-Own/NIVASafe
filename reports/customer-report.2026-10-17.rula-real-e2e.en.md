# NIVASafe RULA Staging Result

| Project | NIVASafe |
|---|---|
| Jalali date | 25 Mehr 1405 |
| Gregorian date | 2026-10-17 |
| Status | Staging verified; not deployed live |

The regular-user RULA image workflow completed in isolated staging using a synthetic image and the real ArvanCloud service. RIGHT, LEFT, and BOTH results were returned, manually reviewed, saved, reopened in a fresh session, and included in JSON/PDF reports. Access, consent, role, tenant, and file-signature denials returned the expected 401/403/415 statuses.

The public service remains on the 15 October backend release. The live image-processing approval settings are empty, so live RULA acceptance remains blocked and no production files, services, or database were changed. Direct ArvanCloud text and synthetic-image probes succeeded, but they did not pass through the live authenticated application or save a result. The configured chat model was not listed in the provider catalog and was not changed or tested. The AI scores still require qualified ergonomic review.

See [the full RULA evidence report](RULA-REAL-E2E-AND-RELEASE.en.md) and [sanitized E2E summary](evidence/rula-real-e2e-20261017/authenticated-rula-e2e-summary.json).

