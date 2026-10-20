import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {clone,inventory,sha,inside} from 'file:///C:/NIVASafe/scripts/releases/controlled-20261019/artifact-tools.mjs';
const root='C:/NIVASafe',id='release-login-desktop-20261019-01',work=`${root}/.local/login-desktop-20261019-01`,e=`${root}/reports/evidence/login-desktop-20261019-01`,live='C:/inetpub/nivasafe/app-com',stage=`C:/inetpub/nivasafe/staging/${id}`,backup=`C:/ProgramData/NIVASafe/backups/${id}/frontend`,dist=`${work}/candidate/frontend/dist`,base='https://app.nivasafe.com';
const mode=process.argv[2];assert(['prepare','deploy','rollback'].includes(mode));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/u,''));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function references(dir){return [...fs.readFileSync(`${dir}/index.html`,'utf8').matchAll(/(?:src|href)="(\/[^"?#]+)[^"]*"/g)].map(x=>x[1]).map(url=>{const file=path.join(dir,url);assert(inside(dir,file)&&fs.statSync(file).isFile(),'Invalid static index reference');return {url,sha256:sha(file)};});}
async function publicCheck(expectedIndex,expectedAssets){
 const r=await fetch(base+'/login',{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)}),bytes=Buffer.from(await r.arrayBuffer());
 assert(r.status===200&&r.headers.get('content-type')?.includes('text/html')&&digest(bytes)===expectedIndex,'Public login/index hash mismatch');
 const checks=[{path:'/login',status:r.status,sha256:digest(bytes),contentType:r.headers.get('content-type')}];
 for(const a of expectedAssets){const q=await fetch(base+a.url,{signal:AbortSignal.timeout(15000)}),b=Buffer.from(await q.arrayBuffer());assert(q.status===200&&digest(b)===a.sha256,'Public asset mismatch '+a.url);checks.push({path:a.url,status:q.status,sha256:digest(b),contentType:q.headers.get('content-type')});}
 const health=await fetch(base+'/api/v1/health',{signal:AbortSignal.timeout(15000)}),h=await health.json();assert(health.status===200&&h.data?.database==='up','API health failed');
 return {checks,api:{status:health.status,version:h.data.version,database:h.data.database}};
}
function atomicIndex(source){const target=`${live}/index.html`,temp=`${live}/index.${id}.tmp`;assert(!fs.existsSync(temp),'Stale index staging file exists');fs.copyFileSync(source,temp,fs.constants.COPYFILE_EXCL);fs.renameSync(temp,target);}
async function rollback(prepared){
 assert([prepared.oldIndex,prepared.newIndex].includes(sha(`${live}/index.html`)),'Another frontend is active; refusing rollback');
 assert(sha(`${backup}/index.html`)===prepared.oldIndex,'Backup index integrity failed');
 assert(sha(`${live}/web.config`)===prepared.webConfig&&sha(`${live}/report-actions-mobile.css`)===prepared.reportStylesheet,'Manually managed files drifted');
 atomicIndex(`${backup}/index.html`);
 const check=await publicCheck(prepared.oldIndex,prepared.oldReferences);
 const result={timestamp:new Date().toISOString(),status:'ROLLED BACK',releaseId:id,checks:check,newHashedAssetsRetained:true,backendRestarted:false,databaseChanged:false};write(`${e}/rollback-result.json`,result);return result;
}
if(mode==='prepare'){
 assert(!fs.existsSync(`${e}/prepared.json`),'Existing preparation must not be overwritten');
 const allowedDirectories=new Set(['assets','brand']);for(const item of fs.readdirSync(live,{withFileTypes:true}))assert(!item.isSymbolicLink()&&(!item.isDirectory()||allowedDirectories.has(item.name))&&!/^\.(?:env|git)/iu.test(item.name),'Unexpected non-frontend web root content');
 const snapshot=await inventory(live);await clone(live,backup);const reconstructed=`${work}/rollback-reconstructed`;const restore=await clone(backup,reconstructed);write(`${e}/backup-manifest.json`,{timestamp:new Date().toISOString(),root:backup,...snapshot});
 const staged=await clone(dist,stage),candidateInventory=await inventory(stage);
 for(const file of candidateInventory.files.filter(x=>x.path!=='index.html'&&!x.path.startsWith('assets/')))assert(fs.existsSync(path.join(live,file.path))&&sha(path.join(live,file.path))===file.sha256,'Non-asset frontend content differs: '+file.path);
 assert(sha(`${stage}/sw.js`)===sha(`${live}/sw.js`),'Service-worker change outside CSS-only scope');
 const oldReferences=references(backup),newReferences=references(stage),oldIndex=sha(`${live}/index.html`),newIndex=sha(`${stage}/index.html`);
 assert(oldIndex!==newIndex,'No new frontend generated');
 const simulation=`${work}/rollback-swap-rehearsal`;await clone(backup,simulation);
 const changed=candidateInventory.files.filter(x=>x.path==='index.html'||x.path.startsWith('assets/')).filter(x=>!fs.existsSync(path.join(live,x.path))||sha(path.join(live,x.path))!==x.sha256);
 for(const f of changed){if(f.path.startsWith('assets/')&&fs.existsSync(path.join(live,f.path)))throw Error('Versioned asset filename collision');const to=path.join(simulation,f.path);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(stage,f.path),to);}
 assert(sha(`${simulation}/index.html`)===newIndex);references(simulation);
 fs.copyFileSync(`${backup}/index.html`,`${simulation}/index.html`);
 for(const f of snapshot.files)assert(sha(path.join(simulation,f.path))===f.sha256,'Simulated rollback changed old frontend file');references(simulation);
 const before=await publicCheck(oldIndex,oldReferences);
 const result={timestamp:new Date().toISOString(),releaseId:id,status:'PASS',liveRoot:live,stage,backup,manifest:`${e}/backup-manifest.json`,oldIndex,newIndex,oldReferences,newReferences,oldFrontendFiles:snapshot.files.length,stagedFiles:staged.files,restoration:restore,rollbackRehearsal:{status:'PASS',reconstructed,swapSimulation:simulation,oldFilesRestored:snapshot.files.length,newAssetsRetained:true},webConfig:sha(`${live}/web.config`),reportStylesheet:sha(`${live}/report-actions-mobile.css`),serviceWorker:sha(`${live}/sw.js`),protectedEnvHash:sha(`${root}/.env`),serviceConfigurationHash:sha(`${root}/deployment/ecosystem.config.cjs`),before,changed};
 write(`${e}/prepared.json`,result);console.log(JSON.stringify({status:result.status,backup,backupFiles:snapshot.files.length,stagedFiles:staged.files,rollback:result.rollbackRehearsal.status,changed:changed.length}));
}else{
 const prepared=read(`${e}/prepared.json`);
 if(mode==='rollback')console.log(JSON.stringify(await rollback(prepared)));
 else{
  assert(!fs.existsSync(`${e}/deployment.json`),'Deployment already attempted');
  const browser=read(`${e}/browser-candidate.json`),validation=read(`${e}/validation.json`);
  assert(validation.length===3&&validation.every(x=>x.exitCode===0),'Frontend validation failed');
  assert(browser.results.every(x=>x.noOverflow&&x.desktopClearHeader&&x.desktopContentBelowHeader&&!x.errors.length&&x.images),'Candidate visual gate failed');
  assert(browser.mobileComparison.every(x=>x.geometryIdentical&&x.pixelIdenticalToUnchangedBaseline),'Mobile must match genuine unchanged baseline captures');
  assert(sha(`${live}/index.html`)===prepared.oldIndex&&sha(`${stage}/index.html`)===prepared.newIndex,'Frontend drift before deployment');
  assert(sha(`${root}/.env`)===prepared.protectedEnvHash&&sha(`${root}/deployment/ecosystem.config.cjs`)===prepared.serviceConfigurationHash,'Backend configuration drift; stop');
  const receipt={releaseId:id,startedUtc:new Date().toISOString(),status:'CUTOVER',frontendOnly:true,backendRestarted:false,backendDeployed:false,databaseChanged:false,privacyChanged:false,backup,stage};write(`${e}/deployment.json`,receipt);
  let switched=false;
  try{
   for(const file of prepared.changed.filter(x=>x.path!=='index.html')){const from=path.join(stage,file.path),to=path.join(live,file.path);assert(inside(live,to)&&file.path.startsWith('assets/'),'Unexpected deployment target');assert(sha(from)===file.sha256,'Staged file drift');fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);assert(sha(to)===file.sha256,'Deployed asset mismatch');}
   atomicIndex(`${stage}/index.html`);switched=true;
   const after=await publicCheck(prepared.newIndex,prepared.newReferences);assert(after.api.version===prepared.before.api.version,'Unexpected API revision change');
   assert(sha(`${root}/.env`)===prepared.protectedEnvHash&&sha(`${root}/deployment/ecosystem.config.cjs`)===prepared.serviceConfigurationHash,'Backend settings changed');
   assert(sha(`${live}/web.config`)===prepared.webConfig&&sha(`${live}/report-actions-mobile.css`)===prepared.reportStylesheet&&sha(`${live}/sw.js`)===prepared.serviceWorker,'Unrelated static settings changed');
   receipt.status='DEPLOYED';receipt.finishedUtc=new Date().toISOString();receipt.oldIndex=prepared.oldIndex;receipt.newIndex=prepared.newIndex;receipt.after=after;receipt.oldAssetsRetained=true;write(`${e}/deployment.json`,receipt);console.log(JSON.stringify({status:receipt.status,time:receipt.finishedUtc,backendUnchanged:true,indexSha256:prepared.newIndex,checks:after.checks.length}));
  }catch(error){receipt.status='FAILED';receipt.failure=error.message.slice(0,250);if(switched){try{receipt.recovery=await rollback(prepared);}catch{receipt.recovery={status:'ROLLBACK FAILED; operator attention required'};}}write(`${e}/deployment.json`,receipt);throw error;}
 }
}
