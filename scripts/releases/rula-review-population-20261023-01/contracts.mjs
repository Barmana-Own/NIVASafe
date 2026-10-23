import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {task,evidence,candidate,sha,read,frozen} from './prepare.mjs';
frozen();const build=read(`${evidence}/build-validation.json`),browser=read(`${evidence}/e2e-validation.json`);for(const g of [build,browser]){assert.equal(g.status,'PASS');assert.equal(g.candidateManifestSha256,sha(`${evidence}/candidate.json`));}
const ai=await import(pathToFileURL(`${candidate}/backend/dist/rula-posture-ai.js`).href),posture=await import(pathToFileURL(`${candidate}/backend/dist/rula-posture.js`).href),{z}=createRequire(`${candidate}/backend/package.json`)('zod');
const wire=ai.rulaPostureImageAnalysisResponseSchema.extend({analysisRequestId:z.string().uuid()});
let responses=0,observations=0,approvalDenials=0,proposalMetadata=0,rawConflicts=0;
for(const ledger of browser.ledgers??[]){
 for(const response of ledger.inferenceResponses??[]){const parsed=wire.parse(response.data);assert(parsed.sides[response.bodySide]);responses++;for(const side of Object.values(parsed.sides))for(const key of posture.rulaPosturePartKeys){const row=side[key];if(row.measurement?.aiDetected!==undefined){assert.equal(typeof row.measurement.aiDetected,'boolean');proposalMetadata++;}if(row.measurement?.state==='CONFLICT'){assert.equal(row.angle,null);assert.equal(row.detected,false);assert.equal(row.score,1);rawConflicts++;}}}
 for(const observation of ledger.observations??[]){const analysis=posture.rulaPostureAnalysisSchema.parse(observation.postureAnalysis);posture.assertRulaPostureSide(observation.bodySide,analysis);observations++;if(!posture.isRulaPostureAnalysisReviewed(observation.bodySide,analysis)){assert.throws(()=>posture.assertRulaFinalStatusReviewed('APPROVED',observation.bodySide,analysis));approvalDenials++;}}
}
assert(responses>=8&&observations>=8&&proposalMetadata>0&&rawConflicts>0&&approvalDenials>0,'Exercise actual bilateral image wire and observation contracts');
const result={status:'PASS',task,candidateManifestSha256:sha(`${evidence}/candidate.json`),buildEvidenceSha256:sha(`${evidence}/build-validation.json`),browserEvidenceSha256:sha(`${evidence}/e2e-validation.json`),helperSha256:sha(new URL(import.meta.url)),schemaValidatedInferenceResponses:responses,schemaValidatedObservations:observations,strictBooleanProposalMetadata:proposalMetadata,conflictingAuditsPreserved:rawConflicts,unreviewedApprovalDenials:approvalDenials,productionDatabaseAndProviderAccess:false};fs.writeFileSync(`${evidence}/contract-validation.json`,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
