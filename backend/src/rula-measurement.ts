import {z} from "zod";
import {landmarkNames} from "./rula-geometry.js";

export const rulaMeasurementSchema=z.object({
  version:z.enum(["image-plane-audit-v1","landmark-geometry-v2"]),
  state:z.enum(["ESTIMATED","UNMEASURABLE","CONFLICT","QUALITATIVE"]),
  basis:z.enum(["IMAGE_PLANE","SUPPORT","UNSUPPORTED"]),
  aiAngle:z.number().min(-180).max(180).nullable(),
  aiScore:z.number().int().min(1).max(6),
  geometryAngle:z.number().min(-180).max(180).nullable(),
  qualityCodes:z.array(z.enum(["LANDMARK_MISSING","LANDMARK_NOT_VISIBLE","LANDMARK_LOW_CONFIDENCE","LANDMARK_OUT_OF_BOUNDS","DEGENERATE_SEGMENT","VIEW_UNSUITABLE","REFERENCE_FRAME_UNKNOWN","OUT_OF_PLANE_UNMEASURABLE","SUPPORT_REQUIRES_OBSERVATION","ANGLE_LANDMARK_CONFLICT","AI_ANGLE_MISSING","AI_CONFIDENCE_LOW","LANDMARK_CONTRACT_MISSING","SUBJECT_ASSOCIATION_CONFLICT","LIMB_CONNECTIVITY_CONFLICT","SUBJECT_NOT_IDENTIFIED"])).max(4),
  trustedSource:z.enum(["AI_ANGLE_AUDIT","DETERMINISTIC_IMAGE_PLANE"]).optional(),
  subjectId:z.string().regex(/^[A-Za-z0-9_-]{1,24}$/u).optional(),
  subjectBounds:z.object({left:z.number().min(0).max(1),top:z.number().min(0).max(1),right:z.number().min(0).max(1),bottom:z.number().min(0).max(1)}).strict().optional(),
  facing:z.enum(["IMAGE_RIGHT","IMAGE_LEFT","UNKNOWN"]).optional(),
  referenceUp:z.object({x:z.number().finite().min(-1).max(1),y:z.number().finite().min(-1).max(1)}).strict().optional(),
  view:z.enum(["SAGITTAL","FRONTAL","OBLIQUE","UNKNOWN"]),
  width:z.number().int().positive().max(16384),height:z.number().int().positive().max(16384),
  landmarks:z.array(z.object({name:z.enum(landmarkNames),x:z.number().min(0).max(1).nullable(),y:z.number().min(0).max(1).nullable(),visibility:z.enum(["VISIBLE","OCCLUDED","MISSING"]),confidence:z.number().min(0).max(1).nullable()}).strict()).max(9),
}).strict();
export type RulaMeasurement=z.infer<typeof rulaMeasurementSchema>;

export function rulaMeasurementIssueLabel(m:RulaMeasurement|undefined,locale:"fa"|"en") {
  if(!m||m.state==="ESTIMATED"||m.state==="QUALITATIVE") return "";
  if(m.state==="CONFLICT") return locale==="fa"?"تعارض زاویه و مفصل‌ها":"Angle/landmark conflict";
  return locale==="fa"?"سنجش‌پذیر نیست؛ بازبینی انسانی":"Unmeasurable; human review";
}

/** Acknowledgement is distinct from a measured correction. Historical records have no metadata. */
export function isMeasurementResolved(row:{angle:number|null;detected:boolean;source:string;confirmedByUser:boolean;measurement?:RulaMeasurement}) {
  if(!row.measurement||row.measurement.state==="ESTIMATED"||row.measurement.state==="QUALITATIVE") return true;
  return row.source==="USER"&&row.confirmedByUser&&(!row.detected||row.angle!==null);
}
