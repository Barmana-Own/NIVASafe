# RULA 401 Test Status

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Customer summary |
| Language | English |
| Jalali date | 1405-07-26 |
| Gregorian date | 2026-10-18 |
| Candidate marker | `rula-401-differential-candidate-20261018-01` |
| Release status | Not deployed |

## Summary

In an isolated test environment, the current final candidate received successful real ArvanCloud responses for text and synthetic-image requests. Authenticated RIGHT and LEFT API journeys were saved and reopened after a fresh login; a separate BOTH journey also saved, reloaded, and generated a PDF report. However, the earlier 401's cause cannot be proven, one earlier BOTH attempt returned an application-level invalid-response 502, browser acceptance was not run, and no live release occurred. The API journey passed in staging, but full user acceptance and the live version remain unverified.

## Verified

1. Direct text and image requests from the current candidate each returned HTTP 200; the returned model was `gpt-5-mini-2025-08-07`.
2. An ordinary staged member with image consent completed authenticated RIGHT and LEFT analyses. Persisted scores were 4 and 5 respectively.
3. A separate BOTH analysis returned independent left/right observations and persisted with score 4. Fresh login, assessment reload, report retrieval, and PDF generation succeeded.
4. Negative authorization tests for missing authentication, cross-tenant access, Viewer role, missing image consent, and invalid image signature returned expected 401, 403, and 415 responses.
5. Tests used only a synthetic image and a disposable database/upload directory isolated from live data.

## Outstanding and impact

- The old 401 root cause is **unknown**. The old process/configuration and an upstream error ID/body were not retained. Current success does not prove the old run used the same credential or runtime settings.
- In the first final-candidate run, RIGHT and LEFT succeeded but BOTH returned HTTP 502 `RULA_IMAGE_AI_INVALID_RESPONSE` at the application layer after a successful provider response. A separate BOTH run passed; the intermittent response/parsing failure has not been diagnosed or fixed.
- Authenticated browser testing was not run. The interactive identity could not read the protected configuration file, and an attempt to schedule the runner as SYSTEM failed with Access denied.
- No qualified ergonomics reviewer independently validated the AI suggestions or scores.
- Production image-privacy/vision gates remain closed. The live site/backend were not updated; public HTTPS checks were unavailable in this session.

## Release and required action

**Status: NOT DEPLOYED.** No live service, static asset, runtime configuration, database, or account was changed. A server administrator must provide a narrowly scoped way to run the browser test with staging-only configuration. Production image use additionally requires documented organizational privacy approval and authorization to send images to the provider. A backend release also requires an accessible, verifiable live-artifact backup and rollback path. This report does not authorize image processing or deployment.

