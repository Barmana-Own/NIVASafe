# Customer Report — ArvanCloud Authentication and RULA Image Analysis

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Customer report |
| Language | English |
| Jalali date | 1405-07-24 |
| Gregorian date | 2026-10-16 |
| Status | Real RULA analysis is not yet verified |

## Summary

The earlier HTTP 401 was not conclusively reproduced under a stable result: the protected server credential was accepted once for the model catalog and once for GPT-5-Mini text inference, while a later catalog request using the same configuration source returned HTTP 401. The evidence does not yet distinguish credential state/entitlement from inconsistent gateway behavior. A synthetic image request reached model response parsing, but its output did not match the RULA schema. No assessment was saved.

## Verified work

1. The active API is managed by PM2 and runs a release built on October 15. Local API health returned HTTP 200 during this check.
2. The configured provider is ArvanCloud at `https://api.arvancloudai.ir/v1`. The credential was not displayed in tool output or this report.
3. A GPT-5-Mini text inference returned HTTP 200 and the expected response. A successful catalog response listed GPT-5-Mini, GPT-4.1-Mini, GPT-4o-mini, and DeepSeek-V4-Flash.
4. One synthetic, non-identifiable image was sent using the running release's primary vision model. The response reached the local adapter/parser, but did not validate as a RULA result. No reviewed or saved result was created.
5. The live RULA privacy and vision-capability approval gates remain empty and closed.

## Outstanding items

- The historical staging request with sanitized ID `b8e12c19-f17b-4c7a-9cdd-875209157873` remains unexplained. The earlier report records an upstream HTTP 401 and a sanitized application 503.
- The deployed RULA implementation selects GPT-4.1-Mini with GPT-4o-mini fallback, while current source selects GPT-5-Mini for images. Source inspection alone therefore does not describe the running behavior.
- An authenticated ordinary-user journey through save, reopen, and report was not run because no separate staging database configuration or test-user credentials were available. No write was made to the active database.

## Required external action

The ArvanCloud account owner should verify that the key is active and entitled for `/v1/models`, `/v1/chat/completions`, and the intended vision model, then obtain the provider's reason for a 401 using its request ID. Do not send the key in chat. After image-processing approval and access to an isolated staging environment, the authenticated RULA persistence journey can be tested.

## Deployment

No application source, live configuration, service, database, or account was changed; there was no deployment or restart. Only the local diagnostic script was corrected to load the protected environment file and avoid sending a request when the key is missing. Its rerun still returned HTTP 401.
