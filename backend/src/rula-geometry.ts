/** Image-plane geometry. These calculations cannot recover depth or certify anatomy. */
export type Vector2 = { x: number; y: number };
export const landmarkNames = ["head", "neck", "shoulder", "elbow", "wrist", "hand", "hip", "knee", "ankle"] as const;
export type LandmarkName = typeof landmarkNames[number];
export type VisibleLandmark = Vector2 & { visibility: "VISIBLE" | "OCCLUDED" | "MISSING"; confidence: number | null };
export type LandmarkFrame = {
  width: number; height: number;
  view: "SAGITTAL" | "FRONTAL" | "OBLIQUE" | "UNKNOWN";
  facing: "IMAGE_RIGHT" | "IMAGE_LEFT" | "UNKNOWN";
  /** Unit direction of image-plane vertical, in pixel coordinates with Y down. */
  up: Vector2;
  points: Partial<Record<LandmarkName, VisibleLandmark>>;
};
export type GeometricPart = "upperArm" | "lowerArm" | "wrist" | "wristTwist" | "neck" | "trunk" | "legs";
export type MeasurementCode = "LANDMARK_MISSING" | "LANDMARK_NOT_VISIBLE" | "LANDMARK_LOW_CONFIDENCE" | "LANDMARK_OUT_OF_BOUNDS" | "DEGENERATE_SEGMENT" | "VIEW_UNSUITABLE" | "REFERENCE_FRAME_UNKNOWN" | "OUT_OF_PLANE_UNMEASURABLE" | "SUPPORT_REQUIRES_OBSERVATION";
type Measurement = { angle: number | null; code: MeasurementCode | null; landmarks: LandmarkName[] };
const finite = (v: Vector2) => Number.isFinite(v.x) && Number.isFinite(v.y);
const dot = (a: Vector2,b: Vector2) => a.x*b.x+a.y*b.y;
const cross = (a: Vector2,b: Vector2) => a.x*b.y-a.y*b.x;
const degrees = (radians: number) => radians*180/Math.PI;
export const vector = (from: Vector2,to: Vector2): Vector2 => ({x:to.x-from.x,y:to.y-from.y});
export const vectorLength = (v: Vector2) => Math.hypot(v.x,v.y);
function normalized(v: Vector2): Vector2 | null {
  const length=vectorLength(v);
  return finite(v) && length>1e-8 ? {x:v.x/length,y:v.y/length} : null;
}
/** Interior difference, 0..180; null for absent/degenerate vectors. */
export function angleBetween(a: Vector2,b: Vector2): number | null {
  const x=normalized(a),y=normalized(b);
  if(!x||!y) return null;
  return degrees(Math.atan2(Math.min(1,Math.abs(cross(x,y))),Math.max(-1,Math.min(1,dot(x,y)))));
}
/** Signed rotation in image coordinates (Y down); clockwise is positive. */
export function signedAngle(a: Vector2,b: Vector2): number | null {
  const x=normalized(a),y=normalized(b);
  return x&&y ? degrees(Math.atan2(cross(x,y),Math.max(-1,Math.min(1,dot(x,y))))) : null;
}
const required: Record<GeometricPart,LandmarkName[]> = {
  upperArm:["shoulder","hip","elbow"],lowerArm:["shoulder","elbow","wrist"],wrist:["elbow","wrist","hand"],
  neck:["hip","neck","head"],trunk:["hip","shoulder"],wristTwist:[],legs:[],
};
export function measureRulaImagePlane(part: GeometricPart,frame: LandmarkFrame): Measurement {
  const landmarks=required[part];
  const fail=(code:MeasurementCode):Measurement=>({angle:null,code,landmarks});
  if(part==="wristTwist") return fail("OUT_OF_PLANE_UNMEASURABLE");
  if(part==="legs") return fail("SUPPORT_REQUIRES_OBSERVATION");
  if(frame.view!=="SAGITTAL") return fail("VIEW_UNSUITABLE");
  const up=normalized(frame.up);
  if(!Number.isFinite(frame.width)||!Number.isFinite(frame.height)||frame.width<=0||frame.height<=0) return fail("REFERENCE_FRAME_UNKNOWN");
  // Gravity is required only by trunk-vs-upright. Joint-relative vectors retain
  // their angles under image rotation and do not require a world vertical.
  if(part==="trunk"&&!up) return fail("REFERENCE_FRAME_UNKNOWN");
  const points:Partial<Record<LandmarkName,Vector2>>={};
  for(const name of landmarks) {
    const p=frame.points[name];
    if(!p) return fail("LANDMARK_MISSING");
    if(p.visibility!=="VISIBLE") return fail("LANDMARK_NOT_VISIBLE");
    if(p.confidence===null||!Number.isFinite(p.confidence)||p.confidence<0.5) return fail("LANDMARK_LOW_CONFIDENCE");
    if(!finite(p)||p.x<0||p.x>1||p.y<0||p.y>1) return fail("LANDMARK_OUT_OF_BOUNDS");
    // X and Y must be restored to the SAME metric before calculating angles.
    points[name]={x:p.x*frame.width,y:p.y*frame.height};
  }
  const v=(from:LandmarkName,to:LandmarkName)=>vector(points[from]!,points[to]!);
  let angle:number|null;
  if(part==="lowerArm") angle=angleBetween(v("elbow","shoulder"),v("elbow","wrist"));
  else if(part==="wrist") angle=angleBetween(v("elbow","wrist"),v("wrist","hand"));
  else {
    if(frame.facing==="UNKNOWN") return fail("REFERENCE_FRAME_UNKNOWN");
    const sign=frame.facing==="IMAGE_RIGHT"?1:-1;
    if(part==="upperArm") {
      const down=normalized(v("shoulder","hip")),arm=normalized(v("shoulder","elbow"));
      angle=down&&arm?degrees(Math.atan2(sign*(-cross(down,arm)),dot(down,arm))):null;
    } else {
      const axis=part==="neck"?normalized(v("hip","neck")):up;
      const segment=normalized(part==="neck"?v("neck","head"):v("hip","shoulder"));
      angle=axis&&segment?degrees(Math.atan2(sign*cross(axis,segment),dot(axis,segment))):null;
    }
  }
  if(angle===null||!Number.isFinite(angle)) return fail("DEGENERATE_SEGMENT");
  return {angle:Object.is(angle,-0)?0:angle,code:null,landmarks};
}
