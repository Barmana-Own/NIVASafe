# Direct consent API contract

Date: 2026-10-22 / 1405-07-30.

All paths below have `/api/v1` prefix. Existing response envelopes and bearer sessions are preserved.

| Method/path | Contract and boundary |
|---|---|
| GET `/profile/image-processing-consent` | Authenticated active account; current V2 acceptance, record and server time; works independently of a stale selected organization. Private, no-store. |
| PUT `/profile/image-processing-consent` | Strict `{accepted:boolean, policyVersion:"image-processing-account-2026-10-22-v2"}`. User-row transaction lock and monotonically increasing receipt time serialize updates. No caller-selected actor or tenant. |
| GET `/profile/posture-image-authorizations?direction=issued\|received` | Current organization membership; bounded 50 grants with computed current status. |
| POST `/profile/posture-image-authorizations` | Owner's current consent plus active same-organization recipient with assessment permission; strict recipient email/current policy/1–90 day expiry. Immutable authenticated grant bound to owner's receipt. |
| DELETE `/profile/posture-image-authorizations/:id` | Only that grant's authenticated owner in its organization can revoke. |
| GET `/rula/image-analysis-policy` | Authenticated organization-scoped availability combines current consent and the platform provider/vision state; no organization allowlist. |
| POST `/rula/posture-image-analysis` | Multipart image, required `imageSubject=SELF\|THIRD_PARTY`, owner authorization UUID for THIRD_PARTY, `bodySide=RIGHT\|LEFT\|BOTH`, locale and optional assessment context. Existing 10 MB/signature/MIME checks and 8/min limit. No caller consent boolean substitutes for the database receipt. |
| GET `/rula/posture-image-analysis/:id` | Original actor AND tenant plus assessment permission; returns validated stored findings and `analysisRequestId`. Private, no-store. |

Image dispatch checks current account identity, role, organization, quota, current consent, photo-owner grant and platform eligibility. The internal provider hook repeats this check immediately before the actual HTTP request, including each malformed-answer retry. A mandatory pre-transfer audit and a second fresh check prevent a withdrawal during audit from authorizing a new transfer. In-flight transfers already sent cannot be recalled.

`IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED` and owner/authorization failures are nonretryable 403 responses. The frontend displays consent guidance and an account-settings link without an upload confirmation dialog. `RULA_IMAGE_RESULT_SAVE_FAILED` is a safe nonretryable 503. Network inference has a bounded 60-second timeout and no automatic transport replay; malformed structured output has at most one additional attempt with fresh authorization.

Reserved `RULA_POSTURE_IMAGE` records are excluded from generic `/ai/requests` list/read/retry and rejected on generic creation. The worker refuses forged queue jobs for this type. Existing RULA draft, attachment and PDF contracts remain unchanged.

Production provider eligibility remains platform-wide. The existing `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` reflects verified provider processing conditions, not permission from management for individual organizations. Its empty live value has not been relabeled as approved.
