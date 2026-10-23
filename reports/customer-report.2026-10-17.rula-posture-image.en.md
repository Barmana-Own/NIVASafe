# NIVASafe Owner Report — RULA Posture Image Analysis

| Item | Value |
|---|---|
| Jalali date | 25 Mehr 1405 |
| Gregorian date | 17 October 2026 |
| Verdict | Blocked / unverified |
| Deployment | Not deployed |

## Summary

Real RULA image analysis is not yet verified. The active release has no privacy approval configured for image analysis, so requests must stop before sending an image. One bounded GPT-5-Mini text request to the current gateway timed out after 15 seconds without an HTTP response; DNS, TCP port 443, and TLS 1.3 succeeded. The historical HTTP 401 also remains unexplained: the same credential source previously returned HTTP 200 for model discovery and GPT-5-Mini text inference, but a later request returned HTTP 401. The rejected request was not repeated.

## Completed

1. The active API and non-secret runtime settings were checked: the local service on port 5044 was healthy and runs `release-20261015-project-source-update`.
2. Runtime/source drift was confirmed: the active RULA image path uses GPT-4.1-Mini with GPT-4o-mini fallback; current source selects GPT-5-Mini for image analysis. That source has not been deployed.
3. The code now retains only a bounded UUID-shaped provider correlation ID in internal image-analysis diagnostics; it does not record the provider response body or token-shaped values.
4. In an isolated test workspace, 148 focused tests passed, along with backend typecheck and build.
5. One non-image GPT-5-Mini gateway request was attempted without user data; it timed out after 15 seconds and returned no HTTP status. No image request was sent.

## Outstanding

- The HTTP 401 remains unresolved among credential/scope, IP or account policy, and inconsistent gateway behavior.
- A valid real vision response, reviewable RULA score, database save, reopen, and report have not been verified.
- Privacy and vision-approval gates remain closed in the active environment; no security control was changed.
- Source changes were not deployed. The active release remains the October 15 build.

## Required next action

The ArvanCloud account owner should ask provider support or inspect gateway logs for sanitized request ID `b8e12c19-f17b-4c7a-9cdd-875209157873` and confirm credential scope, image-model entitlement, gateway region/URL, and IP restrictions. A permitted staging credential, isolated database, and ordinary test user are also required. Image approval should be opened only for authorized staging after provider capability and test-user consent are confirmed.

