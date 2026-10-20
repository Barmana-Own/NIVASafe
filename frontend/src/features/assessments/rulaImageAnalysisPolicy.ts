export type RulaImageAnalysisPolicy = { available: boolean; provider: string; reasonCode: string | null; consentAccepted?: boolean; consentVersion?: string };

export function rulaImagePolicyErrorKey(policy: RulaImageAnalysisPolicy | null) {
  if (policy?.reasonCode === "account-consent-required") return "assessment.rulaImageConsentRequired";
  if (policy?.reasonCode === "privacy-approval-missing") return "assessment.rulaImagePlatformNotApproved";
  if (policy?.reasonCode === "vision-capability-unverified") return "assessment.rulaImageVisionNotApproved";
  return "assessment.rulaImageAnalysisUnavailable";
}

/** Upload follows the server's current account-level consent and provider approval policy. */
export function authorizeRulaAutomaticImage(_body: FormData, policy: RulaImageAnalysisPolicy | null) {
  if (!policy?.available || policy.provider !== "arvancloud") throw new Error("RULA_IMAGE_AI_UNAVAILABLE");
}

