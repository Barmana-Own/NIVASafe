import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {sha,inside} from '../controlled-20261019/artifact-tools.mjs';
import {assertRollbackTarget} from '../controlled-20261019/rollback-guard.mjs';
const root='C:/NIVASafe',work=`${root}/.local/support-roles-20261019-01`,e=`${root}/reports/evidence/support-roles-20261019-01`,id='release-support-roles-20261019-01';
const config=`${root}/deployment/ecosystem.config.cjs`,backup=`C:/ProgramData/NIVASafe/backups/${id}`,release=`C:/ProgramData/NIVASafe/releases/${id}/backend`,protectedState=`${backup}/config/runtime-state/pm2-runtime.before.json`;
const mode=process.argv[2];if(!['deploy','rollback'].includes(mode))throw Error('Explicit deploy or rollback required');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/u,'')),assert=(v,m)=>{if(!v)throw Error(m);};
const before=read(`${e}/runtime-before.json`),prepared=read(`${e}/prepared.json`),live=before.static.root;
process.env.PM2_HOME='C:/ProgramData/NIVASafe/pm2';
const require=createRequire(import.meta.url),pm2=require('C:/Runtime/node/node_modules/pm2');
const call=(method,...args)=>new Promise((resolve,reject)=>pm2[method](...args,(error,value)=>error?reject(Error('PM2 '+method+' failed')):resolve(value)));
const events=[];let connected=false,changed=false,receipt;
const event=(name,detail={})=>events.push({timestamp:new Date().toISOString(),name,...detail});
const same=(a,b)=>path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();
function atomic(source,target){assert(inside(live,target)||target===config,'Unexpected atomic target');const temp=target+'.'+id+'.tmp';assert(!fs.existsSync(temp),'Stale release temporary file');fs.copyFileSync(source,temp,fs.constants.COPYFILE_EXCL);fs.renameSync(temp,target);}
async function health(version){for(let n=0;n<60;n++){try{const r=await fetch('http://127.0.0.1:5044/api/v1/health',{signal:AbortSignal.timeout(1000)}),x=await r.json();if(r.status===200&&x.data?.version===version&&x.data?.database==='up')return {status:200,version,database:'up'};}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('Expected active build/DB health not observed');}
async function switchApi(app){
 const current=(await call('list')).filter(x=>x.name==='nivasafe-api');assert(current.length===1,'Expected exactly one named API');assert([before.pm2.entry,`${release}/dist/server.js`].some(p=>same(p,current[0].pm2_env.pm_exec_path)),'Another backend is active');
 event('api-switch-start',{oldPid:current[0].pid,from:current[0].pm2_env.pm_exec_path,to:app.script});changed=true;
 await call('delete','nivasafe-api');try{await call('start',app);}catch{event('new-start-failed-restoring-original');await call('start',read(protectedState).app);throw Error('Candidate start failed; original start requested');}
 const next=(await call('list')).find(x=>x.name==='nivasafe-api');assert(next&&same(next.pm2_env.pm_exec_path,app.script),'Manager entry mismatch');event('api-switch-end',{pid:next.pid,entry:next.pm2_env.pm_exec_path});return next;
}
async function publicCheck(index,assets,version){
 const checks=[];for(const p of ['/','/login','/support','/index.html']){const r=await fetch('https://app.nivasafe.com'+p,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});const b=Buffer.from(await r.arrayBuffer());assert(r.status===200&&b.equals(fs.readFileSync(index)),'Public HTML differs '+p);checks.push({path:p,http:r.status,sha256:sha(index)});}
 for(const a of assets){const r=await fetch('https://app.nivasafe.com'+a.url,{signal:AbortSignal.timeout(15000)}),b=Buffer.from(await r.arrayBuffer());assert(r.ok&&b.equals(fs.readFileSync(path.join(path.dirname(index),a.url))),'Public asset differs '+a.url);checks.push({path:a.url,http:r.status,sha256:a.sha256});}
 const r=await fetch('https://app.nivasafe.com/api/v1/health',{signal:AbortSignal.timeout(15000)}),h=await r.json();assert(r.status===200&&h.data?.version===version&&h.data?.database==='up','Public API build/DB smoke failed');checks.push({path:'/api/v1/health',http:r.status,version,database:'up'});
 for(const p of ['/support/requests','/admin/support-requests','/admin/support-staff','/notifications/summary','/rula','/fmea','/chat/conversations']){const r=await fetch('https://app.nivasafe.com/api/v1'+p,{signal:AbortSignal.timeout(10000)});assert(r.status===401,'Public authorization boundary failed '+p);checks.push({path:'/api/v1'+p,http:r.status});}
 return checks;
}
async function rollback(){
 const saved=read(protectedState);assert(saved.id===id&&same(saved.app.script,before.pm2.entry),'Protected rollback identity invalid');
 const active=(await call('list')).find(x=>x.name==='nivasafe-api');assert(active,'API missing during rollback');
 const nextConfig=read(`${e}/rollback-anchors.json`);
 assertRollbackTarget({entry:active.pm2_env.pm_exec_path,oldEntry:before.pm2.entry,newEntry:`${release}/dist/server.js`,indexHash:sha(`${live}/index.html`),oldIndexHash:prepared.oldIndex,newIndexHash:prepared.newIndex,configHash:sha(config),oldConfigHash:before.configuration.ecosystemSha256,newConfigHash:nextConfig.newConfigHash,envHash:sha(`${root}/.env`),originalEnvHash:before.configuration.sha256});
 for(const [p,h]of Object.entries(before.backend.hashes))assert(sha(path.join(before.backend.root,'dist',p))===h,'Previous backend artifact drift '+p);
 atomic(`${backup}/config/ecosystem.config.cjs`,config);atomic(`${backup}/frontend/index.html`,`${live}/index.html`);
 const process=await switchApi(saved.app);await health(before.configuration.appVersion);
 const checks=await publicCheck(`${backup}/frontend/index.html`,prepared.oldReferences,before.configuration.appVersion);
 const result={status:'ROLLED BACK',pid:process.pid,entry:before.pm2.entry,checks,oldHashedAssetsRetained:true,databaseDataRestored:false,protectedSettingsChanged:false};event('rollback-verified',{pid:process.pid});return result;
}
try{
 await call('connect');connected=true;
 if(mode==='rollback'){
  const result=await rollback();fs.writeFileSync(`${e}/rollback-result.json`,JSON.stringify({timestamp:new Date().toISOString(),...result,events},null,2));console.log(JSON.stringify({status:result.status,pid:result.pid}));
 }else{
  assert(!fs.existsSync(`${e}/deployment.json`),'Deployment already attempted; inspect receipt');
  const api=read(`${e}/api-acceptance.json`),browser=read(`${e}/browser-acceptance.json`),scope=read(`${e}/scope-security-integrity.json`);
  assert(api.verdict==='PASS'&&api.checks.every(x=>x.status==='PASS'),'Real API/DB acceptance failed');
  assert(browser.verdict==='PASS'&&browser.browser.length===6&&browser.frontendIndex===prepared.newIndex,'Exact browser-tested candidate missing');
  assert(scope.status==='PASS'&&scope.productionPredictorsUnchanged&&scope.noSchemaChange&&scope.unchangedOtherSources,'Scope/security gate failed');
  assert(read(`${e}/pm2-operational-rehearsal.json`).verdict==='PASS','Operational manager rollback gate failed');
  assert(read(`${e}/schema-compatibility.json`).status==='PASS','Schema compatibility failed');
  assert(read(`${e}/protected-config-backup.json`).accessAclMatches===true,'Protected config backup failed');
  assert(prepared.status==='PASS'&&prepared.steps.length===7,'Artifact backup/reconstruction gate failed');
  assert(read(`${e}/validation.json`).length===12&&read(`${e}/validation.json`).every(x=>x.exitCode===0),'Package validation failed');
  assert(read(`${e}/frontend-final-validation.json`).length===4&&read(`${e}/frontend-final-validation.json`).every(x=>x.exitCode===0),'Final frontend validation failed');
  const contract=read(`${e}/contract-release.json`);assert(contract.contractExit===0&&contract.releaseExit===0,'Contract/release check failed');
  assert(sha(`${root}/.env`)===before.configuration.sha256&&sha(config)===before.configuration.ecosystemSha256,'Runtime config drifted');
  assert(sha(`${live}/index.html`)===prepared.oldIndex&&sha(`${prepared.stage}/index.html`)===prepared.newIndex,'Frontend drifted');
  for(const f of read(`${e}/release-backend-manifest.json`).files.filter(f=>f.path.startsWith('dist/')))assert(sha(path.join(release,f.path))===f.sha256,'Frozen backend drifted');
  for(const f of read(`${e}/release-frontend-manifest.json`).files)assert(sha(path.join(prepared.stage,f.path))===f.sha256,'Frozen frontend drifted');
  const apps=await call('list'),active=apps.find(a=>a.name==='nivasafe-api');assert(active?.pid===before.pm2.pid&&same(active.pm2_env.pm_exec_path,before.pm2.entry),'API changed after snapshot');
  const boot=require(config),originalConfig=boot.apps.find(a=>a.name==='nivasafe-api');assert(same(originalConfig.script,before.pm2.entry),'Boot config identity mismatch');
  const original={...originalConfig,script:before.pm2.entry,cwd:active.pm2_env.pm_cwd,interpreter:active.pm2_env.exec_interpreter,env:{...active.pm2_env.env,APP_VERSION:before.configuration.appVersion}};
  const next={...original,script:path.resolve(`${release}/dist/server.js`),env:{...original.env,APP_VERSION:id}};
  for(const k of Object.keys(before.configuration.gates))assert(next.env[k]===original.env[k],'Privacy config changed');
  assert(fs.readFileSync(protectedState).equals(fs.readFileSync(`${root}/.env`)),'Protected rollback template unexpected');
  fs.writeFileSync(protectedState,JSON.stringify({id,timestamp:new Date().toISOString(),app:original},null,2));
  let text=fs.readFileSync(config,'utf8');const oldEntry=JSON.stringify(before.pm2.entry),oldMarker=`APP_VERSION: ${JSON.stringify(before.configuration.appVersion)}`;
  assert(text.includes(oldEntry)&&text.includes(oldMarker),'Expected API boot settings not found');
  text=text.replace(oldEntry,JSON.stringify(next.script)).replace(oldMarker,`APP_VERSION: ${JSON.stringify(id)}`);
  const nextConfig=`${work}/ecosystem.support-release.config.cjs`;fs.writeFileSync(nextConfig,text);
  const newBoot=require(nextConfig);assert(same(newBoot.apps.find(a=>a.name==='nivasafe-api').script,next.script),'New boot entry invalid');
  assert(JSON.stringify(newBoot.apps.filter(a=>a.name!=='nivasafe-api'))===JSON.stringify(boot.apps.filter(a=>a.name!=='nivasafe-api')),'Unrelated process configuration changed');
  fs.writeFileSync(`${e}/rollback-anchors.json`,JSON.stringify({oldConfigHash:before.configuration.ecosystemSha256,newConfigHash:sha(nextConfig)},null,2));
  receipt={id,status:'CUTOVER',started:new Date().toISOString(),backup,backend:next.script,frontendRoot:live,oldIndex:prepared.oldIndex,newIndex:prepared.newIndex,databaseMigrationExecuted:false,privacyConfigurationChanged:false,oldAssetsRetained:true};
  fs.writeFileSync(`${e}/deployment.json`,JSON.stringify(receipt,null,2));
  // Stage immutable assets first; publish index only after the new API is healthy.
  for(const f of prepared.staticChanges.filter(f=>f.path!=='index.html')){const to=path.join(live,f.path);assert(f.path.startsWith('assets/')&&inside(live,to),'Unexpected static change');fs.copyFileSync(path.join(prepared.stage,f.path),to,fs.constants.COPYFILE_EXCL);assert(sha(to)===f.sha256,'Copied asset hash differs');}
  atomic(nextConfig,config);changed=true;const process=await switchApi(next);const localHealth=await health(id);
  atomic(`${prepared.stage}/index.html`,`${live}/index.html`);
  const checks=await publicCheck(`${prepared.stage}/index.html`,prepared.newReferences,id);
  assert(sha(`${root}/.env`)===before.configuration.sha256,'Protected settings changed');
  for(const f of read(`${e}/backup-frontend-manifest.json`).files.filter(f=>f.path!=='index.html'))assert(sha(path.join(live,f.path))===f.sha256,'Existing public asset changed '+f.path);
  receipt={...receipt,status:'DEPLOYED',finished:new Date().toISOString(),pid:process.pid,localHealth,checks,modules:read(`${e}/runtime-candidate.json`).marker.modules,events};
  fs.writeFileSync(`${e}/deployment.json`,JSON.stringify(receipt,null,2));console.log(JSON.stringify({status:receipt.status,pid:receipt.pid,id,index:receipt.newIndex,checks:checks.length,protectedConfigurationUnchanged:true}));
 }
}catch(error){let recovery;event('release-error',{message:error.message.slice(0,250)});if(changed&&mode==='deploy'){try{recovery=await rollback();}catch(restoreError){recovery={status:'ROLLBACK FAILED',reason:restoreError.message.slice(0,250)};}}
 const failure={status:'BLOCKED',timestamp:new Date().toISOString(),reason:error.message.slice(0,250),recovery,events};fs.writeFileSync(`${e}/release-failure.json`,JSON.stringify(failure,null,2));console.log(JSON.stringify(failure));process.exitCode=1;
}finally{if(connected)pm2.disconnect();}
