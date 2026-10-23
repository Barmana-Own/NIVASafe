import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,task,id,work,evidence,live,cssPath,sha,read,hashText,frozen,protectedUnchanged,runtimeIdentity} from './prepare.mjs';
function atomic(file,bytes){const temporary=`${file}.${task}.tmp`;fs.writeFileSync(temporary,bytes,{flag:'wx'});fs.renameSync(temporary,file);}
async function publicBytes(url,bytes){const response=await fetch(`https://app.nivasafe.com${url}`,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);assert(Buffer.from(await response.arrayBuffer()).equals(bytes),`Public bytes differ: ${url}`);}
assert(process.argv.includes('--deploy'),'Explicit deployment action required');assert(!fs.existsSync(`${evidence}/deployment.json`));
let published=false,originalBytes;
try{
 const manifest=frozen(),before=read(`${evidence}/runtime-before.json`),build=read(`${evidence}/build-validation.json`),browser=read(`${evidence}/e2e-validation.json`),review=read(`${evidence}/security-review.json`);
 for(const gate of [build,browser,review]){assert.equal(gate.status,'PASS');assert.equal(gate.candidateManifestSha256,sha(`${evidence}/candidate.json`));assert.equal(gate.cssSupplementSha256,manifest.cssSupplementSha256);}
 for(const [key,file] of [['browserEvidenceSha256','e2e-validation.json'],['buildEvidenceSha256','build-validation.json']])assert.equal(review[key],sha(`${evidence}/${file}`));
 for(const name of ['prepare.mjs','validate.mjs','browser.mjs','release.mjs'])assert.equal(sha(`${root}/scripts/releases/${task}/${name}`),review.reviewedHelpersSha256[name]);
 assert.equal(browser.helperSha256,sha(`${root}/scripts/releases/${task}/browser.mjs`));assert.equal(browser.runtimeBeforeSha256,sha(`${evidence}/runtime-before.json`));assert.equal(browser.baselineIndexSha256,before.indexSha256);assert.equal(browser.liveIndexSha256,before.indexSha256);
 assert.equal(browser.fixturesSha256,sha(`${root}/scripts/releases/rula-photo-side-values-20261022-01/fixtures.mjs`));
 for(const file of browser.liveStaticInputs)assert.equal(sha(`${live}/${file.path}`),file.sha256);
 assert.equal(sha(`${root}/frontend/src/styles.css`),manifest.rootStylesAfterSha256);
 const css=fs.readFileSync(cssPath),cssAsset=`/assets/rula-cancel-hide-${hashText(css).slice(0,12)}.css`;
 originalBytes=fs.readFileSync(`${work}/index.before.html`);assert.equal(hashText(originalBytes),before.indexSha256);
 const original=originalBytes.toString('utf8'),insertion=`  <link rel="stylesheet" crossorigin href="${cssAsset}">\n`;
 assert.equal(original.split('</head>').length,2);const html=original.replace('</head>',`${insertion}</head>`);assert.equal(html.replace(insertion,''),original);
 protectedUnchanged(before);assert.deepEqual(await runtimeIdentity(),before.api);
 if(fs.existsSync(`${live}${cssAsset}`))assert.equal(sha(`${live}${cssAsset}`),manifest.cssSupplementSha256);else fs.writeFileSync(`${live}${cssAsset}`,css,{flag:'wx'});
 await publicBytes(cssAsset,css);protectedUnchanged(before);assert.deepEqual(await runtimeIdentity(),before.api);
 atomic(`${live}/index.html`,html);published=true;
 await publicBytes('/rula',Buffer.from(html));await publicBytes(cssAsset,css);
 protectedUnchanged(before,true);assert.deepEqual(await runtimeIdentity(),before.api);
 const result={status:'DEPLOYED',task,id,at:new Date().toISOString(),cssOnly:true,frontendOnly:true,javaScriptUnchanged:true,backendUnchanged:true,databaseUntouched:true,apiRestarted:false,api:before.api,privateEnvironmentAndProxyUnchanged:true,preservedPriorStaticFiles:before.staticFiles.length-1,preservedStylesheets:original.match(/<link\s+rel="stylesheet"[^>]*>/gu)??[],moduleEntry:original.match(/<script[^>]+src="([^"]+)"/u)?.[1],cssAsset,cssSha256:sha(`${live}${cssAsset}`),oldIndexSha256:before.indexSha256,newIndexSha256:sha(`${live}/index.html`),rollbackIndex:`${work}/index.before.html`};
 fs.writeFileSync(`${evidence}/deployment.json`,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
}catch(error){
 let recovery='NOT_REQUIRED',localRollbackVerified=false,publicRollbackVerified=false;
 if(published){try{atomic(`${live}/index.html`,originalBytes);assert.equal(sha(`${live}/index.html`),hashText(originalBytes));localRollbackVerified=true;recovery='OLD_INDEX_RESTORED_NEW_IMMUTABLE_CSS_RETAINED';}catch{recovery='LOCAL_ROLLBACK_FAILED_REQUIRES_ATTENTION';}if(localRollbackVerified)try{await publicBytes('/rula',originalBytes);publicRollbackVerified=true;}catch{recovery='OLD_INDEX_RESTORED_PUBLIC_VERIFICATION_UNAVAILABLE';}}
 const result={status:'FAIL',task,error:error.message,recovery,localRollbackVerified,publicRollbackVerified};fs.writeFileSync(`${evidence}/deployment-failure-${Date.now()}.json`,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));process.exitCode=1;
}
