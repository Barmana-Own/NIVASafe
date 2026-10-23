import type { AIProviderInput } from "./ai-provider.js";

export type ImageAnalysisProvider = {
  name: string;
  available(): boolean;
  supportsImages(input?: Pick<AIProviderInput, "imagePurpose">): boolean;
};

export type ImageProviderApprovalFailure =
  | "privacy-approval-missing"
  | "vision-capability-unverified"
  | "provider-unavailable"
  | "image-purpose-unsupported";

/** Operator activation is separate from claims about the vendor's processing terms. */
export function isImageProcessingEnabled(provider: string, imagePurpose: NonNullable<AIProviderInput["imagePurpose"]>): boolean {
  const scope = imagePurpose === "rula-posture" ? "RULA" : "FMEA";
  const enabled = process.env[`${scope}_IMAGE_PROCESSING_ENABLED_PROVIDER`];
  // An explicit setting, including an empty value, takes precedence over legacy approval.
  return enabled !== undefined ? enabled === provider : process.env[`${scope}_IMAGE_PRIVACY_APPROVED_PROVIDER`] === provider;
}

export function imageProviderApprovalFailure(provider: ImageAnalysisProvider, imagePurpose: NonNullable<AIProviderInput["imagePurpose"]>): ImageProviderApprovalFailure | null {
  const scope = imagePurpose === "rula-posture" ? "RULA" : "FMEA";
  if (!isImageProcessingEnabled(provider.name, imagePurpose)) return "privacy-approval-missing";
  if (process.env[`${scope}_IMAGE_VISION_SUPPORTED_PROVIDER`] !== provider.name) return "vision-capability-unverified";
  if (!provider.available()) return "provider-unavailable";
  if (!provider.supportsImages({ imagePurpose })) return "image-purpose-unsupported";
  return null;
}
