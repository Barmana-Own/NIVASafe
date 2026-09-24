export type RiskLevel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskThresholds { medium: number; high: number; critical: number }
export const DEFAULT_THRESHOLDS: RiskThresholds = { medium: 101, high: 201, critical: 401 };
export const DEFAULT_LOW_RISK_BOUNDARY = 51;

export function calculateRpn(severity: number, occurrence: number, detection: number): number {
  for (const [name, value] of Object.entries({ severity, occurrence, detection })) {
    if (!Number.isInteger(value) || value < 1 || value > 10) throw new RangeError(`${name} must be an integer from 1 to 10`);
  }
  return severity * occurrence * detection;
}

export function riskLevel(rpn: number, thresholds = DEFAULT_THRESHOLDS): RiskLevel {
  if (rpn >= thresholds.critical) return "CRITICAL";
  if (rpn >= thresholds.high) return "HIGH";
  if (rpn >= thresholds.medium) return "MEDIUM";
  if (rpn >= DEFAULT_LOW_RISK_BOUNDARY) return "LOW";
  return "VERY_LOW";
}

export interface RulaInput {
  upperArm: number; lowerArm: number; wrist: number; wristTwist: number;
  neck: number; trunk: number; legs: number; muscleUse: boolean; force: number;
}

export type RulaPosturePart = "upperArm" | "lowerArm" | "wrist" | "wristTwist" | "neck" | "trunk" | "legs";

/**
 * Return the reviewable score suggestion for an angle entered by an assessor.
 * This is intentionally separate from the final RULA calculation: the user
 * remains able to override the suggestion before submitting an assessment.
 */
export function suggestedRulaPostureScore(part: RulaPosturePart, angle: number, detected: boolean, fallback = 1): number {
  if (!Number.isFinite(angle)) return fallback;
  if (part === "wristTwist") return detected ? (Math.abs(angle) <= 45 ? 1 : 2) : 1;
  const value = Math.abs(angle);
  if (part === "upperArm") return value <= 20 ? 1 : value <= 45 ? 2 : value <= 90 ? 3 : value <= 120 ? 4 : value <= 150 ? 5 : 6;
  if (part === "lowerArm") return value >= 60 && value <= 100 ? 1 : value >= 0 && value <= 120 ? 2 : 3;
  if (part === "wrist") return value <= 15 ? 1 : value <= 30 ? 2 : value <= 45 ? 3 : value <= 90 ? 4 : 5;
  if (part === "neck") return value <= 10 ? 1 : value <= 20 ? 2 : value <= 45 ? 3 : value <= 90 ? 4 : 5;
  if (part === "trunk") return value <= 5 ? 1 : value <= 20 ? 2 : value <= 60 ? 3 : value <= 90 ? 4 : 5;
  if (part === "legs") return value <= 10 ? 1 : value <= 30 ? 2 : 3;
  return fallback;
}

export interface RulaResult { score: number; actionLevel: 1 | 2 | 3 | 4; explanation: string; trace: string[]; groupA: number; groupB: number; adjustment: number }

export function calculateRula(input: RulaInput): RulaResult {
  const values = [input.upperArm, input.lowerArm, input.wrist, input.wristTwist, input.neck, input.trunk, input.legs];
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) throw new RangeError("Posture scores must be integers from 1 to 6");
  if (!Number.isInteger(input.force) || input.force < 0 || input.force > 3) throw new RangeError("Force must be from 0 to 3");
  const groupA = Math.min(8, Math.ceil((input.upperArm * 2 + input.lowerArm + input.wrist + input.wristTwist) / 3));
  const groupB = Math.min(7, Math.ceil((input.neck * 2 + input.trunk * 2 + input.legs) / 3));
  const adjustment = (input.muscleUse ? 1 : 0) + input.force;
  const postureScore = Math.ceil((groupA + groupB) / 2);
  const score = Math.max(1, Math.min(7, postureScore + adjustment));
  const actionLevel = score <= 2 ? 1 : score <= 4 ? 2 : score <= 6 ? 3 : 4;
  const explanations = ["Acceptable posture", "Further investigation may be needed", "Investigate and change soon", "Investigate and change immediately"];
  return { score, actionLevel, explanation: explanations[actionLevel - 1]!, trace: [`Group A: ${groupA}`, `Group B: ${groupB}`, `Adjustment: muscle use ${input.muscleUse ? 1 : 0} + force ${input.force} = ${adjustment}`, `Final score: ${score}`], groupA, groupB, adjustment };
}

export * from "./validation.js";
export * from "./subscriptions.js";
