import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {task,candidate,evidence,oldBackend,sha,read,liveFiles,frozen} from './prepare.mjs';
const checks=[];assert(!fs.existsSync(`${evidence}/build-validation.json`));
function save(status,extra={}){fs.writeFileSync(`${evidence}/build-validation.json`,JSON.stringify({task,status,candidateManifestSha256:sha(`${evidence}/candidate.json`),checks,...extra},null,2));}
async function run(name,cwd,args,extraEnv={}){const fd=fs.openSync(`${evidence}/${name}.log`,'wx');const began=Date.now();const code=await new Promise(resolve=>{const child=spawn(process.execPath,args,{cwd,env:{...process.env,...extraEnv},shell:false,windowsHide:true,stdio:['ignore',fd,fd]});child.on('error',()=>resolve(-1));child.on('close',value=>resolve(value??-1));});fs.closeSync(fd);checks.push({name,command:[process.execPath,...args],cwd,status:code===0?'PASS':'FAIL',exitCode:code,elapsedMs:Date.now()-began});save('RUNNING');console.log(JSON.stringify(checks.at(-1)));assert.equal(code,0,`${name} failed`);}
try{
 const manifest=frozen();
 await run('domain-build',`${candidate}/shared/domain`,['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
 await run('domain-tests',`${candidate}/shared/domain`,['node_modules/vitest/vitest.mjs','run','src','--maxWorkers=2','--reporter=json',`--outputFile=${evidence}/domain-tests.json`]);
 await run('backend-tests',`${candidate}/backend`,['node_modules/vitest/vitest.mjs','run','src','test','--configLoader','runner','--maxWorkers=2','--reporter=json',`--outputFile=${evidence}/backend-tests.json`]);
 await Promise.all([run('backend-typecheck-lint',`${candidate}/backend`,['node_modules/typescript/bin/tsc','-p','tsconfig.json','--noEmit']),run('prisma-schema-validate',`${candidate}/backend`,['node_modules/prisma/build/index.js','validate','--schema','prisma/schema.prisma'],{DATABASE_URL:'mysql://unused@127.0.0.1:53306/schema_validation_only'})]);
 await run('backend-build',`${candidate}/backend`,['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
 frozen();const tests={};for(const scope of ['backend','domain']){const suite=read(`${evidence}/${scope}-tests.json`);assert(suite.success&&!suite.numFailedTests&&!suite.numPendingTests);tests[scope]={total:suite.numTotalTests,passed:suite.numPassedTests,failed:suite.numFailedTests,pending:suite.numPendingTests};}
 const js=liveFiles(`${candidate}/backend/dist`).filter(file=>file.endsWith('.js')&&!file.endsWith('.test.js'));
 const changed=js.filter(file=>!fs.existsSync(`${oldBackend}/dist/${file}`)||sha(`${candidate}/backend/dist/${file}`)!==sha(`${oldBackend}/dist/${file}`));assert.deepEqual(changed.sort(),manifest.expectedChangedRuntimeModules);
 for(const file of liveFiles(`${oldBackend}/dist`).filter(file=>file.endsWith('.js')&&!file.endsWith('.test.js')))assert(js.includes(file));
 for(const directory of ['prisma','python'])for(const file of liveFiles(`${oldBackend}/${directory}`).filter(file=>!file.includes('__pycache__')))assert.equal(sha(`${candidate}/backend/${directory}/${file}`),sha(`${oldBackend}/${directory}/${file}`));
 const artifacts=['backend/dist','shared/domain/dist'].flatMap(directory=>liveFiles(`${candidate}/${directory}`).map(file=>({path:`${directory}/${file}`,sha256:sha(`${candidate}/${directory}/${file}`)})));
 save('PASS',{tests,changedRuntimeModules:changed,artifacts,frontend:'UNCHANGED_NOT_REBUILT',noMigration:true});
}catch(error){save('FAIL',{error:error.message});process.exitCode=1;console.log(JSON.stringify({status:'FAIL',error:error.message}));}
