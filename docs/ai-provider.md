# AI providers and fallback

Core workflows never require AI. Risk-analysis fallback searches only published documents from the active organization and returns deterministic HSE guidance with citations and a human-review disclaimer. Chat uses a separate localized offline notice when its configured model cannot respond, without presenting generic guidance as a model answer.

```mermaid
sequenceDiagram
  User->>API: message + organization scope
  API->>MySQL: scoped knowledge search
  API->>Provider: optional minimal context
  Provider-->>API: response
  API-->>User: answer + citations + disclaimer
```

```mermaid
sequenceDiagram
  User->>API: message
  API-xProvider: unavailable or disabled
  API->>Fallback: localized connection notice
  Fallback-->>User: offline notice without citations
```

## ArvanCloud AI configuration

The production adapter is OpenAI-compatible and sends requests only from the API server to ArvanCloud AI's `chat/completions` endpoint; the API key is never exposed to the browser. Configure the two application roles independently:

```dotenv
AI_ENABLED=true
ARVAN_API_KEY=replace-with-a-secret-api-key
ARVAN_BASE_URL=https://api.arvancloudai.ir/v1
AI_RISK_PROVIDER=arvancloud
AI_RISK_MODEL=GPT-5-Mini
AI_RISK_FALLBACK_PROVIDER=arvancloud
AI_RISK_FALLBACK_MODEL=GPT-5-Mini
AI_CHAT_PROVIDER=arvancloud
AI_CHAT_MODEL=DeepSeek-V4-Flash
AI_CHAT_MAX_OUTPUT_TOKENS=900
AI_MAX_OUTPUT_TOKENS=1600
AI_PROVIDER_TIMEOUT_MS=30000
AI_PROVIDER_MAX_ATTEMPTS=2
AI_PROVIDER_RETRY_DELAY_MS=250
```

Risk-analysis requests use `AI_RISK_MODEL` (`GPT-5-Mini`). If the primary call fails or times out, `AI_RISK_FALLBACK_PROVIDER` and `AI_RISK_FALLBACK_MODEL` use the configured ArvanCloud AI credential with `GPT-5-Mini`; the deterministic, organization-scoped knowledge-base fallback remains the final path. Chat messages use `AI_CHAT_MODEL` (`DeepSeek-V4-Flash`). The authenticated `GET /api/v1/ai/providers` response reports configuration without returning credentials; it does not verify live model reachability, so the assistant UI labels configuration as unverified until a model response is received. Risk requests submitted without an explicit non-default provider use the complete automatic failover chain; an explicitly requested provider remains isolated to that provider. If chat model failover is exhausted, the API stores and returns the stable Persian or English offline notice without citations.

## GapGPT-compatible risk provider

The optional `gapgpt` adapter uses the configured OpenAI-compatible base URL and the role-specific model setting. It is intended for risk analysis and requires `GAPGPT_API_KEY` and an HTTPS `GAPGPT_BASE_URL`; an explicitly configured local development URL is allowed only outside production. The RULA posture-image route calls the dedicated GapGPT adapter directly, sends exactly one image per multimodal request, and has no provider fallback. GapGPT image capability is scoped to RULA posture images; FMEA process images continue to require a provider that explicitly supports that purpose. The service's live model/catalog availability must be verified in the deployment environment; automated adapter tests use a mocked HTTP response and do not verify external connectivity.

All HTTP adapters use a bounded timeout (`AI_PROVIDER_TIMEOUT_MS`, default 30 seconds), at most two total attempts by default (`AI_PROVIDER_MAX_ATTEMPTS`, maximum three), and a capped exponential delay for transient network, rate-limit and 5xx responses (`AI_PROVIDER_RETRY_DELAY_MS`). Non-transient failures are not retried. Retry and failover errors are normalized before they are stored in AI request records, so upstream messages and credentials are not exposed to users or logs. Chat requests use a bounded knowledge context (up to three relevant documents and 900 characters per document), include up to six prior messages from the authenticated user's own conversation, and default to a 900-token output cap through `AI_CHAT_MAX_OUTPUT_TOKENS`; risk-analysis requests retain the broader context and the `AI_MAX_OUTPUT_TOKENS` setting. These limits reduce prompt and generation time while keeping the controls configurable per deployment.

Successful external-provider calls persist the provider-reported input, output and total token counts in `AIUsageRecord`, linked to the initiating user, organization and source request/message. The global administration panel reads all-user aggregates and an organization administrator reads only the selected organization's aggregates through `GET /api/v1/admin/ai-usage`; prompts, completions and credentials are not included. Calls without provider-reported usage are not estimated or counted as token consumption, and the source key makes recording idempotent across retries.

ArvanCloud-backed FMEA and RULA assessment analysis, process suggestions, report detail suggestions and corrective-action suggestions use the dedicated assessment model constant `GPT-5-Mini`. For GapGPT, assessment analysis respects `AI_RISK_MODEL` so the endpoint receives its configured model identifier. Chat remains independently configured through `AI_CHAT_MODEL` (`DeepSeek-V4-Flash`). Corrective-action endpoints validate structured JSON, keep suggestions advisory, record provider/model/token metadata when available, and use deterministic localized fallbacks so an empty panel is not presented for a report that has risk or posture data.

FMEA process suggestions use the same server-side risk provider and send only bounded job/process context. The API sanitizes structured arrays and description output, marks the response as connected/fallback/unavailable, and keeps the database catalog suggestions available when the external provider is unavailable. AI output is presented as a suggestion and is not written into the FMEA until the user confirms it. RULA task-description improvement uses a separate RULA-specific prompt and sends only the job title, current task text (maximum 500 characters) and locale to the configured risk provider after the user requests the suggestion; it explicitly disables organization-knowledge retrieval and does not send posture notes or images. The returned suggestion is bounded, editable and never persisted until accepted. An alternate risk model must be configured with an identifier supported by the provider's current model catalog; no unverified model identifier is hard-coded into the application.

FMEA process-image review uses the same risk route with an OpenAI-compatible multimodal message containing the validated image data URI. ArvanCloud supports this flow; failover skips providers that do not explicitly support the requested image purpose rather than silently discarding the image. RULA allows up to four stored images per assessment and separately analyzes each uploaded image through GapGPT only. Each image call is separately validated and audited without storing image bytes in AI usage records or audit metadata. The image itself is not included in AI usage records or audit metadata; only the MIME type, byte size, provider status and result counts are recorded.

To add another provider, implement an adapter that accepts minimal scoped context, validates structured output, redacts secrets, uses the shared timeout/retry transport, and participates in the role-specific routing chain without blocking the user. API keys must remain in ignored server environment files; no frontend bundle, source file or API response contains a credential.
