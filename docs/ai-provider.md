# AI providers and fallback

Core workflows never require AI. The current fallback searches only published documents from the active organization and returns deterministic HSE guidance with citations and a human-review disclaimer.

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
  API->>MySQL: scoped knowledge search
  API->>Fallback: deterministic guidance
  Fallback-->>User: answer + citations + disclaimer
```

To add a provider, implement an adapter that accepts minimal scoped context, validates structured output, redacts secrets, times out, retries only transient failures and falls back without blocking the user.
