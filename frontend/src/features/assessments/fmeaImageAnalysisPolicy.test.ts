import { describe, expect, it } from "vitest";
import { authorizeFmeaAutomaticImage, fmeaImagePolicyErrorKey } from "./fmeaImageAnalysisPolicy";

describe("FMEA image-analysis policy", () => {
  it("maps account consent and platform approval failures to actionable messages", () => {
    expect(fmeaImagePolicyErrorKey({ available: false, provider: "arvancloud", reasonCode: "account-consent-required" })).toBe("assessment.fmeaImageAccountConsentRequired");
    expect(fmeaImagePolicyErrorKey({ available: false, provider: "arvancloud", reasonCode: "privacy-approval-missing" })).toBe("assessment.fmeaImagePlatformNotApproved");
  });

  it("requires an available Arvan provider without sending per-image consent fields", () => {
    const body = new FormData();
    authorizeFmeaAutomaticImage(body, { available: true, provider: "arvancloud", reasonCode: null });
    expect(body.has("imageAnalysisConsent")).toBe(false);
    expect(body.has("imageAnalysisConsentVersion")).toBe(false);
    expect(() => authorizeFmeaAutomaticImage(body, { available: false, provider: "arvancloud", reasonCode: "privacy-approval-missing" })).toThrow("FMEA_IMAGE_AI_UNAVAILABLE");
    expect(() => authorizeFmeaAutomaticImage(body, { available: true, provider: "other", reasonCode: null })).toThrow("FMEA_IMAGE_AI_UNAVAILABLE");
  });
});
