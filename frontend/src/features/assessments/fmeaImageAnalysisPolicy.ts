export type FmeaImageAnalysisPolicy = {
  available: boolean;
  provider: string;
  reasonCode: string | null;
  consentAccepted?: boolean;
  consentVersion?: string;
};

export function fmeaImagePolicyErrorKey(policy: FmeaImageAnalysisPolicy | null) {
  if (policy?.reasonCode === "account-consent-required") return "assessment.fmeaImageAccountConsentRequired";
  if (policy?.reasonCode === "privacy-approval-missing" || policy?.reasonCode === "vision-capability-unverified") return "assessment.fmeaImagePlatformNotApproved";
  return "assessment.fmeaProcessImageUnavailable";
}

/** Upload follows the server's current account-level consent and provider approval policy. */
export function authorizeFmeaAutomaticImage(_body: FormData, policy: FmeaImageAnalysisPolicy | null) {
  if (!policy?.available || policy.provider !== "arvancloud") throw new Error("FMEA_IMAGE_AI_UNAVAILABLE");
}
