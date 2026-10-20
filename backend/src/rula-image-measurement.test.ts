import {expect,it} from "vitest";
import {parseRulaPostureImageAnalysis,buildRulaPostureImageAnalysisPrompt} from "./rula-posture-ai.js";

const row={angle:0,score:1,detected:true,confidence:.95};
const side={upperArm:{...row,angle:90},lowerArm:{...row,angle:180},wrist:row,wristTwist:{...row,angle:null,detected:false},neck:row,trunk:row,legs:{...row,angle:null},overlay:{points:{}},geometry:{view:"SAGITTAL",facing:"IMAGE_RIGHT",upright:true,landmarks:[{name:"shoulder",x:.67,y:.3,visibility:"VISIBLE",confidence:.95},{name:"hip",x:.67,y:395/700,visibility:"VISIBLE",confidence:.95},{name:"elbow",x:.6891,y:318.33/700,visibility:"VISIBLE",confidence:.95},{name:"wrist",x:.79743,y:299.23/700,visibility:"VISIBLE",confidence:.95}]}};
const context={width:1000,height:700,normalized:true as const};
it("asks the provider and geometry auditor to use the same neck reference frame",()=>{
  const prompt=buildRulaPostureImageAnalysisPrompt({bodySide:"RIGHT",locale:"en",imageGeometry:context});
  expect(prompt).toContain("neck flexion is relative to the upper-trunk axis");
  expect(prompt).not.toContain("neck and trunk are flexion from upright");
});
it("does not publish the R6 90-degree outlier when image geometry contradicts the model",()=>{
  const r=parseRulaPostureImageAnalysis(JSON.stringify({sides:{LEFT:side}}),"LEFT",context).sides.LEFT!;
  expect(r.lowerArm.angle).toBeNull();
  expect(r.lowerArm.detected).toBe(false);
  expect(r.lowerArm.measurement).toMatchObject({state:"CONFLICT",aiAngle:180,geometryAngle:expect.closeTo(90,1),qualityCodes:["ANGLE_LANDMARK_CONFLICT"]});
  expect(r.lowerArm.requiresReview).toBe(true);
});
it("does not silently turn missing coordinate/visibility evidence into a normal measured angle",()=>{
  const r=parseRulaPostureImageAnalysis(JSON.stringify({sides:{RIGHT:{...side,geometry:undefined}}}),"RIGHT",context).sides.RIGHT!;
  expect(r.upperArm.angle).toBeNull();
  expect(r.upperArm.measurement?.state).toBe("UNMEASURABLE");
});
it("rejects duplicate landmarks and unrequested-side substitution",()=>{
  const duplicate={...side,geometry:{...side.geometry,landmarks:[...side.geometry.landmarks,side.geometry.landmarks[0]]}};
  expect(()=>parseRulaPostureImageAnalysis(JSON.stringify({sides:{RIGHT:duplicate}}),"RIGHT",context)).toThrow("RULA_IMAGE_AI_INVALID_RESPONSE");
  expect(()=>parseRulaPostureImageAnalysis(JSON.stringify({sides:{LEFT:side}}),"RIGHT",context)).toThrow("RULA_IMAGE_AI_INVALID_RESPONSE");
});
it.each([
  {view:"SIDEWAYS"},
  {landmarks:null},
  {landmarks:[{name:"shoulder",x:"0.67",y:.3,visibility:"VISIBLE",confidence:.9}]},
  {landmarks:[{name:"not-a-joint",x:.67,y:.3,visibility:"VISIBLE",confidence:.9}]},
  {landmarks:[{name:"shoulder",x:1.2,y:.3,visibility:"VISIBLE",confidence:.9}]},
  {landmarks:[{name:"shoulder",x:.67,y:.3,confidence:.9}]},
])("rejects an invalid geometry contract without coercing it into a normal measurement: %j",invalid=>{
  expect(()=>parseRulaPostureImageAnalysis(JSON.stringify({sides:{RIGHT:{...side,geometry:{...side.geometry,...invalid}}}}),"RIGHT",context)).toThrow("RULA_IMAGE_AI_INVALID_RESPONSE");
});
it("distinguishes valid camera uncertainty from malformed JSON",()=>{
  const payload=JSON.stringify({sides:{RIGHT:{...side,geometry:{...side.geometry,view:"OBLIQUE"}}}});
  const result=parseRulaPostureImageAnalysis('```json\n'+payload+'\n```',"RIGHT",context);
  expect(result.sides.RIGHT?.upperArm.measurement).toMatchObject({state:"UNMEASURABLE",qualityCodes:["VIEW_UNSUITABLE"]});
  expect(()=>parseRulaPostureImageAnalysis(payload.slice(0,-6),"RIGHT",context)).toThrow("RULA_IMAGE_AI_INVALID_RESPONSE");
});
it("does not accept side mixing or null visible coordinates",()=>{
  expect(()=>parseRulaPostureImageAnalysis(JSON.stringify({sides:{RIGHT:{...side,geometry:{...side.geometry,side:"LEFT"}}}}),"RIGHT",context)).toThrow("RULA_IMAGE_AI_INVALID_RESPONSE");
  expect(()=>parseRulaPostureImageAnalysis(JSON.stringify({sides:{RIGHT:{...side,geometry:{...side.geometry,landmarks:[{name:"shoulder",x:null,y:.3,visibility:"VISIBLE",confidence:.9}]}}}}),"RIGHT",context)).toThrow("RULA_IMAGE_AI_INVALID_RESPONSE");
});
it("preserves an unsupported angle as null rather than a normal zero",()=>{
  const result=parseRulaPostureImageAnalysis(JSON.stringify({sides:{RIGHT:{...side,lowerArm:{...row,angle:999}}}}),"RIGHT",context);
  expect(result.sides.RIGHT?.lowerArm).toMatchObject({angle:null,detected:false,requiresReview:true,measurement:{qualityCodes:["AI_ANGLE_MISSING"]}});
});
