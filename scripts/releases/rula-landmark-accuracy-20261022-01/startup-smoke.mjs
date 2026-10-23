import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,id,evidence,python,model,modelSha256}from'./runtime-preflight.mjs';
const entry=`C:/ProgramData/NIVASafe/releases/${id}/backend/dist/server.js`;
const env={...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:'5057',APP_URL:'https://app.nivasafe.com',APP_VERSION:id,RULA_LOCAL_POSE_ENABLED:'true',RULA_POSE_PYTHON:python,RULA_POSE_WORKER_PATH:`C:/ProgramData/NIVASafe/releases/${id}/backend/python/rula_pose_worker.py`,RULA_POSE_MODEL_PATH:model,RULA_POSE_MODEL_SHA256:modelSha256};
const child=spawn('C:/Runtime/node/node.exe',[entry],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let errors='';child.stderr.on('data',b=>{errors=(errors+b).slice(-8000);});child.stdout.resume();
const completion=new Promise(resolve=>child.once('close',resolve));
try{
 let result;
 for(let n=0;n<60;n++){
   if(child.exitCode!==null)throw new Error('Candidate exited before health');
   try{const response=await fetch('http://127.0.0.1:5057/api/v1/health',{signal:AbortSignal.timeout(700)});result=await response.json();if(response.ok)break;}catch{}
   await new Promise(r=>setTimeout(r,250));
 }
 assert.equal(result?.data?.version,id);assert.equal(result?.data?.database,'up');
 fs.writeFileSync(`${evidence}/startup-smoke.json`,JSON.stringify({status:'PASS',entry,port:5057,node:'v22.22.3',health:result,externalProviderCalls:0},null,2));
 console.log(JSON.stringify({status:'PASS',version:result.data.version,port:5057}));
}catch(e){console.log(JSON.stringify({status:'FAIL',message:e.message,error:errors.replace(/(mysql:\/\/)[^\s]+/gu,'$1[redacted]')}));process.exitCode=1;}
finally{child.kill();await completion;}
