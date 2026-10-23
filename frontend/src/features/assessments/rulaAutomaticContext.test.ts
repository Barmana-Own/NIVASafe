import { expect, it } from "vitest";
import { rulaAutomaticReviewContext } from "./rulaAnalysisQueue";

it("keeps an in-flight image analysis when the user fills activity text", () => {
  const context = { bodySide: "RIGHT", locale: "en", jobTitle: "", taskDescription: "", postureDescription: "", activityInfo: null };
  expect(rulaAutomaticReviewContext("images", context)).toBe(rulaAutomaticReviewContext("images", { ...context, jobTitle: "Operator", taskDescription: "Assembly", activityInfo: { loadWeight: 2 } }));
  expect(rulaAutomaticReviewContext("images", context)).not.toBe(rulaAutomaticReviewContext("images", { ...context, bodySide: "LEFT" }));
  expect(rulaAutomaticReviewContext("text", context)).not.toBe(rulaAutomaticReviewContext("text", { ...context, jobTitle: "Operator", taskDescription: "Assembly" }));
  expect(rulaAutomaticReviewContext("images", context)).not.toBe(rulaAutomaticReviewContext("images", { ...context, imageSubject: "THIRD_PARTY", ownerAuthorizationId: "grant-a" }));
  expect(rulaAutomaticReviewContext("images", { ...context, imageSubject: "THIRD_PARTY", ownerAuthorizationId: "grant-a" })).not.toBe(rulaAutomaticReviewContext("images", { ...context, imageSubject: "THIRD_PARTY", ownerAuthorizationId: "grant-b" }));
});
