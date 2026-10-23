import { afterEach, describe, expect, it, vi } from "vitest";
import { imageProviderApprovalFailure } from "./image-provider-approval.js";

describe("image provider approval gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(["rula-posture", "fmea-process"] as const)("allows explicit operator activation of %s without claiming verified vendor terms", purpose => {
    const scope = purpose === "rula-posture" ? "RULA" : "FMEA";
    const provider = { name: "arvancloud", available: () => true, supportsImages: () => true };
    vi.stubEnv(`${scope}_IMAGE_PRIVACY_APPROVED_PROVIDER`, "");
    vi.stubEnv(`${scope}_IMAGE_VISION_SUPPORTED_PROVIDER`, "arvancloud");
    vi.stubEnv(`${scope}_IMAGE_PROCESSING_ENABLED_PROVIDER`, "arvancloud");
    expect(imageProviderApprovalFailure(provider, purpose)).toBeNull();
    vi.stubEnv(`${scope}_IMAGE_PROCESSING_ENABLED_PROVIDER`, "other");
    expect(imageProviderApprovalFailure(provider, purpose)).toBe("privacy-approval-missing");
  });

  it("honors an explicit operator shutdown even when legacy approval remains configured", () => {
    const provider = { name: "arvancloud", available: () => true, supportsImages: () => true };
    vi.stubEnv("RULA_IMAGE_PRIVACY_APPROVED_PROVIDER", "arvancloud");
    vi.stubEnv("RULA_IMAGE_VISION_SUPPORTED_PROVIDER", "arvancloud");
    vi.stubEnv("RULA_IMAGE_PROCESSING_ENABLED_PROVIDER", "");
    expect(imageProviderApprovalFailure(provider, "rula-posture")).toBe("privacy-approval-missing");
  });

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
