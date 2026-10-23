import { isUsablePostureImageAuthorization, type PostureImageAuthorization } from "../account/postureImageAuthorization";
import { ACCOUNT_IMAGE_CONSENT_VERSION } from "../account/imageProcessingPolicy";

export type RulaImageAnalysisPolicy = { available: boolean; provider: string; reasonCode: string | null; consentAccepted?: boolean; consentVersion?: string };
export type RulaImageOwnership = { imageSubject: "SELF" | "THIRD_PARTY"; ownerAuthorizationId?: string };

export function isRulaImageOwnershipValid(ownership: RulaImageOwnership, grants: readonly PostureImageAuthorization[], recipientUserId: string, now = Date.now()): boolean {
  if (ownership.imageSubject === "SELF") return !ownership.ownerAuthorizationId;
  if (ownership.imageSubject !== "THIRD_PARTY" || !ownership.ownerAuthorizationId) return false;
  const grant = grants.find(item => item.id === ownership.ownerAuthorizationId);
  return Boolean(grant && isUsablePostureImageAuthorization(grant, recipientUserId, now));
}

export function rulaImagePolicyErrorKey(policy: RulaImageAnalysisPolicy | null): string | null {
  if (policy?.reasonCode === "account-consent-required") return "assessment.rulaImageConsentRequired";
  // Platform-blocked images retain their unsent status without a duplicate workspace notice.
  if (policy?.reasonCode === "privacy-approval-missing" || policy?.reasonCode === "vision-capability-unverified") return null;
  return "assessment.rulaImageAnalysisUnavailable";
}

/** Upload follows the server's current account-level consent and provider approval policy. */
export function authorizeRulaAutomaticImage(body: FormData, policy: RulaImageAnalysisPolicy | null, ownership: RulaImageOwnership, grants: readonly PostureImageAuthorization[] = [], recipientUserId = "") {
  if (!policy?.available || policy.provider !== "arvancloud") throw new Error("RULA_IMAGE_AI_UNAVAILABLE");
  if (!policy.consentAccepted || policy.consentVersion !== ACCOUNT_IMAGE_CONSENT_VERSION) throw Object.assign(new Error("IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED"), { code: "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED", retryable: false });
  if (!isRulaImageOwnershipValid(ownership, grants, recipientUserId)) throw Object.assign(new Error("RULA_IMAGE_OWNER_AUTHORIZATION_REQUIRED"), { code: "RULA_IMAGE_OWNER_AUTHORIZATION_REQUIRED", retryable: false });
  body.set("imageSubject", ownership.imageSubject);
  if (ownership.imageSubject === "THIRD_PARTY") body.set("ownerAuthorizationId", ownership.ownerAuthorizationId!);
  else body.delete("ownerAuthorizationId");
}

