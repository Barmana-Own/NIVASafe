import {readFileSync} from "node:fs";
import {expect,it} from "vitest";
import {measureRulaImagePlane,type LandmarkFrame} from "./rula-geometry.js";
const data=JSON.parse(readFileSync(new URL("../test-fixtures/rula-geometry/reference-cases.json",import.meta.url),"utf8")) as {cases:{id:string;frame:LandmarkFrame;expected:Record<"upperArm"|"lowerArm"|"wrist"|"neck"|"trunk",number>;hidden:string[]}[]};
for(const fixture of data.cases) for(const part of ["upperArm","lowerArm","wrist","neck","trunk"] as const) it(`${fixture.id}: ${part}`,()=>{
  const result=measureRulaImagePlane(part,fixture.frame);
  if(fixture.frame.view!=="SAGITTAL") expect(result.code).toBe("VIEW_UNSUITABLE");
  else if(result.landmarks.some(p=>fixture.hidden.includes(p))) expect(result.code).toBe("LANDMARK_NOT_VISIBLE");
  else expect(result.angle).toBeCloseTo(fixture.expected[part],8);
});
