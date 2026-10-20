# AI provider routing and image safeguards

Updated: 2026-10-15

## Model routing

The server uses fixed model identifiers so deployment configuration cannot silently substitute a different model:

| Use case | Model | Provider selection |
|---|---|---|
| Assessment text, recommendations, RULA posture text and FMEA analysis | `GPT-5-Mini` | `AI_RISK_PROVIDER`; a different `AI_RISK_FALLBACK_PROVIDER` is an explicit text-only failover setting |
| Conversation | `DeepSeek-V4-Flash` | `AI_CHAT_PROVIDER`; chat history and organization knowledge remain in the chat path |
| RULA/FMEA image analysis | `GPT-5-Mini` | Configured assessment provider only; no provider or model failover for image requests |

Legacy `AI_RISK_MODEL`, `AI_RISK_FALLBACK_MODEL`, and `AI_CHAT_MODEL` values are ignored. Provider-specific model-name settings are also not used by these routes. The root `.env.example`, Docker Compose environment and PM2 profile no longer suggest that the model can be changed there. All providers receive the fixed model for the corresponding use case. If a provider reports a different model in its response, the adapter rejects the result with `AI_MODEL_MISMATCH`. If it omits model identity, the result does not claim a model in response metadata.

For the generic risk-request endpoint, clients cannot select a provider different from the configured risk provider. Existing queued requests are routed through the current configured assessment provider. Explicitly configured text failover is limited to a different `AI_RISK_FALLBACK_PROVIDER`; otherwise the existing deterministic knowledge fallback remains available. Image requests do not use that failover path.

## Assessment image gate

Both RULA posture images and FMEA process images are sent only to the configured assessment provider, and only if all of these checks pass:

1. The purpose-specific privacy approval environment variable exactly matches that provider name.
2. The purpose-specific vision-and-structured-output verification variable exactly matches that provider name.
3. The provider is configured and its adapter accepts that image purpose.
4. Existing authentication, organization membership, assessment permission, subscription, AI allowance, rate limit, MIME, file-signature and 10 MB size checks pass.

The server variables are intentionally empty by default:

```dotenv
RULA_IMAGE_PRIVACY_APPROVED_PROVIDER=
RULA_IMAGE_VISION_SUPPORTED_PROVIDER=
FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER=
FMEA_IMAGE_VISION_SUPPORTED_PROVIDER=
```

They must remain empty until the data-processing terms have been approved and a real, non-production integration check confirms that the exact configured endpoint accepts `GPT-5-Mini`, the image request format and the required structured JSON response. A provider's OpenAI-compatible interface or the fact that the adapter can construct an image request does not prove endpoint capability. There is no automatic switch to GapGPT, GPT-4.1, GPT-4o, or another provider/model. If the check fails or cannot be performed, the upload returns `RULA_IMAGE_AI_UNAVAILABLE` or `FMEA_IMAGE_AI_UNAVAILABLE` and the user can continue with manual review.

`GET /api/v1/ai/providers` includes `assessmentImageReadiness` per provider. Its `configured`, `privacyApprovalMatches`, `capabilityApprovalMatches`, `adapterAllowsPurpose` and `requestGateOpen` fields describe local configuration only. `liveReachability` is always `not-verified` because this read-only route does not send a probe or an image. A real response is accepted only if its reported model matches `GPT-5-Mini`; missing response identity is not fabricated from the outbound request setting.

## Request and data controls

- API keys remain server-side; no API key is returned by provider-list responses or sent to the browser.
- RULA and FMEA image endpoints authenticate the actor and check active organization membership and assessment permissions before invoking a provider.
- Images are validated for MIME type, file signature and size before external processing. No image bytes or prompt text are written into AI usage records or image-analysis audit metadata.
- Image calls do not use text failover. RULA image retry behavior is bounded; authorization, quota, privacy-gate, malformed-response and ambiguous network-drop errors are not automatically repeated by the client.
- Model observations remain advisory and must pass the existing RULA parsing, side-isolation and human-review rules. Existing scientific scoring functions are unchanged.
- Provider-reported token counts are persisted only when present; the application does not estimate missing usage.
- Provider errors returned to the user and audit metadata are normalized; upstream response bodies and credentials are not exposed.

## Deployment verification

1. Set `AI_ENABLED=true`, the approved provider name(s), the server-side credential and HTTPS base URL in the protected runtime configuration. Do not put secrets in source, browser configuration or deployment examples.
2. Call the authenticated `GET /api/v1/ai/providers` endpoint and confirm that the selected assessment provider is configured. The image request gate should remain closed until privacy and endpoint capability have separately been approved.
3. On a non-production environment, using an eligible test member and a permitted representative image, run one image request after approval. Verify the provider/model identity in the returned result, structured observation, human-review flow and persisted assessment; verify reported token usage only if the provider returns it.
4. If the provider does not support the exact model/image/JSON combination, leave approval unset. The smallest required follow-up is an explicitly approved provider configuration that supports the exact fixed model and contract, or a separately authorized product change to the model requirement.

No provider credential, account-specific environment file, database or live image-provider request was available for this 2026-10-15 source checkpoint. Therefore endpoint reachability, ArvanCloud GPT-5-Mini vision support, privacy approval and real-user image-analysis success remain unverified.
