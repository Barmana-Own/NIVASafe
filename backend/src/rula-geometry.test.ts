import { describe, expect, it } from "vitest";
import { angleBetween, signedAngle, vector, measureRulaImagePlane, type LandmarkFrame } from "./rula-geometry.js";

const point = (x: number, y: number) => ({ x, y, confidence: 0.95, visibility: "VISIBLE" as const });
const frame: LandmarkFrame = {
  width: 1000, height: 700, view: "SAGITTAL", facing: "IMAGE_RIGHT", up: { x: 0, y: -1 },
  points: { head:point(.17,146/700), neck:point(.17,174/700), shoulder:point(.17,.3), hip:point(.17,395/700), elbow:point(.26526,265/700), wrist:point(.21026,360.26/700), hand:point(.19526,386.24/700) },
};
describe("image-plane geometry (not 3D anatomical certification)", () => {
  it("uses lengths, dot products and an explicit signed frame", () => {
    expect(vector({x:1,y:2},{x:4,y:6})).toEqual({x:3,y:4});
    expect(angleBetween({x:1,y:0},{x:0,y:1})).toBeCloseTo(90,10);
    expect(angleBetween({x:1,y:0},{x:-1,y:0})).toBeCloseTo(180,10);
    expect(signedAngle({x:0,y:-1},{x:1,y:0})).toBeCloseTo(90,10);
    expect(angleBetween({x:0,y:0},{x:1,y:0})).toBeNull();
    expect(angleBetween({x:NaN,y:0},{x:1,y:0})).toBeNull();
  });
  it("recovers the frozen reference without interpreting normalized coordinates as square pixels", () => {
    expect(measureRulaImagePlane("upperArm",frame).angle).toBeCloseTo(60,2);
    expect(measureRulaImagePlane("lowerArm",frame).angle).toBeCloseTo(90,2);
    expect(measureRulaImagePlane("wrist",frame).angle).toBeCloseTo(0,1);
    expect(measureRulaImagePlane("neck",frame).angle).toBeCloseTo(0,10);
    expect(measureRulaImagePlane("trunk",frame).angle).toBeCloseTo(0,10);
  });
  it("uses the elbow interior angle, not its supplement or the wrist direction", () => {
    const f={...frame,points:{...frame.points,shoulder:point(.5,.2),elbow:point(.5,.4),wrist:point(.5,.6)}};
    expect(measureRulaImagePlane("lowerArm",f).angle).toBeCloseTo(180,10);
    expect(measureRulaImagePlane("wrist",{...f,points:{...f.points,hand:point(.5,.8)}}).angle).toBeCloseTo(0,10);
  });
  it("preserves flexion and extension under horizontal mirroring", () => {
    const mirror: LandmarkFrame={...frame,facing:"IMAGE_LEFT",points:Object.fromEntries(Object.entries(frame.points).map(([k,p])=>[k,{...p,x:1-p.x}]))};
    for(const part of ["upperArm","lowerArm","wrist","neck","trunk"] as const) expect(measureRulaImagePlane(part,mirror).angle).toBeCloseTo(measureRulaImagePlane(part,frame).angle!,8);
    const extension={...frame,points:{...frame.points,elbow:point(.07474,265/700)}};
    expect(measureRulaImagePlane("upperArm",extension).angle).toBeCloseTo(-60,2);
  });
  it("handles rotated image-plane coordinates only with a matching reference axis", () => {
    const rotated: LandmarkFrame={...frame,width:700,height:1000,up:{x:1,y:0},points:Object.fromEntries(Object.entries(frame.points).map(([k,p])=>[k,{...p,x:1-p.y,y:p.x}]))};
    expect(measureRulaImagePlane("upperArm",rotated).angle).toBeCloseTo(60,2);
    expect(measureRulaImagePlane("trunk",rotated).angle).toBeCloseTo(0,8);
  });
  it.each(["FRONTAL","OBLIQUE","UNKNOWN"] as const)("abstains from sagittal flexion in a %s view", view => {
    expect(measureRulaImagePlane("upperArm",{...frame,view})).toMatchObject({angle:null,code:"VIEW_UNSUITABLE"});
  });
  it("abstains for hidden, missing, low-confidence and coincident landmarks", () => {
    expect(measureRulaImagePlane("lowerArm",{...frame,points:{...frame.points,elbow:{...frame.points.elbow!,visibility:"OCCLUDED"}}}).code).toBe("LANDMARK_NOT_VISIBLE");
    const {hand:_,...missing}=frame.points;
    expect(measureRulaImagePlane("wrist",{...frame,points:missing}).code).toBe("LANDMARK_MISSING");
    expect(measureRulaImagePlane("upperArm",{...frame,points:{...frame.points,elbow:{...frame.points.elbow!,confidence:.2}}}).code).toBe("LANDMARK_LOW_CONFIDENCE");
    expect(measureRulaImagePlane("lowerArm",{...frame,points:{...frame.points,elbow:frame.points.shoulder!}}).code).toBe("DEGENERATE_SEGMENT");
  });
  it("never infers axial wrist rotation or foot support from 2D joint angles", () => {
    expect(measureRulaImagePlane("wristTwist",frame)).toMatchObject({angle:null,code:"OUT_OF_PLANE_UNMEASURABLE"});
    expect(measureRulaImagePlane("legs",frame)).toMatchObject({angle:null,code:"SUPPORT_REQUIRES_OBSERVATION"});
  });
  it("does not require a gravity axis for joint-relative angles; trunk still needs gravity",()=>{
    const noGravity={...frame,up:{x:0,y:0}};
    for(const part of ["upperArm","lowerArm","wrist","neck"] as const){
      expect(measureRulaImagePlane(part,noGravity).angle).toBeCloseTo(measureRulaImagePlane(part,frame).angle!,8);
    }
    expect(measureRulaImagePlane("trunk",noGravity)).toMatchObject({angle:null,code:"REFERENCE_FRAME_UNKNOWN"});
  });
});
