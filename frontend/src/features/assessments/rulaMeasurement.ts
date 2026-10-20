export type RulaMeasurement = {
  version:"image-plane-audit-v1"|"landmark-geometry-v2";
  state:"ESTIMATED"|"UNMEASURABLE"|"CONFLICT"|"QUALITATIVE";
  basis:"IMAGE_PLANE"|"SUPPORT"|"UNSUPPORTED";
  aiAngle:number|null;aiScore:number;geometryAngle:number|null;
  qualityCodes:string[];view:"SAGITTAL"|"FRONTAL"|"OBLIQUE"|"UNKNOWN";
  width:number;height:number;
  trustedSource?:"AI_ANGLE_AUDIT"|"DETERMINISTIC_IMAGE_PLANE";
  subjectId?:string;subjectBounds?:{left:number;top:number;right:number;bottom:number};
  facing?:"IMAGE_RIGHT"|"IMAGE_LEFT"|"UNKNOWN";referenceUp?:{x:number;y:number};
  landmarks:{name:string;x:number|null;y:number|null;visibility:"VISIBLE"|"OCCLUDED"|"MISSING";confidence:number|null}[];
};
const codes=["LANDMARK_MISSING","LANDMARK_NOT_VISIBLE","LANDMARK_LOW_CONFIDENCE","LANDMARK_OUT_OF_BOUNDS","DEGENERATE_SEGMENT","VIEW_UNSUITABLE","REFERENCE_FRAME_UNKNOWN","OUT_OF_PLANE_UNMEASURABLE","SUPPORT_REQUIRES_OBSERVATION","ANGLE_LANDMARK_CONFLICT","AI_ANGLE_MISSING","AI_CONFIDENCE_LOW","LANDMARK_CONTRACT_MISSING","SUBJECT_ASSOCIATION_CONFLICT","LIMB_CONNECTIVITY_CONFLICT","SUBJECT_NOT_IDENTIFIED"];
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const bounded=(v:unknown,min:number,max:number):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
const angle=(v:unknown)=>v===null||bounded(v,-180,180);
export function measurementFromValue(v:unknown):RulaMeasurement|undefined {
  if(!record(v)||!["image-plane-audit-v1","landmark-geometry-v2"].includes(String(v.version))||!["ESTIMATED","UNMEASURABLE","CONFLICT","QUALITATIVE"].includes(String(v.state))||!["IMAGE_PLANE","SUPPORT","UNSUPPORTED"].includes(String(v.basis))||!["SAGITTAL","FRONTAL","OBLIQUE","UNKNOWN"].includes(String(v.view))) return;
  if(!angle(v.aiAngle)||!angle(v.geometryAngle)||!bounded(v.aiScore,1,6)||!Number.isInteger(v.aiScore)||!bounded(v.width,1,16384)||!Number.isInteger(v.width)||!bounded(v.height,1,16384)||!Number.isInteger(v.height)) return;
  if(!Array.isArray(v.qualityCodes)||v.qualityCodes.length>4||v.qualityCodes.some(c=>!codes.includes(c))||!Array.isArray(v.landmarks)||v.landmarks.length>9) return;
  if(v.landmarks.some(l=>!record(l)||!["head","neck","shoulder","elbow","wrist","hand","hip","knee","ankle"].includes(String(l.name))||!["VISIBLE","OCCLUDED","MISSING"].includes(String(l.visibility))||(l.x!==null&&!bounded(l.x,0,1))||(l.y!==null&&!bounded(l.y,0,1))||(l.confidence!==null&&!bounded(l.confidence,0,1)))) return;
  if(v.trustedSource!==undefined&&!["AI_ANGLE_AUDIT","DETERMINISTIC_IMAGE_PLANE"].includes(String(v.trustedSource)))return;
  if(v.subjectId!==undefined&&(typeof v.subjectId!=="string"||!(/^[A-Za-z0-9_-]{1,24}$/u).test(v.subjectId)))return;
  const b=v.subjectBounds;
  if(b!==undefined&&(!record(b)||![b.left,b.top,b.right,b.bottom].every(n=>bounded(n,0,1))||Number(b.left)>=Number(b.right)||Number(b.top)>=Number(b.bottom)))return;
  if(v.facing!==undefined&&!["IMAGE_RIGHT","IMAGE_LEFT","UNKNOWN"].includes(String(v.facing)))return;
  const up=v.referenceUp;
  if(up!==undefined&&(!record(up)||!bounded(up.x,-1,1)||!bounded(up.y,-1,1)))return;
  // Copy only the documented domain metadata; never persist arbitrary response keys.
  return {version:v.version,state:v.state,basis:v.basis,aiAngle:v.aiAngle,aiScore:v.aiScore,geometryAngle:v.geometryAngle,qualityCodes:[...v.qualityCodes],view:v.view,width:v.width,height:v.height,landmarks:v.landmarks.map(l=>({name:l.name,x:l.x,y:l.y,visibility:l.visibility,confidence:l.confidence})),...(v.trustedSource!==undefined?{trustedSource:v.trustedSource}:{}),...(v.subjectId!==undefined?{subjectId:v.subjectId}:{}),...(v.facing!==undefined?{facing:v.facing}:{}),...(record(up)?{referenceUp:{x:up.x,y:up.y}}:{}),...(record(b)?{subjectBounds:{left:b.left,top:b.top,right:b.right,bottom:b.bottom}}:{})} as RulaMeasurement;
}
export function measurementQualityLabel(m:RulaMeasurement|undefined,locale:string) {
  if(!m||m.state==="ESTIMATED"||m.state==="QUALITATIVE") return "";
  if(m.state==="CONFLICT") return locale==="en"?"Angle/landmark conflict":"تعارض زاویه و مفصل‌ها";
  const code=m.qualityCodes[0];
  if(code==="OUT_OF_PLANE_UNMEASURABLE") return locale==="en"?"Not measurable in 2D":"در تصویر دوبعدی سنجش‌پذیر نیست";
  if(code==="VIEW_UNSUITABLE") return locale==="en"?"Unsuitable camera view":"زاویهٔ دید نامناسب";
  if(code==="SUBJECT_NOT_IDENTIFIED")return locale==="en"?"Body/side not identified":"بدن یا سمت مشخص نیست";
  if(code==="SUBJECT_ASSOCIATION_CONFLICT"||code==="LIMB_CONNECTIVITY_CONFLICT")return locale==="en"?"Joint/body association needs review":"ارتباط مفصل و بدن نیازمند بازبینی است";
  if(code==="LANDMARK_NOT_VISIBLE"||code==="LANDMARK_MISSING") return locale==="en"?"Joint not visible":"مفصل دیده نمی‌شود";
  return locale==="en"?"Reliable measurement unavailable":"اندازه‌گیری قابل اتکا موجود نیست";
}
