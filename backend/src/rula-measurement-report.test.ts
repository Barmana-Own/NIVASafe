import {expect,it} from "vitest";
import {buildRulaPdfLines} from "./modules/reports.js";
import type {RulaPostureAnalysis} from "./rula-posture.js";
it("exports an explicit per-part uncertainty without a fabricated measured score",()=>{
  const row={angle:0,score:1,detected:true,source:"AI" as const,confirmedByUser:false,requiresReview:true};
  const analysis={upperArm:row,lowerArm:{...row,angle:null,measurement:{version:"image-plane-audit-v1",state:"CONFLICT",basis:"IMAGE_PLANE",aiAngle:180,aiScore:2,geometryAngle:90,qualityCodes:["ANGLE_LANDMARK_CONFLICT"],view:"SAGITTAL",width:1000,height:700,landmarks:[]}},wrist:row,wristTwist:row,neck:row,trunk:row,legs:row} as RulaPostureAnalysis;
  const data={title:"Synthetic uncertain posture",project:{name:"Isolated reference"},score:1,actionLevel:1,explanation:"Synthetic",bodySide:"RIGHT" as const,postureReviewComplete:false,postureAnalysis:analysis};
  const lines=buildRulaPdfLines(data,{assessment:data,factors:[],actions:[],predictedScore:1});
  expect(JSON.stringify(lines)).toContain("Angle/landmark conflict");
  expect(JSON.stringify(lines)).not.toContain("180°");
});
it("does not describe unobservable wrist rotation as anatomically absent after review",()=>{
 const row={angle:0,score:1,detected:true,source:"USER" as const,confirmedByUser:true,requiresReview:true};
 const analysis={upperArm:row,lowerArm:row,wrist:row,wristTwist:{...row,angle:null,detected:false,measurement:{version:"landmark-geometry-v2",state:"UNMEASURABLE",basis:"UNSUPPORTED",aiAngle:null,aiScore:1,geometryAngle:null,qualityCodes:["OUT_OF_PLANE_UNMEASURABLE"],view:"SAGITTAL",width:1000,height:700,landmarks:[]}},neck:row,trunk:row,legs:row} as RulaPostureAnalysis;
 const data={title:"Synthetic reviewed uncertainty",project:{name:"Isolated"},score:2,actionLevel:1,explanation:"Synthetic",bodySide:"RIGHT" as const,postureReviewComplete:true,postureAnalysis:analysis};
 const lines=JSON.stringify(buildRulaPdfLines(data,{assessment:data,factors:[],actions:[],predictedScore:2}));
 expect(lines).toContain("Not measurable in image");expect(lines).not.toContain("Not present");
});
