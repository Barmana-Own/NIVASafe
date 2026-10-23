# RULA image processing: platform access and informed upload

The product capability is available to all eligible organizations once the platform provider prerequisites are established. There is no organization allowlist or manual organization activation.

## Access and consent

- `GET /api/v1/rula/image-analysis-policy` checks authenticated, active membership, `assessments.create`, subscription and AI allowance. It returns platform availability, provider and a controlled reason code, with `Cache-Control: private, no-store`.
- `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER=arvancloud` records **real platform approval** for the intended provider and image transfer. The setting itself does not create a contract or privacy authorization.
- `RULA_IMAGE_VISION_SUPPORTED_PROVIDER=arvancloud` records verified provider image capability. It is independent of privacy approval and anatomical validation.
- Selecting new images opens the versioned bilingual processing dialog. Its checkbox starts unchecked and transfer remains blocked until the user explicitly accepts. Declining retains manual review. Registration, drafts, saved assessments and tenant changes do not grant consent; adding files resets it.
- The image POST requires `imageAnalysisConsent=true` and `imageAnalysisConsentVersion=rula-image-consent-2026-10-19-v1`. Missing/outdated versions return a non-retryable403. Server authorization, tenant checks, file validation, rate limits and quota reservation remain authoritative.
- After platform checks, the server awaits a durable `RULA_IMAGE_CONSENT_ACCEPTED` AuditLog event before any provider call. Existing actor/tenant/server-time/request linkage and a sent-image SHA256 bind the versioned receipt. No raw photo/full prompt is logged. Failure to record the receipt prevents transfer. Consent is not provider contractual approval.
- A closed platform gate prevents the frontend from queuing a paid image request. Existing saved results and explicit manual corrections remain accessible.
- Every image has its own review/edit action. Each side and affected body part needs the existing human review. Original AI provenance and reviewer edits remain separate; uncertain results must not be labeled final.

## Model contract

RULA and FMEA use only ArvanCloud `GPT-5-Mini`; the authenticated gateway has returned `gpt-5-mini-2025-08-07`. Chat remains ArvanCloud `DeepSeek-V4-Flash`. There is no model fallback for assessments. HTTP success does not demonstrate anatomical accuracy.

The2026-10-19 bounded synthetic run also observed the exact response IDs `GPT-5-Mini` and `openai/gpt-5-mini` from that same authenticated gateway. The latter previously caused an application model-identity rejection despite upstream HTTP200; the narrow Arvan-only matcher now accepts it for the configured GPT-5-Mini family and preserves the actual response ID. It does not rewrite it to a dated snapshot, change the requested model or call OpenAI directly. The final corrected image calls returned the bare/dated IDs; a new real namespaced response was not observed after the repair. Wrong families/namespaces/suffixes and assessment-model substitution for chat remain rejected.

## Outstanding production prerequisite

As of the 2026-10-19 release investigation, a documented platform image-transfer authorization/contract and privacy-policy approval for ArvanCloud have not been supplied or verified. Production gates remain closed.

The owner must supply or approve a recorded platform authorization covering the intended image categories, lawful user/worker transfer, provider contractual terms, retention/deletion and transparent user information. After the authorized operator verifies that record and technical capability, set the two provider settings in the effective platform configuration and use the verified named API release procedure. The current PM2 `productionAI` profile in `deployment/ecosystem.config.cjs` supplies empty gate values; those process-environment values take precedence over `.env`, so changing `.env` alone is insufficient. This is a single platform configuration action, not an organization-by-organization process. Keep informed upload consent and mandatory review enforced.

Approved synthetic staging tests are limited engineering tests; they do not constitute permission to transfer real people's photographs or independent ergonomist validation. No worker image from the reported failure is used in these tests.

The2026-10-19 evidence review is in `docs/legal/rula-image-processing-review.2026-10-19.md`. Complete only the real owner/provider decisions in `docs/legal/rula-image-platform-approval.2026-10-19.md`; this pending template is never treated as approval by code. The current notice explicitly states gateway-specific retention/training/deletion terms remain unverified. Finalize a new notice version with actual verified terms before public image activation. No per-organization enablement is introduced.

## Compatibility

The RULA landmark request uses the already supported 8,000-token completion ceiling after real 3,000-token responses ended with `finish_reason=length`. Quota reservation still applies to the full requested ceiling. In isolated staging, `RULA_IMAGE_PROVIDER_TIMEOUT_MS=120000` uses the existing supported image-specific timeout; production timing is not silently changed by publishing the code.

No database schema, migration, scoring thresholds, historical scoring version, support-ticket, FMEA business logic or chatbot behavior is changed by this release. Code/artifact rollback preserves newer database rows and uploaded files.
