import { RULA_TABLE_A, RULA_TABLE_B, RULA_POSTURE_SCORE_LIMITS } from "../../../shared/domain/dist/rula-tables.js";
import { suggestedRulaPostureScore, calculateRula } from "../../../shared/domain/dist/index.js";
import { photos, project, session, digest, initialDraft, parts, adjustment } from "../rula-photo-side-values-20261022-01/fixtures.mjs";
import { parseRulaPostureImageAnalysis, rulaPostureImageAnalysisResponseSchema } from "../../../.local/rula-review-population-20261023-01/candidate/backend/dist/rula-posture-ai.js";

// Generated PNGs and synthetic identities only; no customer/provider data.
export { photos, project, session, digest, initialDraft, parts, adjustment, calculateRula };
export const inheritedFixtures = "scripts/releases/rula-photo-side-values-20261022-01/fixtures.mjs";
export const parserRoot = "C:/NIVASafe/.local/rula-review-population-20261023-01/candidate";
export const parserFixtureInputs = ["backend/dist/rula-posture-ai.js", "backend/dist/rula-posture.js", "backend/dist/rula-measurement.js", "backend/dist/rula-adjustments.js", "backend/dist/rula-geometry.js", "backend/dist/rula-landmark-localization.js", "backend/dist/rula-local-pose-geometry.js"];
const numericAngles = { upperArm: [5, 35, 65, 105], lowerArm: [45, 75, 105, 120], wrist: [0, 10, 20, 35], neck: [5, 15, 30, -10], trunk: [0, 15, 35, 70] };
export function proposal(index, side, part) {
  const offset = (index + (side === "LEFT" ? 1 : 0)) % 4;
  const angle = numericAngles[part]?.[offset] ?? null;
  const score = Object.hasOwn(numericAngles, part) ? suggestedRulaPostureScore(part, angle, true, 1) : 1 + (index + (side === "LEFT" ? 1 : 0)) % 2;
  return { angle, score, detected: true };
}

export function rawModelSide(index, side, scenario = "full") {
  const rows = Object.fromEntries(parts.map((part, partIndex) => {
    const raw = proposal(index, side, part); if (scenario === "invariant") { raw.angle = null; raw.score = { upperArm: 6, lowerArm: 3, wrist: 4, wristTwist: 1, neck: 1, trunk: 6, legs: 2 }[part]; }
    const unknown = scenario === "unknown" || (scenario === "partial-both" && ["wristTwist", "neck"].includes(part)) || (scenario === "invariant" && ["wristTwist", "neck"].includes(part)) || (scenario === "legacy" && part === "legs") || (scenario === "partial-a" && part === "wrist") || (scenario === "partial-b" && part === "neck");
    return [part, { angle: unknown && partIndex % 2 ? null : raw.angle, score: raw.score, detected: !unknown, confidence: .99 }];
  }));
  const geometry = scenario === "mixed" ? { side, view: "SAGITTAL", facing: "IMAGE_RIGHT", upright: true, landmarks: [{ name: "head", x: .5, y: .02 }, { name: "neck", x: .5, y: .1 }, { name: "shoulder", x: .5, y: .2 }, { name: "elbow", x: .5, y: .5 }, { name: "wrist", x: .8, y: .5 }, { name: "hand", x: .9, y: .5 }, { name: "hip", x: .5, y: .8 }].map(point => ({ ...point, visibility: "VISIBLE", confidence: .99 })) } : undefined;
  return { ...rows, overlay: { points: {} }, ...(geometry ? { geometry } : {}) };
}

// Produce the actual candidate backend audit, rather than approximating its
// state/basis/qualitative normalization in browser fixtures.
export function responseSide(index, side, scenario = "full") {
  const parsed = parseRulaPostureImageAnalysis(JSON.stringify({ sides: { [side]: rawModelSide(index, side, scenario) } }), side, { width: 64, height: 96, normalized: true }).sides[side];
  if (scenario === "legacy") for (const part of parts) delete parsed[part].measurement.aiDetected;
  if (scenario === "unknown") for (const part of ["lowerArm", "wristTwist"]) delete parsed[part].measurement.aiDetected;
  parsed.adjustments = adjustment(index, side);
  return parsed;
}

export function imageResponse(index, side, scenario = "full", requestNumber = 1) {
  const data = {
    sides: { [side]: responseSide(index, side, scenario) },
    notes: "Synthetic audited proposals; independent angles unavailable. No external AI provider called.",
    provider: "arvancloud", model: "synthetic-audited-proposals", aiStatus: "connected",
    analysisRequestId: `60000000-0000-4000-8000-${String(requestNumber).padStart(12, "0")}`,
  };
  const { analysisRequestId: _request, ...response } = data;
  rulaPostureImageAnalysisResponseSchema.parse(response);
  return data;
}

export function expectedProposals(index, side, scenario = "full") {
  const wire = responseSide(index, side, scenario);
  return Object.fromEntries(parts.map(part => {
    const measurement = wire[part].measurement;
    const usable = wire[part].detected && ["ESTIMATED", "QUALITATIVE"].includes(measurement.state);
    return [part, usable ? { angle: wire[part].angle, score: wire[part].score, detected: true } : measurement.aiDetected === true || (measurement.aiDetected === undefined && measurement.aiAngle !== null) ? { angle: measurement.aiAngle, score: measurement.aiScore, detected: true } : null];
  }));
}

export function expectedSummary(index, side, scenario = "full", override = {}) {
  const proposals = expectedProposals(index, side, scenario), inputs = { ...adjustment(index, side) };
  for (const part of parts) inputs[part] = override[part]?.score ?? proposals[part]?.score ?? 1;
  Object.assign(inputs, override.force === undefined ? {} : { force: override.force }, override.muscleUse === undefined ? {} : { muscleUse: override.muscleUse });
  return { result: calculateRula(inputs), proposals, groupA: parts.slice(0, 4).every(part => override[part] || proposals[part]), groupB: parts.slice(4).every(part => override[part] || proposals[part]), count: parts.filter(part => override[part] || proposals[part]).length };
}

/** Independent finite-domain oracle against the published lookup entries. */
export function expectedBands(index, side, scenario = "partial-both", override = {}) {
  const proposals = expectedProposals(index, side, scenario), modifiers = { ...adjustment(index, side), ...(override.force === undefined ? {} : { force: override.force }), ...(override.muscleUse === undefined ? {} : { muscleUse: override.muscleUse }) }, adjustmentValue = modifiers.force + Number(modifiers.muscleUse);
  return [parts.slice(0, 4), parts.slice(4)].map((members, groupIndex) => {
    const values = [], scores = {}, missing = members.filter(part => !(override[part] ?? proposals[part]));
    function enumerate(at) {
      if (at === members.length) { const tableValue = groupIndex === 0 ? RULA_TABLE_A[(scores.upperArm - 1) * 3 + scores.lowerArm - 1][(scores.wrist - 1) * 2 + scores.wristTwist - 1] : RULA_TABLE_B[scores.neck - 1][(scores.trunk - 1) * 2 + scores.legs - 1]; values.push(tableValue + adjustmentValue); return; }
      const part = members[at], known = override[part] ?? proposals[part];
      for (const value of known ? [known.score] : Array.from({length:RULA_POSTURE_SCORE_LIMITS[part]}, (_, index) => index + 1)) { scores[part] = value; enumerate(at + 1); }
    }
    enumerate(0); return { min: Math.min(...values), max: Math.max(...values), exact: missing.length === 0, missing, possibilities: values.length };
  });
}
