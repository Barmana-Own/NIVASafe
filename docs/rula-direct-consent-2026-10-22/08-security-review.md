# Scoped security gate

Date: 2026-10-22 / 1405-07-30.

PASS for the changed implementation and immediate trust boundaries. Independent review inspected 25 candidate files. The sole material finding, DC-SEC-001 (Medium), was default HTTP redirect following after an authorized image POST. It is fixed with `redirect: "error"` for RULA image dispatch, before the current-authorization hook. A dedicated failure regression plus all 57 provider tests passed; the final backend full suite passed 715 cases after the repair.

The assets are user/owner consent receipts, private images, validated posture findings, quotas, organization boundaries and the backend API key. Entry points are authenticated signup/profile/grant/image/result APIs and the worker. The external processing boundary is the fixed Arvan endpoint. The client is never authoritative for consent, membership, current quota or owner permission.

Reviewed controls include current actor/tenant/role authorization, withdrawal during asynchronous audit, owner grant expiry and receipt binding, strict upload normalization/signature/pixel limits, fixed endpoint/model and redirect rejection, secret/log redaction, input/output validation, bounded HTTP attempts, private results excluded from generic AI and worker paths, and client account/organization cache reset. Completion-audit outage cannot discard a committed result; mandatory transfer authorization audit still fails closed.

No runtime dependency was added or upgraded in the isolated candidate. A new full dependency advisory scan and external penetration test were NOT_RUN; this is not a whole-repository security certification. Exact inspected file hashes and the independent findings are in `reports/evidence/rula-direct-consent-20261022-01/stage08-independent-review.json` and `.md`.

The real gateway/account processing conditions remain UNVERIFIED. Production approval stays empty; scoped code review, synthetic tests and user consent do not establish a provider contract. SELF remains an ownership declaration, not biometric identification. Anatomical accuracy remains independently unverified and human review is preserved.
