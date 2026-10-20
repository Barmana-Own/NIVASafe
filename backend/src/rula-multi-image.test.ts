import { describe, expect, it, vi } from "vitest";
import { calculateRula } from "@nivasafe/domain";
vi.mock("./core.js", () => ({ prisma: {}, audit: vi.fn(), envelope: vi.fn(), parse: vi.fn(), requireOrg: vi.fn(), requirePermission: vi.fn() }));
import { calculateRulaAssessment } from "./modules/assessments.js";
import { rulaPostureAnalysisSchema } from "./rula-posture.js";

const row = { angle: 0, score: 1, detected: true, source: "AI" as const, confirmedByUser: false };
const neutral = { upperArm: row, lowerArm: row, wrist: row, wristTwist: row, neck: row, trunk: row, legs: row };
const bent = { ...neutral, upperArm: { ...row, score: 4 }, neck: { ...row, score: 4 }, trunk: { ...row, score: 4 }, legs: { ...row, score: 2 } };
const inputs = { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, force: 0, muscleUse: false };
const images = [
  { imageKey: "neutral", fileName: "one.png", analysis: neutral, force: 0, muscleUse: false },
  { imageKey: "bent", fileName: "two.png", analysis: bent, force: 2, muscleUse: true },
];
describe("Server authoritative multi-image RULA assessment", () => {
  it('uses tables for new/reviewed scores but preserves historical scores for metadata-only updates', () => {
    const legacy={...inputs,algorithmVersion:'legacy-average-v1' as const};
    expect(calculateRulaAssessment('RIGHT',inputs,neutral).inputs.algorithmVersion).toBe('cornell-worksheet-2001-tables-v1');
    expect(calculateRulaAssessment('RIGHT',legacy,neutral,false).result.score).toBe(2);
    expect(calculateRulaAssessment('RIGHT',legacy,neutral,true).result.score).toBe(1);
  });
  it("scores and stores the worst whole image even when the client sends a neutral primary posture", () => {
    const calculation = calculateRulaAssessment("RIGHT", inputs, { ...neutral, imageAssessments: images });
    expect(calculation.result.score).toBe(calculateRula({ ...inputs, upperArm: 4, neck: 4, trunk: 4, legs: 2, force: 2, muscleUse: true }).score);
    expect(calculation.analysis?.trunk.score).toBe(4);
    expect(calculation.inputs.force).toBe(2);
    expect(calculation.analysis?.imageAssessments).toHaveLength(2);
    expect(calculateRulaAssessment("RIGHT", inputs, { ...neutral, imageAssessments: [...images].reverse() }).result.score).toBe(calculation.result.score);
  });
  it("preserves report row edits when another image becomes the highest risk", () => {
    const evaluationRows = [{ id: "neck", group: "B", scoreShare: 35, deleted: true }];
    const calculation = calculateRulaAssessment("RIGHT", inputs, { ...neutral, evaluationRows, imageAssessments: images });
    expect(calculation.analysis?.evaluationRows).toEqual(evaluationRows);
    expect(calculation.analysis?.trunk.score).toBe(4);
  });
  it("rejects an unreviewed image rather than silently omitting it from the final risk", () => {
    expect(() => calculateRulaAssessment("RIGHT", inputs, { ...neutral, imageAssessments: [{ ...images[0]!, analysis: { ...neutral, trunk: { ...row, source: "DEFAULT" } } }] })).toThrow();
  });
  it("requires both anatomical sides in every BOTH-side image", () => {
    expect(() => calculateRulaAssessment("BOTH", inputs, { ...neutral, imageAssessments: images })).toThrow();
    const both = { ...neutral, sideAnalyses: { LEFT: bent, RIGHT: neutral } };
    expect(calculateRulaAssessment("BOTH", inputs, { ...both, imageAssessments: [{ ...images[0]!, analysis: both }] }).result.score).toBeGreaterThan(calculateRula(inputs).score);
  });
  it("bounds image count, adjustments, attachment IDs and rejects recursively nested snapshots", () => {
    expect(rulaPostureAnalysisSchema.safeParse({ ...neutral, imageAssessments: Array(5).fill(images[0]) }).success).toBe(false);
    expect(rulaPostureAnalysisSchema.safeParse({ ...neutral, imageAssessments: [{ ...images[0]!, force: 4 }] }).success).toBe(false);
    expect(rulaPostureAnalysisSchema.safeParse({ ...neutral, imageAssessments: [{ ...images[0]!, attachmentId: "../private" }] }).success).toBe(false);
    expect(rulaPostureAnalysisSchema.safeParse({ ...neutral, imageAssessments: [{ ...images[0]!, analysis: { ...neutral, imageAssessments: images } }] }).success).toBe(false);
  });
});
