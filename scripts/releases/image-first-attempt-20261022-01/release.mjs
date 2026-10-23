import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire}from'node:module';
import {spawnSync}from'node:child_process';
import {root,task,id,evidence,work,proxy,sha,read,nginxCheck,imageLocation}from'./prepare-proxy.mjs';
import {powershell,verifyLocalRuntime}from'../rula-landmark-accuracy-20261022-01/runtime-preflight.mjs';
import {assertApiRuntimeIdentity}from'../assessment-image-activation-20261022-01/runtime-identity.mjs';

const require=createRequire(import.meta.url);process.env.PM2_HOME='C:/ProgramData/NIVASafe/pm2';
const pm2=require('C:/Runtime/node/node_modules/pm2');
const call=(method,...args)=>new Promise((resolve,reject)=>pm2[method](...args,(error,result)=>error?reject(new Error(`PM2 ${method} failed`)):resolve(result)));
const config=`${root}/deployment/ecosystem.config.cjs`,live='C:/inetpub/nivasafe/app-com';
const releaseRoot=`C:/ProgramData/NIVASafe/releases/${id}/backend`,backup=`C:/ProgramData/NIVASafe/backups/${id}`;
const candidate=`${work}/candidate/backend`;
const oldVersion='release-rula-landmark-accuracy-20261022-01';
const oldEntry=`C:/ProgramData/NIVASafe/releases/${oldVersion}/backend/dist/server.js`;
const oldRoot=path.dirname(path.dirname(oldEntry));
const files=(d,p='')=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(d,e.name),`${p}${e.name}/`):[`${p}${e.name}`]);
let proxySwitched=false,apiSwitched=false;
const resuming=process.argv.includes('--resume');
function atomic(file,data){const tmp=`${file}.${task}.tmp`;fs.writeFileSync(tmp,data,{flag:'wx'});fs.renameSync(tmp,file);}
function restrict(directory){const r=spawnSync('icacls.exe',[directory,'/inheritance:r','/grant:r','*S-1-5-18:(OI)(CI)F','*S-1-5-32-544:(OI)(CI)F'],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0);}
function reloadProxy(){
 // The running master belongs to SYSTEM. Use its existing operator-provisioned
 // reload task, without changing its principal, action, permissions or triggers.
 const result=powershell(`$taskReload=Get-ScheduledTask -TaskName 'NginxReloadOnce'; if($taskReload.Principal.UserId -notin @('SYSTEM','S-1-5-18') -or @($taskReload.Actions).Count -ne 1) { throw 'Unexpected reload principal/action' }; $taskAction=$taskReload.Actions[0]; if($taskAction.Execute.Replace('\\','/').ToLowerInvariant() -ne 'c:/runtime/nginx/nginx.exe' -or $taskAction.Arguments.Replace('\\','/').ToLowerInvariant() -ne '-p c:/runtime/nginx -c conf/nginx.conf -s reload') { throw 'Unexpected reload command' }; $taskPreviousRun=(Get-ScheduledTaskInfo -TaskName 'NginxReloadOnce').LastRunTime; $taskStarted=Get-Date; Start-ScheduledTask -InputObject $taskReload; $taskDone=$false; for($taskPoll=0;$taskPoll -lt 100;$taskPoll++){ $taskInfo=Get-ScheduledTaskInfo -TaskName 'NginxReloadOnce'; $taskState=(Get-ScheduledTask -TaskName 'NginxReloadOnce').State; if($taskInfo.LastRunTime -gt $taskPreviousRun -and $taskInfo.LastRunTime -ge $taskStarted.AddSeconds(-2) -and $taskState -ne 'Running'){ if($taskInfo.LastTaskResult -ne 0){throw 'Managed proxy reload failed'}; $taskDone=$true; break }; Start-Sleep -Milliseconds 100 }; if(-not $taskDone){throw 'Managed proxy reload timed out'}; [pscustomobject]@{status='PASS';principal='SYSTEM';task='NginxReloadOnce';definitionChanged=$false} | ConvertTo-Json -Compress`);
 assert.equal(result.status,'PASS');return result;
}
async function health(version){for(let n=0;n<160;n++){try{const r=await fetch('http://127.0.0.1:5044/api/v1/health',{signal:AbortSignal.timeout(800)});const j=await r.json();if(r.ok&&j.data?.version===version&&j.data.database==='up')return;}catch{}await new Promise(r=>setTimeout(r,250));}throw new Error('Expected API health/version was not observed');}
async function restart(version){
 delete require.cache[require.resolve(config)];const app=require(config).apps.find(a=>a.name==='nivasafe-api');assert.equal(app.env.APP_VERSION,version);
 const active=(await call('list')).find(a=>a.name===app.name);
 await new Promise((resolve,reject)=>pm2.Client.executeRemote('restartProcessId',{id:active.pm_id,env:{...app.env,current_conf:{script:app.script,pm_exec_path:app.script,pm_cwd:app.cwd,exec_interpreter:app.interpreter}}},error=>error?reject(new Error('Managed executable restart failed')):resolve()));
 await health(version);const current=(await call('list')).find(a=>a.name===app.name);
 const actual=powershell(`$taskProcess=Get-CimInstance Win32_Process -Filter 'ProcessId = ${Number(current.pid)}'; [pscustomobject]@{ProcessId=$taskProcess.ProcessId;CommandLine=$taskProcess.CommandLine;ListenerPids=@(Get-NetTCPConnection -State Listen -LocalPort 5044 | Select-Object -ExpandProperty OwningProcess -Unique)} | ConvertTo-Json -Compress`);
 assert.equal(actual.ListenerPids.length,1);assertApiRuntimeIdentity(current,app,actual,actual.ListenerPids[0]);
 return {pid:current.pid,pmExecPath:current.pm2_env.pm_exec_path,osCommandLine:actual.CommandLine,runtimeIdentityVerified:true};
}
async function rollback(){
 if(apiSwitched){atomic(config,fs.readFileSync(`${backup}/ecosystem.config.cjs`));await restart(oldVersion);}
 if(proxySwitched){atomic(proxy,fs.readFileSync(`${backup}/nginx.conf`));nginxCheck(proxy);reloadProxy();}
 await call('dump');return{status:'RESTORED',dataChanged:false};
}
try{
 assert(process.argv.includes('--deploy'),'Use --deploy');
 await call('connect');assert(!fs.existsSync(`${evidence}/deployment.json`));
 const build=read(`${evidence}/build-validation.json`);assert.equal(build.status,'PASS');
 const delayed=read(`${evidence}/proxy-delay-smoke.json`);assert.equal(delayed.status,'PASS');assert.equal(delayed.receivedUpstreamRequests,1);assert(delayed.elapsedMs>60000);
 const tests=read(`${evidence}/backend-tests-final.json`);assert(tests.success&&!tests.numFailedTests&&!tests.numPendingTests);
 const security=read(`${evidence}/independent-security-review.json`);assert.equal(security.status,'PASS');
 const snapshot=read(`${evidence}/candidate.json`);for(const f of snapshot.files)assert.equal(sha(`${work}/candidate/${f.path}`),f.sha256);
 const proxyPreparation=read(`${evidence}/proxy-preparation.json`);assert.equal(sha(proxy),proxyPreparation.proxyBeforeSha256);assert.equal(sha(`${work}/nginx-candidate.conf`),proxyPreparation.proxyCandidateSha256);
 verifyLocalRuntime();nginxCheck(`${work}/nginx-candidate.conf`);
 const changed=files(`${candidate}/dist`).filter(f=>f.endsWith('.js')&&!f.endsWith('.test.js')&&(!fs.existsSync(`${oldRoot}/dist/${f}`)||sha(`${candidate}/dist/${f}`)!==sha(`${oldRoot}/dist/${f}`)));
 assert.deepEqual(changed,['ai-provider.js'],'Unexpected compiled runtime scope');
 assert.deepEqual(build.changedRuntimeModules.map(f=>f.path),changed);for(const f of build.changedRuntimeModules)assert.equal(sha(`${candidate}/dist/${f.path}`),f.sha256,'Tested compiled artifact changed');
 for(const f of files(`${oldRoot}/dist`).filter(f=>f.endsWith('.js')&&!f.endsWith('.test.js')))assert(fs.existsSync(`${candidate}/dist/${f}`),'Existing runtime module removed');
 for(const f of ['package.json','prisma/schema.prisma','python/rula_pose_worker.py','python/requirements.lock'])assert.equal(sha(`${candidate}/${f}`),sha(`${oldRoot}/${f}`));
 const active=(await call('list')).find(a=>a.name==='nivasafe-api');assert.equal(active.pm2_env.pm_exec_path,oldEntry);assert.equal(active.pm2_env.RULA_LOCAL_POSE_ENABLED,'true');
 const baseline={pid:active.pid,entry:oldEntry,version:oldVersion,envSha256:sha(`${root}/.env`),configSha256:sha(config),indexSha256:sha(`${live}/index.html`),proxySha256:sha(proxy)};
 if(resuming){
  assert.deepEqual(read(`${evidence}/runtime-before.json`),baseline,'Runtime changed since safe pre-switch failure');
  assert.equal(sha(`${backup}/ecosystem.config.cjs`),baseline.configSha256);assert.equal(sha(`${backup}/nginx.conf`),baseline.proxySha256);
  for(const d of ['src','dist','prisma','python'])for(const f of files(`${candidate}/${d}`))assert.equal(sha(`${candidate}/${d}/${f}`),sha(`${releaseRoot}/${d}/${f}`));
  fs.copyFileSync(`${evidence}/deployment-failure.json`,`${evidence}/deployment-attempt-one-failure.json`,fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(`${evidence}/pre-switch-recovery-verification.json`,JSON.stringify({status:'VERIFIED_UNCHANGED',apiVersion:oldVersion,pid:active.pid,proxyRestoredOnDisk:true,initialReloadDidNotReachSystemMaster:true,serviceHealthy:true,dataChanged:false},null,2));
 }else{
  fs.writeFileSync(`${evidence}/runtime-before.json`,JSON.stringify(baseline,null,2),{flag:'wx'});
  assert(!fs.existsSync(releaseRoot)&&!fs.existsSync(backup));fs.mkdirSync(releaseRoot,{recursive:true});fs.mkdirSync(backup,{recursive:true});restrict(releaseRoot);restrict(backup);
  fs.copyFileSync(config,`${backup}/ecosystem.config.cjs`);fs.copyFileSync(proxy,`${backup}/nginx.conf`);fs.copyFileSync(`${live}/index.html`,`${backup}/index.html`);
  for(const d of ['src','dist','prisma','python'])fs.cpSync(`${candidate}/${d}`,`${releaseRoot}/${d}`,{recursive:true,filter:p=>!p.includes('__pycache__')});
  for(const f of ['package.json','tsconfig.json','vitest.config.ts'])fs.copyFileSync(`${candidate}/${f}`,`${releaseRoot}/${f}`);
  fs.symlinkSync(`${oldRoot}/node_modules`,`${releaseRoot}/node_modules`,'junction');
 }
 let nextConfig=fs.readFileSync(config,'utf8').replace(JSON.stringify(oldEntry),JSON.stringify(`${releaseRoot}/dist/server.js`)).replace(`APP_VERSION: ${JSON.stringify(oldVersion)},`,`APP_VERSION: ${JSON.stringify(id)},`);
 const module=new(require('node:module').Module)(config);module._compile(nextConfig,config);delete require.cache[require.resolve(config)];const previous=require(config);
 assert.deepEqual(module.exports.apps.find(a=>a.name==='nivasafe-worker'),previous.apps.find(a=>a.name==='nivasafe-worker'));
 for(const[k,v]of Object.entries(previous.apps.find(a=>a.name==='nivasafe-api').env))if(k!=='APP_VERSION')assert.equal(module.exports.apps.find(a=>a.name==='nivasafe-api').env[k],v);
 atomic(proxy,fs.readFileSync(`${work}/nginx-candidate.conf`));proxySwitched=true;nginxCheck(proxy);reloadProxy();
 atomic(config,nextConfig);apiSwitched=true;const identity=await restart(id);
 const publicHealth=await fetch('https://app.nivasafe.com/api/v1/health',{signal:AbortSignal.timeout(10000)});assert.equal((await publicHealth.json()).data.version,id);
 const denials=[];for(const origin of ['https://app.nivasafe.com','https://api.nivasafe.com'])for(const route of ['/api/v1/rula/posture-image-analysis','/api/v1/fmea/process-image-analysis']){const r=await fetch(origin+route,{method:'POST',signal:AbortSignal.timeout(10000)});assert.equal(r.status,401);denials.push({origin,route,status:r.status});}
 assert.equal(sha(`${root}/.env`),baseline.envSha256);assert.equal(sha(`${live}/index.html`),baseline.indexSha256);assert.equal(sha(proxy),proxyPreparation.proxyCandidateSha256);
 assert.equal(fs.readFileSync(proxy,'utf8').split(imageLocation).length-1,2);await call('dump');
 const result={status:'DEPLOYED',id,at:new Date().toISOString(),...identity,backup,changedRuntimeModules:changed,frontendUnchanged:true,privateEnvironmentUnchanged:true,schemaUnchanged:true,migrationsExecuted:false,poseRuntimePreserved:true,workerConfigurationUnchanged:true,providerImageDeadlineSeconds:120,imageProxyDeadlineSeconds:300,genericProxyDeadlineSeconds:120,automaticTransportReplays:0,proxyReloaded:true,denials};
 fs.writeFileSync(`${evidence}/deployment.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){let recovery;if(apiSwitched||proxySwitched){try{recovery=await rollback();}catch{recovery={status:'FAILED_REQUIRES_ATTENTION'};}}const result={status:'FAILED',error:error.message,recovery};fs.writeFileSync(`${evidence}/deployment-failure.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=1;}
finally{pm2.disconnect();}
