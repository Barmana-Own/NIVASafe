import { describe, expect, it } from "vitest";
import { geometryFromRulaLocalPose, hasUsableRulaLocalPose } from "./rula-local-pose-geometry.js";
import { RULA_POSE_SOURCE, type RulaLocalPoseResult, type RulaPoseLandmark } from "./rula-pose-provider.js";

const point = (name: RulaPoseLandmark["name"], x: number, y: number): RulaPoseLandmark => ({ name, x, y, visibility: .95, presence: .9 });
const pose: RulaLocalPoseResult = {
  source: RULA_POSE_SOURCE, modelSha256: "a".repeat(64), width: 1200, height: 800,
  poses: [{ landmarks: [
    point("nose", .85, .1), point("right_ear", .8, .1), point("left_ear", .9, .1),
    point("right_shoulder", .7, .2), point("right_elbow", .7, .4), point("right_wrist", .8, .4), point("right_index", .85, .4),
    point("right_hip", .7, .6), point("right_knee", .7, .75), point("right_ankle", .7, .9),
    point("left_shoulder", .3, .2), point("left_elbow", .2, .4), point("left_wrist", .4, .5), point("left_index", .45, .6),
    point("left_hip", .3, .6), point("left_knee", .25, .75), point("left_ankle", .2, .9),
  ] }],
};
const image = { width: pose.width, height: pose.height };
const context = { view: "SAGITTAL", facing: "IMAGE_LEFT", upright: true };

describe("local pose coordinate mapping", () => {
  it("preserves native non-square-image coordinates for both drawing and geometry", () => {
    const result = geometryFromRulaLocalPose(pose, "RIGHT", image, context);
    expect(result.overlay.points.shoulder).toEqual({ x: .7, y: .2, confidence: .9 });
    for (const landmark of result.geometry.landmarks) {
      expect(result.overlay.points[landmark.name]).toEqual({ x: landmark.x, y: landmark.y, confidence: landmark.confidence });
    }
    expect(result.geometry).toMatchObject({ side: "RIGHT", view: "SAGITTAL", facing: "IMAGE_RIGHT", upright: true });
  });

  it("keeps anatomical side semantics without mirroring or borrowing the other arm", () => {
    const right = geometryFromRulaLocalPose(pose, "RIGHT", image, context);
    const left = geometryFromRulaLocalPose(pose, "LEFT", image, context);
    expect(right.overlay.points.elbow?.x).toBe(.7);
    expect(left.overlay.points.elbow?.x).toBe(.2);
    expect(left.geometry.facing).toBe("IMAGE_LEFT");
  });

  it("uses the visible nose as a face proxy and never invents a cervical landmark", () => {
    const result = geometryFromRulaLocalPose(pose, "RIGHT", image, context);
    expect(result.overlay.points.head).toEqual({ x: .85, y: .1, confidence: .9 });
    expect(result.overlay.points.neck).toBeUndefined();
    expect(result.geometry.landmarks.some((landmark) => landmark.name === "neck")).toBe(false);
    expect(result.overlay.points.hand).toEqual({ x: .85, y: .4, confidence: .9 });
  });

  it("omits hidden, absent and out-of-frame points instead of clamping or guessing", () => {
    const changed: RulaLocalPoseResult = { ...pose, poses: [{ landmarks: pose.poses[0]!.landmarks.map((landmark) => {
      if (landmark.name === "right_elbow") return { ...landmark, visibility: .49 };
      if (landmark.name === "right_wrist") return { ...landmark, presence: .1 };
      if (landmark.name === "right_ankle") return { ...landmark, x: 1.1 };
      return landmark;
    }).filter((landmark) => landmark.name !== "right_index") }] };
    const result = geometryFromRulaLocalPose(changed, "RIGHT", image, context);
    for (const key of ["elbow", "wrist", "ankle", "hand"] as const) expect(result.overlay.points[key]).toBeUndefined();
    expect(result.overlay.points.hip).toBeDefined();
  });

  it("withholds facing when face direction is hidden or within eight pixels", () => {
    const changed: RulaLocalPoseResult = { ...pose, poses: [{ landmarks: pose.poses[0]!.landmarks.map((landmark) => landmark.name === "nose" ? { ...landmark, x: .804 } : landmark) }] };
    expect(geometryFromRulaLocalPose(changed, "RIGHT", image, context).geometry.facing).toBe("UNKNOWN");
    const hidden: RulaLocalPoseResult = { ...pose, poses: [{ landmarks: pose.poses[0]!.landmarks.map((landmark) => landmark.name === "right_ear" ? { ...landmark, visibility: .1 } : landmark) }] };
    expect(geometryFromRulaLocalPose(hidden, "RIGHT", image, context).geometry.facing).toBe("UNKNOWN");
  });

  it("does not convert missing view or gravity context into sagittal/upright evidence", () => {
    expect(geometryFromRulaLocalPose(pose, "RIGHT", image, undefined).geometry).toMatchObject({ view: "UNKNOWN", upright: false });
    expect(geometryFromRulaLocalPose(pose, "RIGHT", image, { view: "FRONTAL", upright: "true" }).geometry).toMatchObject({ view: "FRONTAL", upright: false });
  });

  it.each([0, 2])("rejects %s detected subjects instead of selecting a person silently", (count) => {
    const result = { ...pose, poses: Array.from({ length: count }, () => pose.poses[0]!) };
    expect(hasUsableRulaLocalPose(result)).toBe(false);
    expect(() => geometryFromRulaLocalPose(result, "RIGHT", image, context)).toThrow("single visible body");
  });

  it("requires actual connected limb evidence and the exact decoded image frame", () => {
    expect(hasUsableRulaLocalPose({ ...pose, poses: [{ landmarks: [point("nose", .4, .2)] }] })).toBe(false);
    expect(() => geometryFromRulaLocalPose(pose, "RIGHT", { width: 800, height: 1200 }, context)).toThrow("reference frame");
  });
});
