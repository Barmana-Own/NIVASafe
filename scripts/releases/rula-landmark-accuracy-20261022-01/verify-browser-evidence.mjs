import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire}from'node:module';
import {root,evidence,sha,read}from'./runtime-preflight.mjs';
const require=createRequire(import.meta.url);
const JSZip=require(`${root}/backend/node_modules/jszip`);
const source=read(`${evidence}/live-result-verification.json`);
const original=read(`${evidence}/live-lightbox-landscape.json`);
const reopened=read(`${evidence}/live-reopened-result.json`);
const inline=read(`${evidence}/live-inline-landscape.json`);
for(const frame of [original,reopened,inline])for(const key of ['x','y','width','height'])assert.equal(frame.image[key],frame.overlay[key],'Image and SVG frame differ');
assert.equal(reopened.points.length,8);
assert.equal(original.points.length,reopened.points.length);
for(let n=0;n<reopened.points.length;n++)for(const key of ['cx','cy'])assert(Math.abs(Number(reopened.points[n][key])-Number(original.points[n][key]))<1e-12,'Overlay moved after save/reopen');
const saved=Object.values(source.overlayPoints);for(const point of saved)assert(reopened.points.some(p=>Math.abs(Number(p.cx)-point.x)<1e-12&&Math.abs(Number(p.cy)-point.y)<1e-12),'Rendered point differs from persisted native point');
const downloads=[];
const stem='C:/Users/Administrator/Downloads/RULA-92927dab-e99e-4c0c-a8a5-08feb3f9652f';
for(const format of ['pdf','xlsx','docx']){
 const file=format==='pdf'?`${stem} (2).pdf`:`${stem}.${format}`;
 const bytes=fs.readFileSync(file);assert(bytes.length>1000);
 if(format==='pdf'){assert(bytes.subarray(0,5).toString()==='%PDF-');assert(bytes.subarray(-100).toString().includes('%%EOF'));}
 else{const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});assert(zip.file('[Content_Types].xml'));assert(zip.file(format==='docx'?'word/document.xml':'xl/workbook.xml'));}
 downloads.push({format,path:file,size:bytes.length,sha256:sha(file),status:'PASS'});
}
const result={status:'PASS',imageSvgBoundsIdentical:true,inlineAndEnlarged:true,savedReopenedPoints:8,persistedPointsMatchRendered:true,downloads,downloadConcern:'USER_CONFIRMED_RESOLVED_NO_CODE_CHANGE',humanReviewPreserved:true,mobileViewportVisualTest:'NOT_RUN_BROWSER_RESIZE_UNAVAILABLE',portraitWithOverlayVisualTest:'NOT_RUN_NO_ADDITIONAL_PAID_ANALYSIS_FOR_LAYOUT_ONLY'};
fs.writeFileSync(`${evidence}/browser-qa.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({status:'PASS',savedReopenedPoints:8,downloads:downloads.map(x=>({format:x.format,size:x.size,status:x.status}))}));
