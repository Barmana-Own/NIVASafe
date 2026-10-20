import { describe, expect, it } from "vitest";
import { rulaPostureImageAnalysisRequestSchema } from "./rula-posture-image-request.js";

describe("RULA posture image analysis request", () => {
  it("accepts an image-first request without job or task details", () => {
    expect(rulaPostureImageAnalysisRequestSchema.parse({ bodySide: "RIGHT" })).toEqual({
      activityInfo: undefined,
      bodySide: "RIGHT",
      jobTitle: "",
      taskDescription: "",
      postureDescription: "",
      locale: "fa",
    });
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
