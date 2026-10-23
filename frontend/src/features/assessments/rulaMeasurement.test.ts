import {expect,it} from "vitest";
import {measurementFromValue,measurementQualityLabel} from "./rulaMeasurement";
import {isRulaPostureResultReviewed} from "./rulaPostureReview";
const measurement={version:"image-plane-audit-v1",state:"CONFLICT",basis:"IMAGE_PLANE",aiAngle:180,aiScore:2,geometryAngle:90,qualityCodes:["ANGLE_LANDMARK_CONFLICT"],view:"SAGITTAL",width:1000,height:700,landmarks:[]};
it("preserves immutable original AI/geometry suggestions across local review normalization",()=>{
  expect(measurementFromValue(measurement)).toEqual(measurement);
  expect(measurementFromValue({...measurement,landmarks:Array(10).fill({})})).toBeUndefined();
  expect(measurementFromValue({...measurement,geometryAngle:NaN})).toBeUndefined();
});
it("preserves explicit model detection without coercing legacy or malformed flags",()=>{
  expect(measurementFromValue({...measurement,aiDetected:true})).toEqual({...measurement,aiDetected:true});
  expect(measurementFromValue({...measurement,aiDetected:false})).toEqual({...measurement,aiDetected:false});
  expect(measurementFromValue(measurement)).not.toHaveProperty("aiDetected");
  for(const aiDetected of [null,0,1,"true","false",{},[]]) expect(measurementFromValue({...measurement,aiDetected})).toBeUndefined();
  expect(measurementFromValue({...measurement,aiDetected:true,unexpected:"discard"})).not.toHaveProperty("unexpected");
});
it("uses controlled localized uncertainty labels",()=>{
  expect(measurementQualityLabel(measurementFromValue(measurement),"fa")).toBe("تعارض زاویه و مفصل‌ها");
  expect(measurementQualityLabel(measurementFromValue(measurement),"en")).toBe("Angle/landmark conflict");
});
it("does not equate an AI confirmation flag with a corrected conflicting measurement",()=>{
  expect(isRulaPostureResultReviewed({source:"AI",confirmedByUser:true,requiresReview:true,angle:null,detected:false,measurement:measurementFromValue(measurement)})).toBe(false);
  expect(isRulaPostureResultReviewed({source:"USER",confirmedByUser:true,requiresReview:true,angle:90,detected:true,measurement:measurementFromValue(measurement)})).toBe(true);
});
it("retains the experimental geometry source and body identity through manual review normalization",()=>{
 const m={...measurement,version:"landmark-geometry-v2",trustedSource:"DETERMINISTIC_IMAGE_PLANE",subjectId:"A",subjectBounds:{left:.1,top:.1,right:.9,bottom:.9},facing:"IMAGE_RIGHT",referenceUp:{x:0,y:-1}};
 expect(measurementFromValue(m)).toEqual(m);
 expect(measurementFromValue({...m,subjectId:"../private"})).toBeUndefined();
});
