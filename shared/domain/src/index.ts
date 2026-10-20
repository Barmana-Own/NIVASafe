import { RULA_TABLE_A, RULA_TABLE_B, RULA_TABLE_C } from './rula-tables.js';
export { RULA_ALGORITHM_VERSION, RULA_POSTURE_SCORE_LIMITS } from './rula-tables.js';

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
  algorithmVersion?: 'legacy-average-v1' | 'cornell-worksheet-2001-tables-v1';
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
  if (part === "upperArm") return angle < -20 ? 2 : value <= 20 ? 1 : value <= 45 ? 2 : value <= 90 ? 3 : 4;
  if (part === "lowerArm") return value >= 60 && value <= 100 ? 1 : 2;
  if (part === "wrist") return value === 0 ? 1 : value <= 15 ? 2 : 3;
  if (part === "neck") return angle < 0 ? 4 : value <= 10 ? 1 : value <= 20 ? 2 : 3;
  if (part === "trunk") return value === 0 ? 1 : value <= 20 ? 2 : value <= 60 ? 3 : 4;
  // Leg support/balance is a reviewed categorical observation, not a knee angle.
  if (part === "legs") return fallback === 2 ? 2 : 1;
  return fallback;
}

export interface RulaResult { score: number; actionLevel: 1 | 2 | 3 | 4; explanation: string; trace: string[]; groupA: number; groupB: number; adjustment: number }

export function calculateRula(input: RulaInput): RulaResult {
  const values = [input.upperArm, input.lowerArm, input.wrist, input.wristTwist, input.neck, input.trunk, input.legs];
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) throw new RangeError("Posture scores must be integers from 1 to 6");
  if (!Number.isInteger(input.force) || input.force < 0 || input.force > 3) throw new RangeError("Force must be from 0 to 3");
  if (input.algorithmVersion === 'legacy-average-v1') {
    // Read compatibility only: never silently rescore a historical assessment.
    const groupA = Math.min(8, Math.ceil((input.upperArm * 2 + input.lowerArm + input.wrist + input.wristTwist) / 3));
    const groupB = Math.min(7, Math.ceil((input.neck * 2 + input.trunk * 2 + input.legs) / 3));
    const adjustment = (input.muscleUse ? 1 : 0) + input.force;
    const score = Math.max(1, Math.min(7, Math.ceil((groupA + groupB) / 2) + adjustment));
    const actionLevel = score <= 2 ? 1 : score <= 4 ? 2 : score <= 6 ? 3 : 4;
    const explanations = ['Acceptable posture', 'Further investigation may be needed', 'Investigate and change soon', 'Investigate and change immediately'];
    return {score,actionLevel,explanation:explanations[actionLevel-1]!,groupA,groupB,adjustment,trace:[`Legacy group A: ${groupA}`,`Legacy group B: ${groupB}`,`Legacy adjustment: ${adjustment}`,`Legacy final score: ${score}`]};
  }
  if (input.lowerArm > 3 || input.wrist > 4 || input.wristTwist > 2 || input.legs > 2) throw new RangeError("Posture scores exceed the published RULA table dimensions");
  const adjustment = (input.muscleUse ? 1 : 0) + input.force;
  const postureA = RULA_TABLE_A[(input.upperArm - 1) * 3 + input.lowerArm - 1]![(input.wrist - 1) * 2 + input.wristTwist - 1]!;
  const postureB = RULA_TABLE_B[input.neck - 1]![(input.trunk - 1) * 2 + input.legs - 1]!;
  const groupA = postureA + adjustment;
  const groupB = postureB + adjustment;
  const score = RULA_TABLE_C[Math.min(8, groupA) - 1]![Math.min(7, groupB) - 1]!;
  const actionLevel = score <= 2 ? 1 : score <= 4 ? 2 : score <= 6 ? 3 : 4;
  const explanations = ["Acceptable posture", "Further investigation may be needed", "Investigate and change soon", "Investigate and change immediately"];
  return { score, actionLevel, explanation: explanations[actionLevel - 1]!, trace: [`Group A: table ${postureA} + adjustment ${adjustment} = ${groupA}`, `Group B: table ${postureB} + adjustment ${adjustment} = ${groupB}`, `Adjustment: muscle use ${input.muscleUse ? 1 : 0} + force ${input.force} = ${adjustment}`, `Final score: table C (${Math.min(8, groupA)}, ${Math.min(7, groupB)}) = ${score}`], groupA, groupB, adjustment };
}

export * from "./validation.js";
export * from "./subscriptions.js";
