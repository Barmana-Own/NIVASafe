import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {root,task,id,candidate,evidence,config,sha} from './prepare.mjs';
const deployed=process.argv.includes('--deployed');
const output=`${evidence}/${deployed?'deployed':'candidate'}-live-text.json`;assert(!fs.existsSync(output));
const runtime=createRequire(import.meta.url)(config).apps.find(app=>app.name==='nivasafe-api');
if(deployed)assert.equal(runtime.env.APP_VERSION,id);
Object.assign(process.env,runtime.env);process.loadEnvFile(`${root}/.env`);
// Synthetic text, no real account/organization context, no allowance/audit write.
process.env.AI_PROVIDER_MAX_ATTEMPTS='1';
const base=deployed?path.dirname(runtime.script):`${candidate}/backend/dist`;
const {getAvailableAssessmentAIProvider}=await import(pathToFileURL(`${base}/ai-provider.js`));
const {buildRulaTaskDescriptionPrompt,cleanRulaTaskDescription}=await import(pathToFileURL(`${base}/rula-posture-ai.js`));
const {imageAnalysisFailureMetadata}=await import(pathToFileURL(`${base}/image-analysis-diagnostics.js`));
const {prisma}=await import(pathToFileURL(`${base}/core.js`));
const result={task,at:new Date().toISOString(),candidateManifestSha256:sha(`${evidence}/candidate.json`),providerModuleSha256:sha(`${base}/ai-provider.js`),kind:deployed?'DEPLOYED_ADAPTER':'CANDIDATE_ADAPTER',fetchOverride:false,customerImageTransfers:0,productionBusinessMutations:0};
const began=Date.now();
try{
 const provider=getAvailableAssessmentAIProvider();assert(provider.available());
 const response=await provider.analyze({organizationId:'synthetic-availability-diagnostic',includeKnowledge:false,message:buildRulaTaskDescriptionPrompt({jobTitle:'اپراتور تصفیه‌خانه',taskDescription:'',locale:'fa'}),maxOutputTokens:1200});
 assert.equal(response.provider,'arvancloud');assert(cleanRulaTaskDescription(response.answer));
 Object.assign(result,{status:'PASS',provider:response.provider,model:response.model,usage:response.usage,acceptedTaskDescription:true,characters:response.answer.length});
}catch(error){Object.assign(result,{status:'FAIL',...imageAnalysisFailureMetadata(error)});process.exitCode=1;}
finally{result.elapsedMs=Date.now()-began;fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});await prisma.$disconnect();console.log(JSON.stringify(result));}
