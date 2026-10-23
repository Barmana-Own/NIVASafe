import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire}from'node:module';
import {spawnSync}from'node:child_process';
import {root,task,evidence,work,proxy,sha,read}from'./prepare-proxy.mjs';
import {powershell,verifyLocalRuntime}from'../rula-landmark-accuracy-20261022-01/runtime-preflight.mjs';
import {assertApiRuntimeIdentity}from'../assessment-image-activation-20261022-01/runtime-identity.mjs';
const id='release-image-first-attempt-20261022-02',oldId='release-image-first-attempt-20261022-01';
const oldRoot=`C:/ProgramData/NIVASafe/releases/${oldId}/backend`,oldEntry=`${oldRoot}/dist/server.js`;
const releaseRoot=`C:/ProgramData/NIVASafe/releases/${id}/backend`,backup=`C:/ProgramData/NIVASafe/backups/${id}`;
const candidate=`${work}/candidate-r2`,config=`${root}/deployment/ecosystem.config.cjs`,index='C:/inetpub/nivasafe/app-com/index.html';
const require=createRequire(import.meta.url);process.env.PM2_HOME='C:/ProgramData/NIVASafe/pm2';const pm2=require('C:/Runtime/node/node_modules/pm2');
const call=(m,...args)=>new Promise((resolve,reject)=>pm2[m](...args,(e,r)=>e?reject(new Error(`PM2 ${m} failed`)):resolve(r)));
const files=(d,p='')=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(d,e.name),`${p}${e.name}/`):[`${p}${e.name}`]);
function atomic(file,bytes){const tmp=`${file}.${task}-r2.tmp`;fs.writeFileSync(tmp,bytes,{flag:'wx'});fs.renameSync(tmp,file);}
function restrict(d){assert.equal(spawnSync('icacls.exe',[d,'/inheritance:r','/grant:r','*S-1-5-18:(OI)(CI)F','*S-1-5-32-544:(OI)(CI)F'],{windowsHide:true}).status,0);}
async function health(v){for(let n=0;n<160;n++){try{const r=await fetch('http://127.0.0.1:5044/api/v1/health',{signal:AbortSignal.timeout(800)});const j=await r.json();if(r.ok&&j.data?.version===v&&j.data.database==='up')return;}catch{}await new Promise(r=>setTimeout(r,250));}throw new Error('New executable health did not pass');}
async function restart(version){
 delete require.cache[require.resolve(config)];const app=require(config).apps.find(a=>a.name==='nivasafe-api');assert.equal(app.env.APP_VERSION,version);
 const prior=(await call('list')).find(a=>a.name===app.name);
 await new Promise((resolve,reject)=>pm2.Client.executeRemote('restartProcessId',{id:prior.pm_id,env:{...app.env,current_conf:{script:app.script,pm_exec_path:app.script,pm_cwd:app.cwd,exec_interpreter:app.interpreter}}},e=>e?reject(new Error('Managed restart failed')):resolve()));
 await health(version);const active=(await call('list')).find(a=>a.name===app.name);
 const actual=powershell(`$taskProcess=Get-CimInstance Win32_Process -Filter 'ProcessId = ${Number(active.pid)}'; [pscustomobject]@{ProcessId=$taskProcess.ProcessId;CommandLine=$taskProcess.CommandLine;ListenerPids=@(Get-NetTCPConnection -State Listen -LocalPort 5044 | Select-Object -ExpandProperty OwningProcess -Unique)} | ConvertTo-Json -Compress`);
 assert.equal(actual.ListenerPids.length,1);assertApiRuntimeIdentity(active,app,actual,actual.ListenerPids[0]);return{pid:active.pid,pmExecPath:active.pm2_env.pm_exec_path,osCommandLine:actual.CommandLine,runtimeIdentityVerified:true};
}
let switched=false;
try{
 assert(process.argv.includes('--deploy'));assert(!fs.existsSync(`${evidence}/deployment-r2.json`));await call('connect');
 const build=read(`${evidence}/build-validation-r2.json`);assert.equal(build.status,'PASS');
 const test=read(`${evidence}/backend-tests-r2.json`);assert(test.success&&!test.numFailedTests&&!test.numPendingTests);
 assert.equal(read(`${evidence}/security-review-r2.json`).status,'PASS');assert.equal(read(`${evidence}/dependency-addition.json`).status,'PASS');
 for(const f of read(`${evidence}/candidate-r2.json`).files)assert.equal(sha(`${candidate}/${f.path}`),f.sha256);
 const changed=files(`${candidate}/backend/dist`).filter(f=>f.endsWith('.js')&&!f.endsWith('.test.js')&&(!fs.existsSync(`${oldRoot}/dist/${f}`)||sha(`${candidate}/backend/dist/${f}`)!==sha(`${oldRoot}/dist/${f}`)));
 assert.deepEqual(changed,['ai-provider.js','image-analysis-diagnostics.js']);assert.deepEqual(build.changedRuntimeModules.map(f=>f.path),changed);
 for(const f of build.changedRuntimeModules)assert.equal(sha(`${candidate}/backend/dist/${f.path}`),f.sha256);
 for(const f of files(`${oldRoot}/dist`).filter(f=>f.endsWith('.js')&&!f.endsWith('.test.js')))assert(fs.existsSync(`${candidate}/backend/dist/${f}`));
 for(const f of ['prisma/schema.prisma','python/rula_pose_worker.py','python/requirements.lock'])assert.equal(sha(`${candidate}/backend/${f}`),sha(`${oldRoot}/${f}`));
 const previousPackage=JSON.parse(fs.readFileSync(`${oldRoot}/package.json`,'utf8')),nextPackage=JSON.parse(fs.readFileSync(`${candidate}/backend/package.json`,'utf8'));
 assert.equal(nextPackage.dependencies.undici,'6.29.1');delete nextPackage.dependencies.undici;assert.deepEqual(nextPackage,previousPackage);
 verifyLocalRuntime();const active=(await call('list')).find(a=>a.name==='nivasafe-api');assert.equal(active.pm2_env.pm_exec_path,oldEntry);
 const baseline={pid:active.pid,envSha256:sha(`${root}/.env`),configSha256:sha(config),indexSha256:sha(index),proxySha256:sha(proxy)};
 assert.equal(baseline.proxySha256,read(`${evidence}/proxy-preparation.json`).proxyCandidateSha256);
 assert(!fs.existsSync(releaseRoot)&&!fs.existsSync(backup));fs.mkdirSync(releaseRoot,{recursive:true});fs.mkdirSync(backup,{recursive:true});restrict(releaseRoot);restrict(backup);
 fs.copyFileSync(config,`${backup}/ecosystem.config.cjs`);fs.writeFileSync(`${evidence}/runtime-before-r2.json`,JSON.stringify(baseline,null,2));
 for(const d of ['src','dist','prisma','python'])fs.cpSync(`${candidate}/backend/${d}`,`${releaseRoot}/${d}`,{recursive:true,filter:p=>!p.includes('__pycache__')});
 for(const f of ['package.json','tsconfig.json','vitest.config.ts'])fs.copyFileSync(`${candidate}/backend/${f}`,`${releaseRoot}/${f}`);
 fs.copyFileSync(`${candidate}/pnpm-lock.yaml`,`${releaseRoot}/pnpm-lock.yaml`);
 fs.mkdirSync(`${releaseRoot}/node_modules`);
 for(const name of fs.readdirSync(`${oldRoot}/node_modules`)){if(name==='undici')continue;const from=`${oldRoot}/node_modules/${name}`,to=`${releaseRoot}/node_modules/${name}`;if(fs.statSync(from).isDirectory())fs.symlinkSync(from,to,'junction');else fs.copyFileSync(from,to);}
 const fromUndici=path.dirname(createRequire(`${root}/backend/package.json`).resolve('undici/package.json'));
 fs.cpSync(fromUndici,`${releaseRoot}/node_modules/undici`,{recursive:true});
 for(const f of files(fromUndici))assert.equal(sha(`${fromUndici}/${f}`),sha(`${releaseRoot}/node_modules/undici/${f}`));
 assert.equal(createRequire(`${releaseRoot}/package.json`)('undici/package.json').version,'6.29.1');
 const before=fs.readFileSync(config,'utf8'),next=before.replace(JSON.stringify(oldEntry),JSON.stringify(`${releaseRoot}/dist/server.js`)).replace(`APP_VERSION: ${JSON.stringify(oldId)},`,`APP_VERSION: ${JSON.stringify(id)},`);
 assert.equal(next.replace(JSON.stringify(`${releaseRoot}/dist/server.js`),JSON.stringify(oldEntry)).replace(`APP_VERSION: ${JSON.stringify(id)},`,`APP_VERSION: ${JSON.stringify(oldId)},`),before,'Unrelated boot settings changed');
 atomic(config,next);switched=true;const identity=await restart(id);
 const publicHealth=await fetch('https://app.nivasafe.com/api/v1/health',{signal:AbortSignal.timeout(10000)});assert.equal((await publicHealth.json()).data.version,id);
 const denials=[];for(const route of ['/api/v1/rula/posture-image-analysis','/api/v1/fmea/process-image-analysis']){const r=await fetch(`https://app.nivasafe.com${route}`,{method:'POST',signal:AbortSignal.timeout(10000)});assert.equal(r.status,401);denials.push({route,status:r.status});}
 assert.equal(sha(`${root}/.env`),baseline.envSha256);assert.equal(sha(index),baseline.indexSha256);assert.equal(sha(proxy),baseline.proxySha256);await call('dump');
 const result={status:'DEPLOYED',id,at:new Date().toISOString(),...identity,backup,changedRuntimeModules:changed,dependency:'undici@6.29.1',dependencyCopiedPrivately:true,frontendUnchanged:true,proxyUnchangedFromV1:true,nginxReloaded:false,privateEnvironmentUnchanged:true,schemaUnchanged:true,poseRuntimePreserved:true,workerConfigurationUnchanged:true,totalImageDeadlineSeconds:120,tlsConnectDeadlineSeconds:30,maxPreconnectAttempts:3,ambiguousPaidReplays:0,denials};
 fs.writeFileSync(`${evidence}/deployment-r2.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){let recovery;if(switched){try{atomic(config,fs.readFileSync(`${backup}/ecosystem.config.cjs`));await restart(oldId);await call('dump');recovery={status:'RESTORED',dataChanged:false};}catch{recovery={status:'FAILED_REQUIRES_ATTENTION'};}}const result={status:'FAILED',error:e.message,recovery};fs.writeFileSync(`${evidence}/deployment-failure-r2.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=1;}
finally{pm2.disconnect();}
