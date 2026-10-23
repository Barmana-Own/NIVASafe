# RULA image processing: direct account consent and platform eligibility

Current as of 2026-10-22 / 1405-07-30. The superseded upload-dialog contract is preserved in [history](history/rula-image-platform-access.before-direct-consent-20261022.md); it is not the current API contract.

## User consent and access

- Registration and account settings expose independent optional image consent, unchecked by default. General terms alone never authorize image transfer. Current policy is `image-processing-account-2026-10-22-v2`.
- `/api/v1/profile/image-processing-consent` reads/writes only the authenticated account's choice. Immutable receipts record acceptance, registration decline and withdrawal. Account updates are serialized and timestamped by the server. Existing users explicitly renew outdated consent in settings.
- Uploads do not ask for repeated confirmation. The image POST requires `imageSubject=SELF|THIRD_PARTY`; THIRD_PARTY additionally requires a valid authenticated owner grant. Multipart consent booleans or policy strings cannot replace current database authorization.
- `/api/v1/profile/posture-image-authorizations` manages same-organization, recipient-specific, expiring and revocable owner grants. Each grant binds the owner's original consent receipt; withdrawal and reacceptance cannot revive it.
- Current identity, organization/role/subscription, quota, user consent, owner grant and platform eligibility are rechecked immediately before each actual HTTP transfer and any malformed-answer retry. Mandatory transfer-audit failure prevents dispatch; a second fresh check closes withdrawal during the asynchronous audit.
- Frontend guidance for missing user consent links to `/profile#image-processing-consent`. Existing drafts, private saved results, manual editing and human review remain available.

## Platform provider status

`RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` represents established actual provider processing conditions at platform scope. It is not an organization allowlist or manual owner approval for individual users. `RULA_IMAGE_VISION_SUPPORTED_PROVIDER` separately records tested technical image capability. Consent, a working key and HTTP200 cannot establish provider contractual conditions.

The technical vision value is verified as `arvancloud`. The effective Production privacy value remains empty because this actual gateway's processing terms are unverified. Current research and the exact remaining evidence fields are in [provider research](legal/rula-provider-research.2026-10-22.md), [platform record](legal/rula-provider-activation-record.2026-10-22.json) and [required evidence](legal/rula-provider-required-evidence.2026-10-22.md). No ceremonial per-user or per-organization approval is introduced.

After actual terms and the applicable processing basis are established, finalize the notice and obtain a new consent version if materially changed, then configure the provider once for all eligible users/organizations. The PM2 process environment supplies the effective settings; changing `.env` alone does not override an existing process value. No pending record or document template enables the feature.

## Transfer, result and model contract

The fixed endpoint is `https://api.arvancloudai.ir/v1/chat/completions`, using the previously tested backend Bearer authentication. RULA and FMEA request `GPT-5-Mini`; chat requests `DeepSeek-V4-Flash`. Accepted effective assessment IDs are the exact configured ID, the verified Arvan `openai/gpt-5-mini` namespace, or a dated `gpt-5-mini-YYYY-MM-DD` snapshot. Other families/namespaces are rejected; assessments have no cross-model fallback.

RULA image fetches reject redirects, use a bounded default 60-second timeout and one transport attempt. Invalid structured answers have at most one further attempt with fresh authorization. The existing 8,000-token completion ceiling and quota reservation remain. Image size/signature/normalization checks remain enforced.

Validated output is saved as private `RULA_POSTURE_IMAGE` before returning `analysisRequestId`. GET `/api/v1/rula/posture-image-analysis/:id` requires the original actor AND organization and assessment permission. Generic AI list/get/retry/create and the queue cannot expose or replay this type. Stored result metadata excludes raw image bytes and full prompts. Existing assessment/private-file/PDF contracts and human-review requirements remain.

## Verification and activation status

The 2026-10-22 frozen candidate passed 715 backend and 471 frontend tests, typecheck/lint/build, 27 authenticated HTTP/database replay checks across two ordinary-user organizations, and a fresh actual synthetic BOTH request in about 23 seconds with durable retrieval and PDF. Prior actual RIGHT/LEFT/BOTH evidence is retained. Cumulative provider usage is 5/6; no real person's photo was used. Detailed evidence is in [test results](rula-direct-consent-2026-10-22/09-test-results.md).

Safe code release `release-rula-direct-consent-20261022-01` is published. Public real-photo activation remains BLOCKED by actual processing conditions. Technical success is not independent anatomical validation; provisional output and mandatory human review remain. No schema migration, historical scoring change, FMEA workflow removal or chatbot-model change was made. Existing data and assets are preserved through rollback.
