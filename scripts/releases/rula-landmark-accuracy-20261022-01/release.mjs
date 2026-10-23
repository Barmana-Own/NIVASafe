import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { root,task,id,evidence,candidate,live,config,python,model,modelSha256,sha,read,same,powershell,verifyLocalRuntime } from './runtime-preflight.mjs';
import { assertApiRuntimeIdentity } from '../assessment-image-activation-20261022-01/runtime-identity.mjs';

const require=createRequire(import.meta.url);
process.env.PM2_HOME='C:/ProgramData/NIVASafe/pm2';
const pm2=require('C:/Runtime/node/node_modules/pm2');
const call=(method,...args)=>new Promise((resolve,reject)=>pm2[method](...args,(error,result)=>error?reject(new Error(`PM2 ${method} failed`)):resolve(result)));
const old=read(`${evidence}/runtime-before.json`);
const oldRoot=path.dirname(path.dirname(old.entry));
const releaseRoot=`C:/ProgramData/NIVASafe/releases/${id}/backend`;
const backup=`C:/ProgramData/NIVASafe/backups/${id}`;
const expected=new Set(['config.js','modules/assessments.js','rula-posture-ai.js','rula-measurement.js','rula-pose-provider.js','rula-local-pose-geometry.js']);
const resuming=process.argv.includes('--resume');
let switched=false;
const files=(directory,prefix='')=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(directory,e.name),`${prefix}${e.name}/`):[`${prefix}${e.name}`]);
function atomic(file,bytes){const tmp=`${file}.${task}.tmp`;fs.writeFileSync(tmp,bytes,{flag:'wx'});fs.renameSync(tmp,file);}
function restrict(directory){const r=spawnSync('icacls.exe',[directory,'/inheritance:r','/grant:r','*S-1-5-18:(OI)(CI)F','*S-1-5-32-544:(OI)(CI)F'],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,'Private ACL restriction failed');}
async function health(version){
  for(let n=0;n<100;n++){
    try{const r=await fetch('http://127.0.0.1:5044/api/v1/health',{signal:AbortSignal.timeout(800)});const j=await r.json();if(r.ok&&j.data?.version===version&&j.data.database==='up')return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error('API executable/database health check failed');
}
async function restart(version,rollback=false){
  delete require.cache[require.resolve(config)];
  const app=require(config).apps.find(a=>a.name==='nivasafe-api');
  const active=(await call('list')).find(a=>a.name===app.name);
  assert([old.entry,`${releaseRoot}/dist/server.js`].some(p=>same(p,active.pm2_env.pm_exec_path)),'Unexpected managed executable');
  assert.equal(app.env.APP_VERSION,version,'Boot config version differs from requested version');
  const env={...app.env,...(rollback?{RULA_LOCAL_POSE_ENABLED:'false'}:{}),current_conf:{script:app.script,pm_exec_path:app.script,pm_cwd:app.cwd,exec_interpreter:app.interpreter}};
  await new Promise((resolve,reject)=>pm2.Client.executeRemote('restartProcessId',{id:active.pm_id,env},e=>e?reject(new Error('Managed restart failed')):resolve()));
  const dispatched=(await call('list')).find(a=>a.name===app.name);
  fs.writeFileSync(`${evidence}/restart-${rollback?'rollback':resuming?'retry':'initial'}.json`,JSON.stringify({requestedVersion:version,requestedPath:app.script,pmVersion:dispatched.pm2_env.APP_VERSION,envVersion:dispatched.pm2_env.env.APP_VERSION,pmExecPath:dispatched.pm2_env.pm_exec_path,pid:dispatched.pid,localPose:dispatched.pm2_env.RULA_LOCAL_POSE_ENABLED},null,2));
  await health(version);
  const current=(await call('list')).find(a=>a.name===app.name);
  const actual=powershell(`$taskProcess=Get-CimInstance Win32_Process -Filter 'ProcessId = ${Number(current.pid)}'; [pscustomobject]@{ProcessId=$taskProcess.ProcessId;CommandLine=$taskProcess.CommandLine;ListenerPids=@(Get-NetTCPConnection -State Listen -LocalPort 5044 | Select-Object -ExpandProperty OwningProcess -Unique)} | ConvertTo-Json -Compress`);
  assert.equal(actual.ListenerPids.length,1);
  assertApiRuntimeIdentity(current,app,actual,actual.ListenerPids[0]);
  assert.equal(current.pm2_env.RULA_LOCAL_POSE_ENABLED,rollback?'false':'true');
  return {pid:current.pid,pmExecPath:current.pm2_env.pm_exec_path,osCommandLine:actual.CommandLine,runtimeIdentityVerified:true};
}
function frontendRelease(){
  const prior=fs.readFileSync(`${live}/index.html`,'utf8');
  const built=fs.readFileSync(`${candidate}/frontend/dist/index.html`,'utf8');
  const entry=h=>h.match(/<script\s+type="module"\s+crossorigin\s+src="([^"]+\.js)"><\/script>/u)?.[1];
  const oldEntry=entry(prior),nextEntry=entry(built);assert(oldEntry&&nextEntry&&oldEntry!==nextEntry&&prior.split(oldEntry).length===2);
  const css='.assessment-image-lightbox-canvas.rula-image-lightbox-canvas{justify-self:center;width:fit-content;max-width:100%}.rula-image-lightbox-canvas>img{width:auto;max-width:100%}\n';
  const cssHash=createHashText(css).slice(0,12);const cssAsset=`/assets/rula-pose-frame-${cssHash}.css`;
  const stylesheet=`<link rel="stylesheet" crossorigin href="${cssAsset}">`;
  const index=prior.replace(oldEntry,nextEntry).replace('</head>',`  ${stylesheet}\n</head>`);
  assert.equal(index.replace(nextEntry,oldEntry).replace(`  ${stylesheet}\n`,''),prior,'Unrelated HTML must be byte preserved');
  const tags=h=>h.match(/<link\s+rel="stylesheet"[^>]*>/gu)||[];
  assert.deepEqual(tags(index).filter(t=>t!==stylesheet),tags(prior));
  const assets=new Set();
  function visit(url){
    if(assets.has(url))return;
    assert(url.startsWith('/assets/')&&!url.includes('..'));
    const file=`${candidate}/frontend/dist${url}`;assert(fs.existsSync(file));assets.add(url);
    const text=fs.readFileSync(file,'utf8');
    for(const m of text.matchAll(/["'`](?:\.\/|\/)?((?:assets\/)?[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(?:js|css))["'`]/gu))visit(`/assets/${path.posix.basename(m[1])}`);
  }
  visit(nextEntry);
  const globalCss=built.match(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"/u)?.[1];assert(!globalCss||!assets.has(globalCss),'Candidate global CSS cannot replace live corrections');
  return {index,oldEntry,nextEntry,assets:[...assets],css,cssAsset,preservedStylesheets:tags(prior)};
}
import { createHash } from 'node:crypto';
function createHashText(text){return createHash('sha256').update(text).digest('hex');}
async function restore(){
  assert.equal(read(`${backup}/manager.json`).id,id);
  atomic(config,fs.readFileSync(`${backup}/ecosystem.config.cjs`));
  const identity=await restart(old.version,true);
  atomic(`${live}/index.html`,fs.readFileSync(`${backup}/index.html`));
  await call('dump');return {status:'RESTORED',version:old.version,...identity,dataChanged:false};
}
try{
  await call('connect');
  if(process.argv.includes('--rollback'))console.log(JSON.stringify(await restore()));
  else{
    assert(process.argv.includes('--deploy'),'Use --deploy or --rollback');
    assert(!fs.existsSync(`${evidence}/deployment.json`),'Deployment already recorded');
    for(const project of ['backend','frontend']){const t=read(`${evidence}/${project}-tests-final.json`);assert(t.success&&!t.numFailedTests&&!t.numPendingTests,`${project} tests incomplete`);}
    assert.equal(read(`${evidence}/build-validation.json`).status,'PASS');
    assert.equal(read(`${evidence}/node-worker-smoke.json`).status,'PASS');
    assert.equal(read(`${evidence}/independent-security-review.json`).status,'PASS_SCOPED_SOURCE_AND_BOUNDARY_REVIEW');
    for(const file of read(`${evidence}/candidate.json`).files)assert.equal(sha(`${candidate}/${file.path}`),file.sha256,'Frozen source changed after validation');
    const localRuntime=verifyLocalRuntime();
    assert.equal(sha(`${root}/.env`),old.envSha256,'Private env changed');
    assert.equal(sha(config),old.configSha256,'Boot config changed');
    assert.equal(sha(`${live}/index.html`),old.indexSha256,'Live frontend changed');
    const changedModules=files(`${candidate}/backend/dist`).filter(f=>f.endsWith('.js')&&!f.endsWith('.test.js')&&(!fs.existsSync(`${oldRoot}/dist/${f}`)||sha(`${candidate}/backend/dist/${f}`)!==sha(`${oldRoot}/dist/${f}`)));
    assert(changedModules.length>0&&changedModules.every(f=>expected.has(f)),`Unexpected runtime module scope: ${changedModules.join(',')}`);
    for(const item of read(`${evidence}/build-validation.json`).changedRuntimeModules)assert.equal(sha(`${candidate}/backend/dist/${item.path}`),item.sha256,'Validated runtime changed');
    for(const protectedFile of ['package.json','prisma/schema.prisma'])assert.equal(sha(`${candidate}/backend/${protectedFile}`),sha(`${oldRoot}/${protectedFile}`),'Protected backend contract changed');
    const active=(await call('list')).find(a=>a.name==='nivasafe-api');
    assert(active?.pid===(resuming?read(`${evidence}/deployment-failure.json`).recovery.pid:old.pid)&&same(active.pm2_env.pm_exec_path,old.entry));
    if(resuming){
      assert.equal(read(`${evidence}/deployment-failure.json`).recovery.status,'RESTORED');
      assert.equal(read(`${backup}/manager.json`).id,id);
      for(const directory of ['src','dist','prisma','python'])for(const f of files(`${candidate}/backend/${directory}`))assert.equal(sha(`${candidate}/backend/${directory}/${f}`),sha(`${releaseRoot}/${directory}/${f}`),'Prepared release differs');
      fs.copyFileSync(`${evidence}/deployment-failure.json`,`${evidence}/deployment-attempt-one-failure.json`,fs.constants.COPYFILE_EXCL);
    }else{
      assert(!fs.existsSync(releaseRoot)&&!fs.existsSync(backup),'Release path exists; inspect before retry');
      fs.mkdirSync(releaseRoot,{recursive:true});fs.mkdirSync(backup,{recursive:true});restrict(releaseRoot);restrict(backup);
      fs.copyFileSync(config,`${backup}/ecosystem.config.cjs`);fs.copyFileSync(`${live}/index.html`,`${backup}/index.html`);
      fs.writeFileSync(`${backup}/manager.json`,JSON.stringify({id,app:{script:old.entry,env:active.pm2_env.env}}));
      for(const directory of ['src','dist','prisma','python'])fs.cpSync(`${candidate}/backend/${directory}`,`${releaseRoot}/${directory}`,{recursive:true,filter:p=>!p.includes('__pycache__')});
      for(const f of ['package.json','tsconfig.json','vitest.config.ts'])fs.copyFileSync(`${candidate}/backend/${f}`,`${releaseRoot}/${f}`);
      fs.symlinkSync(`${oldRoot}/node_modules`,`${releaseRoot}/node_modules`,'junction');
    }
    const frontend=frontendRelease();
    for(const asset of frontend.assets){const from=`${candidate}/frontend/dist${asset}`,to=`${live}${asset}`;if(fs.existsSync(to))assert.equal(sha(from),sha(to));else fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);}
    const cssFile=`${live}${frontend.cssAsset}`;if(fs.existsSync(cssFile))assert.equal(fs.readFileSync(cssFile,'utf8'),frontend.css);else fs.writeFileSync(cssFile,frontend.css,{flag:'wx'});
    const beforeConfig=fs.readFileSync(config,'utf8');
    let afterConfig=beforeConfig.replace(JSON.stringify(old.entry),JSON.stringify(`${releaseRoot}/dist/server.js`));
    const token=`APP_VERSION: ${JSON.stringify(old.version)},`;
    assert.equal(afterConfig.split(token).length,2,'API version reference ambiguous');
    afterConfig=afterConfig.replace(token,`${token.replace(JSON.stringify(old.version),JSON.stringify(id))}\n        RULA_LOCAL_POSE_ENABLED: "true",\n        RULA_POSE_PYTHON: ${JSON.stringify(python)},\n        RULA_POSE_WORKER_PATH: ${JSON.stringify(`${releaseRoot}/python/rula_pose_worker.py`)},\n        RULA_POSE_MODEL_PATH: ${JSON.stringify(model)},\n        RULA_POSE_MODEL_SHA256: ${JSON.stringify(modelSha256)},`);
    const compiled=new (require('node:module').Module)(config);compiled._compile(afterConfig,config);
    delete require.cache[require.resolve(config)];const previous=require(config);
    assert.deepEqual(compiled.exports.apps.find(a=>a.name==='nivasafe-worker'),previous.apps.find(a=>a.name==='nivasafe-worker'),'Background worker configuration changed');
    const api=compiled.exports.apps.find(a=>a.name==='nivasafe-api');
    for(const [k,v]of Object.entries(previous.apps.find(a=>a.name==='nivasafe-api').env))if(k!=='APP_VERSION')assert.equal(api.env[k],v,'Unrelated API setting changed');
    atomic(config,afterConfig);switched=true;
    const identity=await restart(id);
    atomic(`${live}/index.html`,frontend.index);
    const publicIndex=await fetch('https://app.nivasafe.com/',{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});
    assert(publicIndex.ok&&Buffer.from(await publicIndex.arrayBuffer()).equals(fs.readFileSync(`${live}/index.html`)),'Public index mismatch');
    const denials=[];for(const route of ['/rula/image-analysis-policy','/fmea/image-analysis-policy','/rula','/fmea']){const r=await fetch(`https://app.nivasafe.com/api/v1${route}`,{signal:AbortSignal.timeout(10000)});assert.equal(r.status,401);denials.push({route,status:r.status});}
    await call('dump');
    const result={status:'DEPLOYED',id,at:new Date().toISOString(),...identity,backup,changedModules,modelSha256,localRuntimeOffline:localRuntime.network.blocked,schemaUnchanged:true,migrationsExecuted:false,privateEnvironmentUnchanged:sha(`${root}/.env`)===old.envSha256,workerConfigurationUnchanged:true,oldAssetsRetained:true,preservedStylesheets:frontend.preservedStylesheets,cssSupplement:frontend.cssAsset,jsEntrypoint:frontend.nextEntry,denials};
    fs.writeFileSync(`${evidence}/deployment.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }
}catch(error){
  let recovery;if(switched){try{recovery=await restore();}catch{recovery={status:'FAILED_REQUIRES_ATTENTION'};}}
  const result={status:'FAILED',error:error.message,recovery};fs.writeFileSync(`${evidence}/deployment-failure.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=1;
}finally{pm2.disconnect();}
