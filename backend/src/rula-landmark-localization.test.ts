import {expect,it} from "vitest";
import {parseLocalizedRulaImage,buildRulaLandmarkPrompt,mapCropPoint} from "./rula-landmark-localization.js";

const context={width:1000,height:700,normalized:true as const};
const points={head:[170,146],neck:[170,174],shoulder:[170,210],elbow:[265.26,265],wrist:[210.26,360.26],hand:[195.26,386.24],hip:[170,395],knee:[170,488],ankle:[170,583]};
const subject={subjectId:"A",side:"RIGHT",coordinateSystem:"PIXELS",bounds:{left:100,top:100,right:350,bottom:630},view:"SAGITTAL",facing:"IMAGE_RIGHT",up:{x:0,y:-1},legSupport:"SUPPORTED",landmarks:Object.entries(points).map(([name,[x,y]])=>({name,x,y,visibility:"VISIBLE",confidence:.95}))};
const payload=(s:unknown=subject)=>({schemaVersion:"rula-landmarks-v2",sides:{RIGHT:s},notes:""});
it("derives angles from pixel geometry without requiring the VLM's competing degree/score guesses",()=>{
 const r=parseLocalizedRulaImage(payload(),"RIGHT",context).sides.RIGHT!;
 expect(r.upperArm.angle).toBeCloseTo(60,2);expect(r.lowerArm.angle).toBeCloseTo(90,2);expect(r.wrist.angle).toBeCloseTo(0,1);
 expect(r.upperArm.score).toBe(3);
 expect(r.upperArm.measurement).toMatchObject({version:"landmark-geometry-v2",trustedSource:"DETERMINISTIC_IMAGE_PLANE",subjectId:"A",aiAngle:null});
 expect(r.wristTwist).toMatchObject({angle:null,detected:false,requiresReview:true});
 expect(Object.values(r).filter(v=>"requiresReview" in v).every(v=>v.requiresReview)).toBe(true);
});
it("does not confuse another body instance with the selected subject",()=>{
 const mixed={...subject,landmarks:subject.landmarks.map(p=>p.name==="elbow"?{...p,subjectId:"B"}:p)};
 expect(()=>parseLocalizedRulaImage(payload(mixed),"RIGHT",context)).toThrow("RULA_IMAGE_AI_INVALID_RESPONSE");
 const outside={...subject,landmarks:subject.landmarks.map(p=>p.name==="elbow"?{...p,x:850}:p)};
 expect(parseLocalizedRulaImage(payload(outside),"RIGHT",context).sides.RIGHT?.upperArm.measurement?.qualityCodes).toContain("SUBJECT_ASSOCIATION_CONFLICT");
});
it("requires matching anatomical sides, distinct names and finite pixel coordinates",()=>{
 for(const s of [{...subject,side:"LEFT"},{...subject,landmarks:[...subject.landmarks,subject.landmarks[0]]},{...subject,landmarks:[{name:"elbow",x:"265",y:265,visibility:"VISIBLE",confidence:.9}]},{...subject,landmarks:[{name:"elbow",x:Infinity,y:265,visibility:"VISIBLE",confidence:.9}]}]){
  expect(()=>parseLocalizedRulaImage(payload(s),"RIGHT",context)).toThrow("RULA_IMAGE_AI_INVALID_RESPONSE");
 }
});
it("withholds incomplete, hidden, low-confidence and grossly disconnected limb chains",()=>{
 for(const visibility of ["OCCLUDED","MISSING"]){
  const s={...subject,landmarks:subject.landmarks.map(p=>p.name==="wrist"?{...p,x:null,y:null,visibility}:p)};
  expect(parseLocalizedRulaImage(payload(s),"RIGHT",context).sides.RIGHT?.lowerArm.angle).toBeNull();
 }
 const low={...subject,landmarks:subject.landmarks.map(p=>p.name==="elbow"?{...p,confidence:.1}:p)};
 expect(parseLocalizedRulaImage(payload(low),"RIGHT",context).sides.RIGHT?.upperArm.angle).toBeNull();
 const disconnected={...subject,landmarks:subject.landmarks.map(p=>p.name==="elbow"?{...p,x:170,y:211}:p)};
 expect(parseLocalizedRulaImage(payload(disconnected),"RIGHT",context).sides.RIGHT?.lowerArm.measurement?.qualityCodes).toContain("LIMB_CONNECTIVITY_CONFLICT");
});
it("does not convert camera ambiguity into neutral sagittal posture",()=>{
 for(const view of ["FRONTAL","OBLIQUE","UNKNOWN"]){const r=parseLocalizedRulaImage(payload({...subject,view}),"RIGHT",context).sides.RIGHT!;expect(r.upperArm.angle).toBeNull();expect(r.trunk.angle).toBeNull();}
});
it("treats an explicitly unidentified subject as abstention, without invented coordinates or normal angles",()=>{
 const r=parseLocalizedRulaImage(payload(null),"RIGHT",context).sides.RIGHT!;
 expect(r.upperArm).toMatchObject({angle:null,detected:false,requiresReview:true,measurement:{state:"UNMEASURABLE",qualityCodes:["SUBJECT_NOT_IDENTIFIED"]}});
 expect(r.overlay.points).toEqual({});
});
it("preserves LEFT/RIGHT and rotated pixel frames without supplement-angle hacks",()=>{
 const mirrored={...subject,side:"LEFT",subjectId:"B",bounds:{left:650,top:100,right:900,bottom:630},facing:"IMAGE_LEFT",landmarks:subject.landmarks.map(p=>({...p,x:1000-p.x!}))};
 const r=parseLocalizedRulaImage({schemaVersion:"rula-landmarks-v2",sides:{RIGHT:subject,LEFT:mirrored},notes:""},"BOTH",context);
 expect(r.sides.LEFT?.upperArm.angle).toBeCloseTo(r.sides.RIGHT!.upperArm.angle!,10);
 const rotated={...subject,bounds:{left:70,top:100,right:600,bottom:350},up:{x:1,y:0},landmarks:subject.landmarks.map(p=>({...p,x:700-p.y!,y:p.x}))};
 const rr=parseLocalizedRulaImage(payload(rotated),"RIGHT",{width:700,height:1000,normalized:true}).sides.RIGHT!;
 expect(rr.upperArm.angle).toBeCloseTo(60,2);expect(rr.trunk.angle).toBeCloseTo(0,8);
});
it("maps an explicitly selected crop back to the original pixel frame exactly",()=>{
 expect(mapCropPoint({x:.25,y:.5},{left:100,top:50,width:400,height:300},{width:1000,height:700})).toEqual({x:.2,y:200/700});
 expect(()=>mapCropPoint({x:1.1,y:.5},{left:100,top:50,width:400,height:300},{width:1000,height:700})).toThrow();
 expect(()=>mapCropPoint({x:.5,y:.5},{left:800,top:50,width:400,height:300},{width:1000,height:700})).toThrow();
});
it("uses one localization contract without requesting duplicate AI score/overlay/angle measurements",()=>{
 const prompt=buildRulaLandmarkPrompt({bodySide:"BOTH",locale:"en",imageGeometry:context});
 expect(prompt).toContain("rula-landmarks-v2");expect(prompt).toContain("1000");
 expect(prompt).toContain("Do not estimate angles or RULA scores");
 expect(prompt).toContain("subjectId");expect(prompt).toContain("not image LEFT/RIGHT");
});
