import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire}from'node:module';
import {createHash}from'node:crypto';
import {root,evidence,task,modelSha256}from'./runtime-preflight.mjs';
process.loadEnvFile(`${root}/.env`);
const require=createRequire(import.meta.url);
const {PrismaClient}=require(`${root}/backend/node_modules/@prisma/client`);
const db=new PrismaClient();
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const fingerprint=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
function overlays(v,found=[]){if(!v||typeof v!=='object')return found;if(v.points?.shoulder)found.push(v.points);for(const x of Object.values(v))overlays(x,found);return found;}
try{
 const userAssessmentId='8492eed4-485e-472c-a129-10a33ccde98c';
 const testAssessmentId='92927dab-e99e-4c0c-a8a5-08feb3f9652f';
 const original=JSON.parse(fs.readFileSync(`${root}/.local/pre-landmark-git-20261022/supplied-assessment-private.json`,'utf8'));
 const [userRecord,testRecord,lastVersion]=await Promise.all([
   db.rulaAssessment.findUniqueOrThrow({where:{id:userAssessmentId},select:{postureAnalysis:true,inputs:true}}),
   db.rulaAssessment.findUniqueOrThrow({where:{id:testAssessmentId},select:{postureAnalysis:true,organizationId:true,version:true,status:true}}),
   db.rulaVersion.findFirstOrThrow({where:{assessmentId:testAssessmentId},orderBy:{version:'desc'},select:{createdBy:true}}),
 ]);
 assert.equal(fingerprint(userRecord.postureAnalysis),fingerprint(original.postureAnalysis),'Original user assessment was changed');
 assert(lastVersion.createdBy);
 const results=await db.aIAnalysisRequest.findMany({where:{userId:lastVersion.createdBy,organizationId:testRecord.organizationId,type:'RULA_POSTURE_IMAGE',createdAt:{gte:new Date('2026-10-22T18:18:00Z')}},select:{id:true,output:true,status:true,attempts:true,createdAt:true,completedAt:true},orderBy:{createdAt:'desc'},take:3});
 const result=results.find(r=>{const p=r.output?.sides?.RIGHT?.overlay?.points;return p?.shoulder?.x>.55&&p.shoulder.x<.6&&p.ankle?.x<.42;});
 assert(result,'No corresponding native-pose result found');
 const points=result.output.sides.RIGHT.overlay.points;
 assert.equal(Object.keys(points).length,8);assert(!points.neck);
 const savedPoints=overlays(testRecord.postureAnalysis).find(p=>fingerprint(p)===fingerprint(points));
 assert(savedPoints,'Corrected overlay did not survive assessment save');
 const audit=await db.auditLog.findFirstOrThrow({where:{entityId:result.id,action:'RULA_POSTURE_IMAGE_ANALYSIS',userId:lastVersion.createdBy},select:{metadata:true}});
 assert.equal(audit.metadata.landmarkSource,'MEDIAPIPE_POSE_LANDMARKER');
 assert.equal(audit.metadata.landmarkModelSha256,modelSha256);
 const preflight=JSON.parse(fs.readFileSync(`${evidence}/node-worker-smoke.json`,'utf8'));
 assert(preflight.localNetworkBlocked);
 const resultEvidence={status:'PASS',task,testAssessmentId,analysisRequestId:result.id,testAssessmentVersion:testRecord.version,testAssessmentStatus:testRecord.status,originalAssessmentUnchanged:true,analysisStatus:result.status,providerValidationAttempts:result.attempts,modelSha256,landmarkSource:audit.metadata.landmarkSource,overlayPoints:points,persistedOverlayMatchesAnalysisExactly:true,neckInvented:false,manualReviewRequired:true,sourceRowsCertifiedByAgent:false,completedAt:result.completedAt};
 fs.writeFileSync(`${evidence}/live-result-verification.json`,JSON.stringify(resultEvidence,null,2));
 console.log(JSON.stringify({status:'PASS',points:Object.keys(points).length,originalAssessmentUnchanged:true,persistedOverlayMatches:true,source:audit.metadata.landmarkSource}));
}finally{await db.$disconnect();}
