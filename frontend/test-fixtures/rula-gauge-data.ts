import type { RulaPostureAnalysisStep } from "../src/features/assessments/AssessmentPages";

type Analysis = Parameters<typeof RulaPostureAnalysisStep>[0]["analysis"];
export type RulaGaugeState = "pending" | "partial" | "low" | "medium" | "high" | "critical";

export function rulaGaugeAnalysis(state: RulaGaugeState): Analysis {
  const row = (score = 1): Analysis["upperArm"] => ({ angle: 0, score, detected: true, source: "USER", confirmedByUser: true });
  const analysis: Analysis = {
    upperArm: row(), lowerArm: row(), wrist: row(), wristTwist: row(), neck: row(), trunk: row(), legs: row(),
    adjustments: { force: state === "medium" ? 2 : state === "high" || state === "critical" ? 3 : 0, muscleUse: state === "high" || state === "critical" },
  };
  if (state === "critical") Object.assign(analysis, { upperArm: row(6), lowerArm: row(3), wrist: row(4), wristTwist: row(2), neck: row(6), trunk: row(6), legs: row(2) });
  if (state === "pending") for (const part of ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"] as const) analysis[part] = { ...row(), source: "DEFAULT", confirmedByUser: false };
  if (state === "partial") analysis.wristTwist = {
    angle: null, score: 1, detected: false, source: "AI", confirmedByUser: false, requiresReview: true,
    measurement: { version: "image-plane-audit-v1", state: "UNMEASURABLE", basis: "UNSUPPORTED", aiAngle: null, aiScore: 1, aiDetected: false, geometryAngle: null, qualityCodes: ["OUT_OF_PLANE_UNMEASURABLE"], view: "UNKNOWN", width: 64, height: 96, landmarks: [] },
  };
  return analysis;
}
