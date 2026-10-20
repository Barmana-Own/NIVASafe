import { expect, it } from "vitest";
import { rulaPostureAnalysisSchema } from "./rula-posture.js";
const row = { angle: 20, score: 2, detected: true, source: "USER", confirmedByUser: true };
const analysis = { upperArm: row, lowerArm: row, wrist: row, wristTwist: row, neck: row, trunk: row, legs: row };
it("round-trips bounded editable row details and deletion without losing anatomical inputs", () => {
  const details = { id: "neck:action", group: "B", bodyPart: "Neck", scoreShare: 30, title: "Adjust height", description: "Raise the work surface", priority: "HIGH", status: "COMPLETED", deleted: true };
  const parsed = rulaPostureAnalysisSchema.parse({ ...analysis, evaluationRows: [details] });
  expect(parsed.evaluationRows).toEqual([details]); expect(parsed.neck.score).toBe(2);
  for (const invalid of [{ ...details, scoreShare: 101 }, { ...details, id: "" }, { ...details, status: "admin" }, { ...details, group: "x".repeat(17) }, { ...details, title: "x".repeat(241) }, { ...details, organizationId: "other" }]) expect(rulaPostureAnalysisSchema.safeParse({ ...analysis, evaluationRows: [invalid] }).success).toBe(false);
});
