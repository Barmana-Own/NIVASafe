export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskThresholds { medium: number; high: number; critical: number }
export const DEFAULT_THRESHOLDS: RiskThresholds = { medium: 50, high: 100, critical: 200 };

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
  return "LOW";
}

export interface RulaInput {
  upperArm: number; lowerArm: number; wrist: number; wristTwist: number;
  neck: number; trunk: number; legs: number; muscleUse: boolean; force: number;
}

export interface RulaResult { score: number; actionLevel: 1 | 2 | 3 | 4; explanation: string; trace: string[] }

export function calculateRula(input: RulaInput): RulaResult {
  const values = [input.upperArm, input.lowerArm, input.wrist, input.wristTwist, input.neck, input.trunk, input.legs];
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) throw new RangeError("Posture scores must be integers from 1 to 6");
  if (!Number.isInteger(input.force) || input.force < 0 || input.force > 3) throw new RangeError("Force must be from 0 to 3");
  const groupA = Math.min(8, Math.ceil((input.upperArm * 2 + input.lowerArm + input.wrist + input.wristTwist) / 3));
  const groupB = Math.min(7, Math.ceil((input.neck * 2 + input.trunk * 2 + input.legs) / 3));
  const adjustment = (input.muscleUse ? 1 : 0) + input.force;
  const score = Math.max(1, Math.min(7, Math.ceil((groupA + groupB + adjustment) / 2)));
  const actionLevel = score <= 2 ? 1 : score <= 4 ? 2 : score <= 6 ? 3 : 4;
  const explanations = ["Acceptable posture", "Further investigation may be needed", "Investigate and change soon", "Investigate and change immediately"];
  return { score, actionLevel, explanation: explanations[actionLevel - 1]!, trace: [`Group A: ${groupA}`, `Group B: ${groupB}`, `Adjustment: ${adjustment}`, `Final score: ${score}`] };
}
