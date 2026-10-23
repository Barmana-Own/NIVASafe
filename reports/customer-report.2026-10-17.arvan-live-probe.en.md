# Customer Report — ArvanCloud Connectivity and RULA Image Analysis

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Customer |
| Language | English |
| Jalali date | 25 Mehr 1405 |
| Gregorian date | 17 October 2026 |
| Delivery status | Partially verified; not deployed |

## Result

The authentication failure did not recur in the current backend runtime: the protected service credential was present, the gateway returned HTTP 200 for its model catalog, and a GPT-5-Mini text request succeeded. One synthetic image request through the corrected adapter returned HTTP 200 and passed the RULA response parser. However, the application route remains closed by its privacy approvals, and no separate staging database or authenticated test account was available to prove assessment save and reload. No code was deployed.

## Completed work

1. DNS, TCP/443, and TLS 1.3 passed from the actual backend service identity; Node had no configured proxy.
2. Bearer authentication and current catalog access for `GPT-5-Mini` and `DeepSeek-V4-Flash` were verified. A GPT-5-Mini text request returned HTTP 200 with the expected response.
3. An image request using `reasoning_effort` conflicted with the gateway's internal effort setting and returned HTTP 400. That parameter was removed only from the ArvanCloud adapter; the GapGPT adapter is unchanged.
4. With the corrected adapter and a synthetic image containing no real person, the gateway returned HTTP 200. The parser validated seven body-part results and visible landmarks; one observation still requires human review.
5. Focused tests, isolated typecheck, and isolated backend build passed. No database, privacy setting, credential, or active service was changed.

## Remaining items

- The exact cause of the historical HTTP 401 cannot be distinguished from retained evidence; the current credential is accepted. To identify the historical cause, the ArvanCloud account owner would need to inspect gateway logs for request `b8e12c19-f17b-4c7a-9cdd-875209157873`.
- The prior timeout was not reproduced. A new text request from the same service identity completed in about 7.6 seconds; the original timeout's exact cause remains unproven.
- An ordinary-user login, application API upload, image consent, RULA save, reload, and report were not run. RULA privacy and vision approvals are empty in the active profile, so the route must remain fail-closed.
- The source fix is not deployed. DeepSeek-V4-Flash appeared in the gateway catalog, but no real chat inference was run with it.

## Action needed for full acceptance

Provide an isolated staging database, organization, and regular test account, and explicitly authorize ArvanCloud for that synthetic-image test in staging. Until then, the real RULA route and result persistence are not verified.
