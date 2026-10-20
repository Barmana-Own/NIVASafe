import { afterEach, describe, expect, it, vi } from "vitest";
import { imageProviderApprovalFailure } from "./image-provider-approval.js";

describe("image provider approval gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("requires privacy approval and verified vision capability for the exact provider", () => {
    const provider = { name: "arvancloud", available: () => true, supportsImages: () => true };
    vi.stubEnv("RULA_IMAGE_PRIVACY_APPROVED_PROVIDER", "arvancloud");
    expect(imageProviderApprovalFailure(provider, "rula-posture")).toBe("vision-capability-unverified");
    vi.stubEnv("RULA_IMAGE_VISION_SUPPORTED_PROVIDER", "gapgpt");
    expect(imageProviderApprovalFailure(provider, "rula-posture")).toBe("vision-capability-unverified");
    vi.stubEnv("RULA_IMAGE_VISION_SUPPORTED_PROVIDER", "arvancloud");
    expect(imageProviderApprovalFailure(provider, "rula-posture")).toBeNull();
  });

  it("blocks unapproved, unavailable and unsupported image providers before a request", () => {
    const provider = { name: "arvancloud", available: () => false, supportsImages: () => true };
    vi.stubEnv("FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER", "other");
    vi.stubEnv("FMEA_IMAGE_VISION_SUPPORTED_PROVIDER", "arvancloud");
    expect(imageProviderApprovalFailure(provider, "fmea-process")).toBe("privacy-approval-missing");
    vi.stubEnv("FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER", "arvancloud");
    expect(imageProviderApprovalFailure(provider, "fmea-process")).toBe("provider-unavailable");
    expect(imageProviderApprovalFailure({ ...provider, available: () => true, supportsImages: () => false }, "fmea-process")).toBe("image-purpose-unsupported");
  });

  it("requires FMEA image approval separately from RULA approval", () => {
    const provider = { name: "arvancloud", available: () => true, supportsImages: () => true };
    vi.stubEnv("RULA_IMAGE_PRIVACY_APPROVED_PROVIDER", "arvancloud");
    vi.stubEnv("RULA_IMAGE_VISION_SUPPORTED_PROVIDER", "arvancloud");
    expect(imageProviderApprovalFailure(provider, "fmea-process")).toBe("privacy-approval-missing");
    vi.stubEnv("FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER", "arvancloud");
    expect(imageProviderApprovalFailure(provider, "fmea-process")).toBe("vision-capability-unverified");
    vi.stubEnv("FMEA_IMAGE_VISION_SUPPORTED_PROVIDER", "arvancloud");
    expect(imageProviderApprovalFailure(provider, "fmea-process")).toBeNull();
  });
});
