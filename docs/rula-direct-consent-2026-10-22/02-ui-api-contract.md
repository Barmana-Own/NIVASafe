# RULA direct consent — UI and typed contract

## Existing design preservation

Reuse current form controls, account consent card, compact image cards, RTL/localization and responsive spacing. No unrelated screen or layout changes. General terms version stays `nivasafe-terms-2026-10-19-v1`; account image consent becomes `image-processing-account-2026-10-22-v2`.

The exact Persian checkbox is: «اجازه می‌دهم تصاویر مربوط به ارزیابی پوسچر من برای تحلیل هوش مصنوعی، به سرویس پردازش تصویر ابر آروان ارسال شوند.» A concise provider/purpose/data/retention/deletion summary appears before it, with the existing privacy link. Unknown terms are labelled unknown and general activation pending; no invented guarantee is presented. Old V1 choice requires renewal. Registration checkbox defaults false. Account loading/error/save/withdrawal states remain accessible.

## Authenticated owner grant

Within account image-processing controls, a user may grant use of their own posture photos to an existing member's exact email in the current organization. The grant is bounded to current provider purpose/notice and an explicit expiry (default 30 days, maximum 90). Issued grants can be revoked. No email/message is sent automatically. Uploader chooses “my image” or an available owner grant before selecting images; this is an ownership declaration, not repeated processing-consent confirmation. A batch uses one subject; other subjects require another selection. Missing/expired/revoked grants block transfers.

### API

- `GET /profile/posture-image-authorizations?direction=issued|received` → `{grants:[{id,ownerUserId,ownerName,recipientUserId,recipientName,expiresAt,policyVersion,status}]}`; bounded to 50, current organization and actor's issued/received grants.
- `POST /profile/posture-image-authorizations` → strict `{recipientEmail,policyVersion,expiresInDays?:number}` (default 30, 1–90), returns grant; owner must have current consent. Recipient must be a different active member of this organization. Unknown/unavailable recipient uses a generic validation response.
- `DELETE /profile/posture-image-authorizations/:id` → revoke an actor-owned grant in this organization; append audit, no destructive deletion.
- Image multipart adds `imageSubject: SELF|THIRD_PARTY` and `ownerAuthorizationId?:uuid`. THIRD_PARTY requires the authenticated owner grant; SELF cannot supply a grant. All owner records and current owner consent are rechecked at dispatch.
- Image response adds `analysisRequestId: uuid`; existing analysis response fields remain.
- `GET /rula/posture-image-analysis/:id` retrieves stored result for the same actor, organization and permission; no raw image is included.

### UI states

Without account consent: clear existing Persian message/settings link and no request. Without third-party grant: explain missing grant and no request. During inference: existing loading card; on success: existing review/result. Real errors retain safe messages/retry semantics. The previously removed inactive-image sentence is not reinstated. No blocked state may claim active/completed analysis.

### Persistence and race rules

Owner grant actions use existing AuditLog with authenticated actor as owner, organization scope, UUID grant entity, target uploader, purpose/provider/version, server timestamp, expiry and revocation. Only the authenticated owner creates/revokes their grant; a client permission reference cannot invent ownership. Existing AIAnalysisRequest stores image fingerprint, subject/consent references and validated output under actor/organization. Results remain review-required.

STAGE_02_STATUS: PASS
