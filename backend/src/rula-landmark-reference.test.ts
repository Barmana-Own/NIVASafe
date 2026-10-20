import {readFileSync} from "node:fs";
import {expect,it} from "vitest";
import {measureRulaImagePlane,type LandmarkFrame} from "./rula-geometry.js";
import {suggestedRulaPostureScore} from "@nivasafe/domain";
type Part="upperArm"|"lowerArm"|"wrist"|"neck"|"trunk";
const reference=JSON.parse(readFileSync(new URL("../test-fixtures/rula-landmarks-r8-reference.json",import.meta.url),"utf8")) as {cases:{id:string;frame:LandmarkFrame;measurements:Record<Part,{reference:number;measurable:boolean}>}[]};
it.each(reference.cases)("independent rig $id agrees with analytic geometry or explicitly abstains",test=>{
 for(const part of ["upperArm","lowerArm","wrist","neck","trunk"] as const){
  const result=measureRulaImagePlane(part,test.frame),truth=test.measurements[part];
  if(truth.measurable)expect(result.angle).toBeCloseTo(truth.reference,7);else expect(result.angle).toBeNull();
 }
});
it.each([
 ["upperArm",-21,2],["upperArm",-20,1],["upperArm",20,1],["upperArm",20.001,2],["upperArm",45,2],["upperArm",45.001,3],["upperArm",90,3],["upperArm",90.001,4],
 ["lowerArm",59.999,2],["lowerArm",60,1],["lowerArm",100,1],["lowerArm",100.001,2],
 ["wrist",0,1],["wrist",.001,2],["wrist",15,2],["wrist",15.001,3],
 ["neck",-1,4],["neck",10,1],["neck",10.001,2],["neck",20.001,3],
 ["trunk",0,1],["trunk",20,2],["trunk",20.001,3],["trunk",60.001,4],
] as const)("preserves the documented base band for %s at %s degrees",(part,angle,score)=>{
 expect(suggestedRulaPostureScore(part,angle,true,1)).toBe(score);
});
