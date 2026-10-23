import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,task,id,work,evidence,candidate,live,sourcePath,cssPath,sha,read,hashText,frozen,protectedUnchanged,runtimeIdentity} from './prepare.mjs';
import {frontendPlan} from './plan.mjs';
function atomic(file,bytes){const temporary=`${file}.${task}.tmp`;fs.writeFileSync(temporary,bytes,{flag:'wx'});fs.renameSync(temporary,file);}
async function publicBytes(url,bytes){const response=await fetch(`https://app.nivasafe.com${url}`,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);assert(Buffer.from(await response.arrayBuffer()).equals(bytes),`Public bytes differ: ${url}`);}
assert(process.argv.includes('--deploy'));assert(!fs.existsSync(`${evidence}/deployment.json`));
let published=false,originalBytes;
try{
 const manifest=frozen(),before=read(`${evidence}/runtime-before.json`),build=read(`${evidence}/build-validation.json`),browser=read(`${evidence}/e2e-validation.json`),review=read(`${evidence}/security-review.json`);
 for(const gate of [build,browser,review]){assert.equal(gate.status,'PASS');assert.equal(gate.candidateManifestSha256,sha(`${evidence}/candidate.json`));assert.equal(gate.cssSupplementSha256,manifest.cssSupplementSha256);}
 for(const [key,file] of [['browserEvidenceSha256','e2e-validation.json'],['buildEvidenceSha256','build-validation.json'],['frontendPlanSha256','frontend-plan.json']])assert.equal(review[key],sha(`${evidence}/${file}`));
 for(const name of ['prepare.mjs','validate.mjs','plan.mjs','browser.mjs','release.mjs'])assert.equal(sha(`${root}/scripts/releases/${task}/${name}`),review.reviewedHelpersSha256[name]);
 assert.equal(browser.helperSha256,sha(`${root}/scripts/releases/${task}/browser.mjs`));assert.equal(browser.runtimeBeforeSha256,sha(`${evidence}/runtime-before.json`));assert.equal(browser.baselineIndexSha256,before.indexSha256);assert.equal(browser.liveIndexSha256,before.indexSha256);assert.equal(browser.frontendPlanSha256,sha(`${evidence}/frontend-plan.json`));
 for(const file of browser.liveStaticInputs)assert.equal(sha(`${live}/${file.path}`),file.sha256);
 for(const file of browser.candidateStaticInputs)assert.equal(sha(`${candidate}/frontend/dist/${file.path}`),file.sha256);
 for(const file of build.artifacts)assert.equal(sha(`${candidate}/${file.path}`),file.sha256);
 assert.equal(sha(`${root}/frontend/src/styles.css`),manifest.rootStylesAfterSha256);assert.equal(sha(`${root}/${sourcePath}`),manifest.rootSourceAfterSha256);assert.equal(sha(`${root}/${manifest.testPath}`),manifest.testSha256);
 originalBytes=fs.readFileSync(`${work}/index.before.html`);assert.equal(hashText(originalBytes),before.indexSha256);const plan=frontendPlan();assert.deepEqual(plan,read(`${evidence}/frontend-plan.json`));assert.equal(sha(`${work}/test-index.html`),plan.htmlSha256);assert.equal(browser.hybridIndexSha256,plan.htmlSha256);
 protectedUnchanged(before);assert.deepEqual(await runtimeIdentity(),before.api);
 const addedAssets=[];
 for(const asset of [...plan.assets,{url:plan.cssAsset,sha256:manifest.cssSupplementSha256}]){
  const source=asset.url===plan.cssAsset?cssPath:`${candidate}/frontend/dist${asset.url}`,target=`${live}${asset.url}`;assert.equal(sha(source),asset.sha256);
  if(fs.existsSync(target))assert.equal(sha(target),asset.sha256);else{fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);addedAssets.push(asset.url);}
 }
 for(const url of addedAssets)await publicBytes(url,fs.readFileSync(`${live}${url}`));
 protectedUnchanged(before);assert.deepEqual(await runtimeIdentity(),before.api);atomic(`${live}/index.html`,plan.html);published=true;
 await publicBytes('/assistant',Buffer.from(plan.html));await publicBytes(plan.cssAsset,fs.readFileSync(cssPath));protectedUnchanged(before,true);assert.deepEqual(await runtimeIdentity(),before.api);
 const result={status:'DEPLOYED',task,id,at:new Date().toISOString(),frontendOnly:true,approvedRuntimeSource:manifest.approvedRuntimeSource,backendUnchanged:true,databaseUntouched:true,apiRestarted:false,api:before.api,privateEnvironmentAndProxyUnchanged:true,preservedPriorStaticFiles:before.staticFiles.length-1,preservedStylesheets:plan.preservedStylesheets,oldEntry:plan.oldEntry,newEntry:plan.newEntry,moduleEntry:plan.newEntry,addedAssets,cssAsset:plan.cssAsset,cssSha256:manifest.cssSupplementSha256,frontendPlanSha256:sha(`${evidence}/frontend-plan.json`),oldIndexSha256:before.indexSha256,newIndexSha256:sha(`${live}/index.html`),rollbackIndex:`${work}/index.before.html`};
 fs.writeFileSync(`${evidence}/deployment.json`,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({status:result.status,task,newEntry:plan.newEntry,addedAssets:addedAssets.length,cssAsset:plan.cssAsset,apiPid:before.api.pid}));
}catch(error){
 let recovery='NOT_REQUIRED',localRollbackVerified=false,publicRollbackVerified=false;
 if(published){try{atomic(`${live}/index.html`,originalBytes);assert.equal(sha(`${live}/index.html`),hashText(originalBytes));localRollbackVerified=true;recovery='OLD_INDEX_RESTORED_IMMUTABLE_ASSETS_RETAINED';}catch{recovery='LOCAL_ROLLBACK_FAILED_REQUIRES_ATTENTION';}if(localRollbackVerified)try{await publicBytes('/assistant',originalBytes);publicRollbackVerified=true;}catch{recovery='OLD_INDEX_RESTORED_PUBLIC_VERIFICATION_UNAVAILABLE';}}
 const result={status:'FAIL',task,error:error.message,recovery,localRollbackVerified,publicRollbackVerified};fs.writeFileSync(`${evidence}/deployment-failure-${Date.now()}.json`,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));process.exitCode=1;
}
