import type { LandmarkName } from "./rula-geometry.js";
import type { RulaLocalPoseResult, RulaPoseLandmark } from "./rula-pose-provider.js";
import type { RulaBodySideResult, RulaPostureImageOverlay } from "./rula-posture.js";

type View = "SAGITTAL" | "FRONTAL" | "OBLIQUE" | "UNKNOWN";
export type RulaLocalPoseGeometry = {
  side: RulaBodySideResult;
  view: View;
  facing: "IMAGE_RIGHT" | "IMAGE_LEFT" | "UNKNOWN";
  upright: boolean;
  landmarks: { name: LandmarkName; x: number; y: number; visibility: "VISIBLE"; confidence: number }[];
};

function usable(point: RulaPoseLandmark | undefined): point is RulaPoseLandmark {
  return Boolean(point && [point.x, point.y, point.visibility, point.presence ?? point.visibility].every(
    (number) => Number.isFinite(number) && number >= 0 && number <= 1,
  ) && Math.min(point.visibility, point.presence ?? point.visibility) >= .5);
}

/** Single-person evidence with a visible connected limb; confidence is not a precision claim. */
export function hasUsableRulaLocalPose(result: RulaLocalPoseResult) {
  if (result.poses.length !== 1) return false;
  const points = new Map(result.poses[0]!.landmarks.map((point) => [point.name, point]));
  return (["left", "right"] as const).some((side) => [
    [`${side}_shoulder`, `${side}_elbow`, `${side}_wrist`],
    [`${side}_hip`, `${side}_knee`, `${side}_ankle`],
  ].some((chain) => chain.every((name) => usable(points.get(name as RulaPoseLandmark["name"])))));
}

/** All drawn points and measured vectors come from the same native normalized pose frame. */
export function geometryFromRulaLocalPose(
  result: RulaLocalPoseResult,
  side: RulaBodySideResult,
  image: { width: number; height: number },
  modelViewContext: unknown,
): { geometry: RulaLocalPoseGeometry; overlay: RulaPostureImageOverlay } {
  if (result.width !== image.width || result.height !== image.height) {
    throw Object.assign(new Error("Local pose image reference frame does not match"), {
      code: "RULA_POSE_RESPONSE_INVALID", statusCode: 503, retryable: false,
    });
  }
  if (!hasUsableRulaLocalPose(result)) {
    throw Object.assign(new Error("A single visible body is required for posture localization"), {
      code: "RULA_POSE_SUBJECT_AMBIGUOUS", statusCode: 422, retryable: false,
    });
  }
  const points = new Map(result.poses[0]!.landmarks.map((point) => [point.name, point]));
  const prefix = side === "RIGHT" ? "right" : "left";
  const landmarks: RulaLocalPoseGeometry["landmarks"] = [];
  function add(name: LandmarkName, nativeName: RulaPoseLandmark["name"]) {
    const point = points.get(nativeName);
    if (usable(point)) landmarks.push({
      name, x: point.x, y: point.y, visibility: "VISIBLE",
      confidence: Math.min(point.visibility, point.presence ?? point.visibility),
    });
  }
  // A nose is a face proxy only. MediaPipe has no cervical/neck landmark: never invent one.
  add("head", "nose");
  for (const name of ["shoulder", "elbow", "wrist", "hip", "knee", "ankle"] as const) add(name, `${prefix}_${name}`);
  add("hand", `${prefix}_index`);
  const nose = points.get("nose");
  const ear = points.get(`${prefix}_ear`);
  const faceOffset = usable(nose) && usable(ear) ? (nose.x - ear.x) * image.width : 0;
  const facing = Math.abs(faceOffset) >= 8 ? faceOffset > 0 ? "IMAGE_RIGHT" : "IMAGE_LEFT" : "UNKNOWN";
  const context = modelViewContext && typeof modelViewContext === "object" && !Array.isArray(modelViewContext)
    ? modelViewContext as Record<string, unknown> : {};
  const view: View = ["SAGITTAL", "FRONTAL", "OBLIQUE", "UNKNOWN"].includes(context.view as string)
    ? context.view as View : "UNKNOWN";
  const geometry: RulaLocalPoseGeometry = { side, view, facing, upright: context.upright === true, landmarks };
  return {
    geometry,
    overlay: { points: Object.fromEntries(landmarks.map((point) => [
      point.name, { x: point.x, y: point.y, confidence: point.confidence },
    ])) },
  };
}
