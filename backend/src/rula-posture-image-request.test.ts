import { describe, expect, it } from "vitest";
import { rulaPostureImageAnalysisRequestSchema } from "./rula-posture-image-request.js";

describe("RULA posture image analysis request", () => {
  it("accepts an image-first request without job or task details", () => {
    expect(rulaPostureImageAnalysisRequestSchema.parse({ bodySide: "RIGHT", imageSubject: "SELF" })).toEqual({
      imageSubject: "SELF",
      activityInfo: undefined,
      bodySide: "RIGHT",
      jobTitle: "",
      taskDescription: "",
      postureDescription: "",
      locale: "fa",
    });
  });
  it("requires an ownership declaration and rejects forged or conflicting owner references", () => {
    expect(() => rulaPostureImageAnalysisRequestSchema.parse({ bodySide: "RIGHT" })).toThrow();
    expect(() => rulaPostureImageAnalysisRequestSchema.parse({ bodySide: "RIGHT", imageSubject: "THIRD_PARTY" })).toThrow();
    expect(() => rulaPostureImageAnalysisRequestSchema.parse({ bodySide: "RIGHT", imageSubject: "THIRD_PARTY", ownerAuthorizationId: "unverified-reference" })).toThrow();
    expect(() => rulaPostureImageAnalysisRequestSchema.parse({ bodySide: "RIGHT", imageSubject: "SELF", ownerAuthorizationId: "11111111-1111-4111-8111-111111111111" })).toThrow();
    expect(rulaPostureImageAnalysisRequestSchema.parse({ bodySide: "BOTH", imageSubject: "THIRD_PARTY", ownerAuthorizationId: "11111111-1111-4111-8111-111111111111" })).toMatchObject({ imageSubject: "THIRD_PARTY" });
  });

  it("keeps optional structured activity context fully validated", () => {
    expect(() => rulaPostureImageAnalysisRequestSchema.parse({
      bodySide: "RIGHT",
      activityInfo: { jobTitle: "", taskDescription: "" },
    })).toThrow();
    expect(() => rulaPostureImageAnalysisRequestSchema.parse({
      bodySide: "RIGHT",
      taskDescription: "x".repeat(501),
    })).toThrow();
  });
});
