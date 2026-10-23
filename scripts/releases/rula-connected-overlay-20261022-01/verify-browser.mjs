import fs from 'node:fs';
import assert from 'node:assert/strict';
import {evidence,read,sha} from './prepare.mjs';

const before=read(`${evidence}/browser-before.json`).overlays;
assert.equal(before.length,1);
assert.equal(before[0].strokeWidth,'0.008px');
assert.equal(before[0].lineCount,5);
const verified=[];
for(const view of ['inline','lightbox']){
  const overlays=read(`${evidence}/browser-${view}-after.json`).overlays;
  assert.equal(overlays.length,1);
  const overlay=overlays[0];
  assert.equal(overlay.lineCount,7);
  assert.equal(overlay.pointCount,8);
  assert.equal(overlay.strokeWidth,'2px');
  assert.equal(overlay.linecap,'round');
  assert.equal(overlay.vectorEffect,'non-scaling-stroke');
  assert.deepEqual(overlay.points,before[0].points,'Saved landmark coordinates must remain unchanged');
  const maxFrameDelta=Math.max(...['x','y','width','height'].map(key=>Math.abs(overlay.image[key]-overlay.svg[key])));
  assert(maxFrameDelta<=0.5,'Overlay frame must align within half a CSS pixel');
  verified.push({view,lineCount:7,pointCount:8,strokeWidth:'2px',coordinatesUnchanged:true,maxFrameDeltaCssPixels:maxFrameDelta});
}
const result={status:'PASS',verifiedAt:new Date().toISOString(),views:verified,oldStrokeWidth:'0.008px',newStrokeWidth:'2px',oldLineCount:5,newLineCount:7,unchangedNativePoints:8,providerCallsRequired:0,assessmentSaved:false,screenshot:'live-connected-landmarks.png',screenshotSha256:sha(`${evidence}/live-connected-landmarks.png`)};
fs.writeFileSync(`${evidence}/browser-verification.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
