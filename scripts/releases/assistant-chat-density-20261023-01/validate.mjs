import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {task,candidate,evidence,sha,read,liveFiles,frozen} from './prepare.mjs';
const checks=[];assert(!fs.existsSync(`${evidence}/build-validation.json`));
function save(status,extra={}){fs.writeFileSync(`${evidence}/build-validation.json`,JSON.stringify({task,status,candidateManifestSha256:sha(`${evidence}/candidate.json`),cssSupplementSha256:read(`${evidence}/candidate.json`).cssSupplementSha256,checks,...extra},null,2));}
async function run(name,cwd,args){const fd=fs.openSync(`${evidence}/${name}.log`,'wx');const began=Date.now();const code=await new Promise(resolve=>{const child=spawn(process.execPath,args,{cwd,env:process.env,shell:false,windowsHide:true,stdio:['ignore',fd,fd]});child.on('error',()=>resolve(-1));child.on('close',value=>resolve(value??-1));});fs.closeSync(fd);checks.push({name,command:[process.execPath,...args],cwd,status:code===0?'PASS':'FAIL',exitCode:code,elapsedMs:Date.now()-began});save('RUNNING');console.log(JSON.stringify({name,status:checks.at(-1).status}));assert.equal(code,0,`${name} failed`);}
try{frozen();await run('domain-build',`${candidate}/shared/domain`,['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
 await run('frontend-tests',`${candidate}/frontend`,['node_modules/vitest/vitest.mjs','run','src','--configLoader','runner','--maxWorkers=2','--reporter=json',`--outputFile=${evidence}/frontend-tests.json`]);
 await run('frontend-typecheck-lint',`${candidate}/frontend`,['node_modules/typescript/bin/tsc','-b','--noEmit']);
 await run('frontend-compile',`${candidate}/frontend`,['node_modules/typescript/bin/tsc','-b']);
 await run('frontend-build',`${candidate}/frontend`,['node_modules/vite/bin/vite.js','build','--configLoader','runner']);
 frozen();const result=read(`${evidence}/frontend-tests.json`);assert(result.success&&!result.numFailedTests&&!result.numPendingTests);const artifacts=['frontend/dist','shared/domain/dist'].flatMap(directory=>liveFiles(`${candidate}/${directory}`).map(file=>({path:`${directory}/${file}`,sha256:sha(`${candidate}/${directory}/${file}`)})));
 save('PASS',{tests:{frontend:{total:result.numTotalTests,passed:result.numPassedTests,failed:result.numFailedTests,pending:result.numPendingTests}},artifacts,backend:'UNCHANGED_NOT_REBUILT',schemaAndMigrations:'UNCHANGED'});
}catch(error){save('FAIL',{error:error.message});console.log(JSON.stringify({status:'FAIL',error:error.message}));process.exitCode=1;}
