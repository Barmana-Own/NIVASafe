import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,task,id,work,evidence,candidate,live,sha,read,hashText,files,frozen,protectedUnchanged,runtimeIdentity} from './prepare.mjs';
import {frontendPlan} from './plan.mjs';

const atomic=(p,bytes)=>{const tmp=`${p}.${task}.tmp`;fs.writeFileSync(tmp,bytes,{flag:'wx'});fs.renameSync(tmp,p);};
async function publicBytes(url,bytes){assert(url.startsWith('/'));const r=await fetch(`https://app.nivasafe.com${url}`,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000),redirect:'error'});assert.equal(r.status,200);assert(Buffer.from(await r.arrayBuffer()).equals(bytes),`Public byte mismatch ${url}`);}
let switched=false,original;
try{
assert(process.argv.includes('--deploy'));assert(!fs.existsSync(`${evidence}/deployment.json`));
const m=frozen(),before=read(`${evidence}/runtime-before.json`),build=read(`${evidence}/build-validation.json`),browser=read(`${evidence}/e2e-validation.json`),review=read(`${evidence}/security-review.json`);
assert.deepEqual(files(candidate),m.files.map(f=>f.path));
for(const g of [build,browser,review]){assert.equal(g.status,'PASS');assert.equal(g.candidateManifestSha256,sha(`${evidence}/candidate.json`));}
for(const [key,file] of [['buildEvidenceSha256','build-validation.json'],['browserEvidenceSha256','e2e-validation.json'],['frontendPlanSha256','frontend-plan.json']])assert.equal(review[key],sha(`${evidence}/${file}`));
const helperNames=['prepare.mjs','freeze.mjs','validate.mjs','plan.mjs','baseline.mjs','baseline-900.mjs','browser.mjs','release.mjs','finish.mjs'];
for(const name of helperNames)assert.equal(sha(`${root}/scripts/releases/${task}/${name}`),review.reviewedHelpersSha256[name],`Helper not sealed ${name}`);
for(const name of fs.readdirSync(`${root}/scripts/releases/${task}`).filter(name=>name.endsWith('.mjs')))assert.equal(sha(`${root}/scripts/releases/${task}/${name}`),review.reviewedHelpersSha256[name],`Additional task helper not sealed ${name}`);
for(const [name,hash] of Object.entries(review.reviewedHelpersSha256)){assert(/^[A-Za-z0-9_.-]+\.mjs$/u.test(name));assert.equal(sha(`${root}/scripts/releases/${task}/${name}`),hash);}
assert.equal(browser.helperSha256,sha(`${root}/scripts/releases/${task}/browser.mjs`));
assert.equal(browser.runtimeBeforeSha256,sha(`${evidence}/runtime-before.json`));assert.equal(browser.baselineIndexSha256,before.indexSha256);assert.equal(browser.liveIndexSha256,before.indexSha256);
assert.equal(browser.buildValidationSha256,sha(`${evidence}/build-validation.json`));assert.equal(browser.frontendPlanSha256,sha(`${evidence}/frontend-plan.json`));
assert.equal(browser.baselineObservationsSha256,sha(`${evidence}/baseline-observations.json`));assert.equal(browser.baseline900Sha256,sha(`${evidence}/baseline-900-observations.json`));
assert.equal(browser.mobilePreserved,true);assert.equal(browser.failed,0);assert(browser.passed>0);
assert.equal(m.assetsInspectionSha256,sha(`${evidence}/assets-inspection.json`));assert.equal(m.cssSupplementSha256,sha(m.cssSupplement));
const inspected=read(`${evidence}/assets-inspection.json`);assert.equal(inspected.status,'PASS');assert.equal(sha(inspected.archive),inspected.archiveSha256);
for(const list of ['liveStaticInputs','candidateStaticInputs','fixtureInputs'])assert(Array.isArray(browser[list])&&browser[list].length,`Missing browser binding ${list}`);
for(const f of browser.liveStaticInputs){assert(!f.path.startsWith('/')&&!f.path.split('/').includes('..'));assert.equal(sha(`${live}/${f.path}`),f.sha256);}
for(const f of browser.candidateStaticInputs){assert(!f.path.startsWith('/')&&!f.path.split('/').includes('..'));assert.equal(sha(`${candidate}/frontend/dist/${f.path}`),f.sha256);}
for(const f of browser.fixtureInputs){assert(path.isAbsolute(f.path));assert.equal(sha(f.path),f.sha256);}
for(const f of build.artifacts)assert.equal(sha(`${candidate}/${f.path}`),f.sha256);
for(const f of m.rootSnapshots){assert.equal(sha(`${root}/${f.path}`),f.afterSha256);if(f.beforeSha256)assert.equal(sha(`${work}/root-before/${f.path}`),f.beforeSha256);}
const plan=frontendPlan();assert.deepEqual(plan,read(`${evidence}/frontend-plan.json`));assert.equal(browser.hybridIndexSha256,plan.htmlSha256);assert.equal(sha(`${work}/test-index.html`),plan.htmlSha256);
original=fs.readFileSync(`${work}/index.before.html`);assert.equal(hashText(original),before.indexSha256);protectedUnchanged(before);assert.deepEqual(await runtimeIdentity(),before.api);
const publication=[...plan.assets.map(a=>({...a,from:`${candidate}/frontend/dist${a.url}`})),{url:plan.cssAsset,sha256:plan.cssSupplementSha256,from:m.cssSupplement},...plan.brandAssets.map(a=>({...a,from:`${candidate}/${a.path}`}))];
assert.equal(new Set(publication.map(a=>a.url)).size,publication.length);assert.equal(plan.brandAssets.length,2);
const addedAssets=[];for(const asset of publication){assert(/^\/(?:assets\/[A-Za-z0-9_-]+\.(?:js|css)|brand\/login-typography-(?:en-060c9cae|fa-7488d145)\.png)$/u.test(asset.url));assert.equal(sha(asset.from),asset.sha256);const to=`${live}${asset.url}`;if(fs.existsSync(to))assert.equal(sha(to),asset.sha256,'Never overwrite a different immutable asset');else{fs.copyFileSync(asset.from,to,fs.constants.COPYFILE_EXCL);addedAssets.push(asset.url);}}
for(const asset of publication)await publicBytes(asset.url,fs.readFileSync(asset.from));
protectedUnchanged(before);assert.deepEqual(await runtimeIdentity(),before.api);atomic(`${live}/index.html`,plan.html);switched=true;
await publicBytes('/login',Buffer.from(plan.html));assert.equal(sha(`${live}/index.html`),plan.htmlSha256);protectedUnchanged(before,true);assert.deepEqual(await runtimeIdentity(),before.api);
const result={status:'DEPLOYED',task,id,at:new Date().toISOString(),candidateManifestSha256:sha(`${evidence}/candidate.json`),buildEvidenceSha256:sha(`${evidence}/build-validation.json`),browserEvidenceSha256:sha(`${evidence}/e2e-validation.json`),securityReviewSha256:sha(`${evidence}/security-review.json`),frontendOnly:true,apiRestarted:false,api:before.api,backendAndDatabaseUntouched:true,privateEnvironmentAndProxyUnchanged:true,preservedPriorStaticFiles:before.staticFiles.length-1,preservedStylesheets:plan.preservedStylesheets,newStylesheet:plan.cssAsset,cssSupplementSha256:plan.cssSupplementSha256,brandAssets:plan.brandAssets,oldEntry:plan.oldEntry,newEntry:plan.newEntry,addedAssets,publishedAssets:publication.map(({url,sha256})=>({url,sha256})),frontendPlanSha256:sha(`${evidence}/frontend-plan.json`),oldIndexSha256:before.indexSha256,newIndexSha256:sha(`${live}/index.html`),rollbackIndex:`${work}/index.before.html`};
fs.writeFileSync(`${evidence}/deployment.json`,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({status:result.status,task,newEntry:plan.newEntry,addedAssets:addedAssets.length,apiPid:before.api.pid}));
}catch(error){let recovery='NOT_REQUIRED';if(switched){try{atomic(`${live}/index.html`,original);assert.equal(sha(`${live}/index.html`),hashText(original));recovery='OLD_INDEX_RESTORED_IMMUTABLE_ASSETS_RETAINED';}catch{recovery='LOCAL_ROLLBACK_FAILED';}if(recovery.startsWith('OLD_INDEX'))try{await publicBytes('/login',original);}catch{recovery='OLD_INDEX_RESTORED_PUBLIC_VERIFICATION_UNAVAILABLE';}}
const r={status:'FAIL',task,error:error.message,recovery};fs.writeFileSync(`${evidence}/deployment-failure-${Date.now()}.json`,JSON.stringify(r,null,2),{flag:'wx'});console.log(JSON.stringify(r));process.exitCode=1;}
