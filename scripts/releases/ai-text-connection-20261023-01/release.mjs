import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {root,task,id,work,candidate,evidence,oldId,oldBackend,live,config,sha,read,liveFiles,frozen,preserve,runtimeIdentity} from './prepare.mjs';
import {assertApiRuntimeIdentity} from '../assessment-image-activation-20261022-01/runtime-identity.mjs';
const require=createRequire(import.meta.url);process.env.PM2_HOME='C:/ProgramData/NIVASafe/pm2';
const pm2=require('C:/Runtime/node/node_modules/pm2');
const call=(method,...args)=>new Promise((resolve,reject)=>pm2[method](...args,(error,result)=>error?reject(new Error(`Managed ${method} failed`)):resolve(result)));
const destination=`C:/ProgramData/NIVASafe/releases/${id}/backend`,backup=`C:/ProgramData/NIVASafe/backups/${id}`;
let switched=false,previousConfig;
function atomic(file,bytes){const temp=`${file}.${task}.tmp`;fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,file);}
function restrict(directory){assert.equal(spawnSync('icacls.exe',[directory,'/inheritance:r','/grant:r','*S-1-5-18:(OI)(CI)F','*S-1-5-32-544:(OI)(CI)F'],{windowsHide:true,encoding:'utf8'}).status,0);}
async function healthy(version){for(let attempt=0;attempt<120;attempt++){try{const response=await fetch('http://127.0.0.1:5044/api/v1/health',{signal:AbortSignal.timeout(800)});const payload=await response.json();if(response.ok&&payload.data?.version===version&&payload.data.database==='up')return;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}throw new Error('Expected API version not healthy');}
async function restart(version){delete require.cache[require.resolve(config)];const app=require(config).apps.find(row=>row.name==='nivasafe-api');assert.equal(app.env.APP_VERSION,version);const previous=(await call('list')).find(row=>row.name===app.name);assert(previous);await new Promise((resolve,reject)=>pm2.Client.executeRemote('restartProcessId',{id:previous.pm_id,env:{...app.env,current_conf:{script:app.script,pm_exec_path:app.script,pm_cwd:app.cwd,exec_interpreter:app.interpreter}}},error=>error?reject(new Error('Managed restart failed')):resolve()));await healthy(version);const active=(await call('list')).find(row=>row.name===app.name);const identity=await runtimeIdentity(version);assertApiRuntimeIdentity(active,app,{ProcessId:identity.pid,CommandLine:identity.commandLine},identity.pid);return identity;}
try{
 assert(process.argv.includes('--deploy'));assert(!fs.existsSync(`${evidence}/deployment.json`));
 const manifest=frozen(),before=read(`${evidence}/runtime-before.json`),build=read(`${evidence}/build-validation.json`),probe=read(`${evidence}/candidate-live-text.json`),review=read(`${evidence}/security-review.json`);
 for(const gate of [build,probe,review]){assert.equal(gate.status,'PASS');assert.equal(gate.candidateManifestSha256,sha(`${evidence}/candidate.json`));}
 assert.equal(review.buildEvidenceSha256,sha(`${evidence}/build-validation.json`));assert.equal(review.candidateLiveProbeSha256,sha(`${evidence}/candidate-live-text.json`));
 for(const helper of ['prepare.mjs','validate.mjs','live-probe.mjs','release.mjs'])assert.equal(sha(`${root}/scripts/releases/${task}/${helper}`),review.reviewedHelpersSha256[helper]);
 for(const file of build.artifacts)assert.equal(sha(`${candidate}/${file.path}`),file.sha256);
 assert.deepEqual(build.changedRuntimeModules,['ai-provider.js']);assert.equal(probe.providerModuleSha256,sha(`${candidate}/backend/dist/ai-provider.js`));
 // The active private release must still match the captured baseline. Every
 // source/data/runtime file is retained except the two reviewed source files
 // and the one rebuilt runtime module.
 for(const file of before.backendFiles){assert.equal(sha(`${oldBackend}/${file.path}`),file.sha256);const mutable=['src/ai-provider.ts','src/ai-provider.test.ts','dist/ai-provider.js','dist/ai-provider.test.js'].includes(file.path);if(!mutable)assert.equal(sha(`${candidate}/backend/${file.path}`),file.sha256,`Unrelated backend drift ${file.path}`);}
 preserve(before);assert.deepEqual(await runtimeIdentity(oldId),before.api);assert(!fs.existsSync(destination)&&!fs.existsSync(backup));
 await call('connect');const worker=(await call('list')).find(row=>row.name==='nivasafe-worker');const workerIdentity=worker?{pid:worker.pid,entry:worker.pm2_env.pm_exec_path}:null;
 fs.mkdirSync(destination,{recursive:true});fs.mkdirSync(backup,{recursive:true});restrict(destination);restrict(backup);
 fs.copyFileSync(config,`${backup}/ecosystem.config.cjs`,fs.constants.COPYFILE_EXCL);previousConfig=fs.readFileSync(`${backup}/ecosystem.config.cjs`);assert.equal(sha(`${backup}/ecosystem.config.cjs`),before.configSha256);
 for(const directory of ['src','dist','prisma','python'])fs.cpSync(`${candidate}/backend/${directory}`,`${destination}/${directory}`,{recursive:true,filter:source=>!source.includes('__pycache__')});
 for(const file of ['package.json','tsconfig.json','vitest.config.ts']){assert.equal(sha(`${candidate}/backend/${file}`),sha(`${oldBackend}/${file}`));fs.copyFileSync(`${candidate}/backend/${file}`,`${destination}/${file}`);assert.equal(sha(`${destination}/${file}`),sha(`${candidate}/backend/${file}`));}
 fs.symlinkSync(`${oldBackend}/node_modules`,`${destination}/node_modules`,'junction');
 for(const directory of ['src','dist','prisma','python'])for(const file of liveFiles(`${candidate}/backend/${directory}`).filter(file=>!file.includes('__pycache__')))assert.equal(sha(`${candidate}/backend/${directory}/${file}`),sha(`${destination}/${directory}/${file}`));
 const original=previousConfig.toString('utf8'),oldEntry=`${oldBackend}/dist/server.js`,newEntry=`${destination}/dist/server.js`;
 assert.equal(original.split(JSON.stringify(oldEntry)).length,2);assert.equal(original.split(`APP_VERSION: ${JSON.stringify(oldId)},`).length,2);
 const next=original.replace(JSON.stringify(oldEntry),JSON.stringify(newEntry)).replace(`APP_VERSION: ${JSON.stringify(oldId)},`,`APP_VERSION: ${JSON.stringify(id)},`);
 assert.equal(next.replace(JSON.stringify(newEntry),JSON.stringify(oldEntry)).replace(`APP_VERSION: ${JSON.stringify(id)},`,`APP_VERSION: ${JSON.stringify(oldId)},`),original);
 const a=new (require('node:module').Module)(config),b=new (require('node:module').Module)(config);a._compile(original,config);b._compile(next,config);const reverted=structuredClone(b.exports);const revertedApi=reverted.apps.find(row=>row.name==='nivasafe-api');revertedApi.script=oldEntry;revertedApi.env.APP_VERSION=oldId;assert.deepEqual(reverted,structuredClone(a.exports));
 preserve(before);atomic(config,next);switched=true;const api=await restart(id);
 const denials=[];for(const route of ['/api/v1/rula/task-description-suggestion','/api/v1/rula/posture-image-analysis']){const response=await fetch(`https://app.nivasafe.com${route}`,{method:'POST',signal:AbortSignal.timeout(15000)});assert.equal(response.status,401);denials.push({route,status:401});}
 const healthResponse=await fetch('https://app.nivasafe.com/api/v1/health',{signal:AbortSignal.timeout(15000)});assert.equal(healthResponse.status,200);const publicHealth=await healthResponse.json();assert.equal(publicHealth.data?.version,id);assert.equal(publicHealth.data.database,'up');
 const index=await fetch('https://app.nivasafe.com/rula',{signal:AbortSignal.timeout(15000)});assert.equal(index.status,200);assert(Buffer.from(await index.arrayBuffer()).equals(fs.readFileSync(`${live}/index.html`)));
 preserve(before,true);assert.equal(fs.readFileSync(config,'utf8'),next,'Managed config changed beyond reviewed API entry/version');const currentWorker=(await call('list')).find(row=>row.name==='nivasafe-worker');assert.deepEqual(currentWorker?{pid:currentWorker.pid,entry:currentWorker.pm2_env.pm_exec_path}:null,workerIdentity);await call('dump');assert.equal(fs.readFileSync(config,'utf8'),next);
 const result={task,id,status:'DEPLOYED',at:new Date().toISOString(),api,candidateManifestSha256:sha(`${evidence}/candidate.json`),buildEvidenceSha256:sha(`${evidence}/build-validation.json`),securityReviewSha256:sha(`${evidence}/security-review.json`),frontendFilesUnchanged:before.staticFiles.length,privateEnvironmentUnchanged:true,proxyUnchanged:true,workerUnchanged:workerIdentity,schemaAndMigrationsUnchanged:true,customerImageTransfers:0,productionBusinessMutations:0,changedRuntimeModules:build.changedRuntimeModules,oldConfigSha256:before.configSha256,newConfigSha256:sha(config),backup,denials};
 fs.writeFileSync(`${evidence}/deployment.json`,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({status:result.status,id,api,frontendFilesUnchanged:before.staticFiles.length}));
}catch(error){let recovery='NOT_REQUIRED';if(switched){try{assert(previousConfig);atomic(config,previousConfig);await restart(oldId);await call('dump');preserve(read(`${evidence}/runtime-before.json`));recovery='RESTORED_PREVIOUS_RELEASE';}catch{recovery='FAILED_REQUIRES_ATTENTION';}}fs.writeFileSync(`${evidence}/deployment-failure-${Date.now()}.json`,JSON.stringify({status:'FAIL',task,error:error.message,recovery},null,2));console.log(JSON.stringify({status:'FAIL',error:error.message,recovery}));process.exitCode=1;}finally{pm2.disconnect();}
