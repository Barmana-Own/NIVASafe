import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,task,work,evidence,candidate,sha,read,files,frozen} from './prepare.mjs';

const name='attempt-02-header-mobile',archive=`${evidence}/${name}`,recordFile=`${archive}/archive-manifest.json`,cssPath='frontend/src/styles/login-desktop-branding.css';
const helper=`${root}/scripts/releases/${task}/repair-header-mobile.mjs`;
const resettable=new Set(['build-validation.json','frontend-tests.json','frontend-plan.json','source-review.json','build-graph-review.json','e2e-validation.json','security-review.json','domain-build.log','frontend-tests.log','frontend-typecheck-lint.log','frontend-compile.log','frontend-build.log','e2e-validation.log','browser.log']);
function verifyArchive(record){for(const file of record.files)assert.equal(sha(`${archive}/${file.savedPath}`),file.sha256,`Archive changed ${file.savedPath}`);}
function copyRecords(items){const records=[];for(const item of items){assert(fs.statSync(item.originalPath).isFile());const to=`${archive}/${item.savedPath}`,digest=sha(item.originalPath);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(item.originalPath,to,fs.constants.COPYFILE_EXCL);assert.equal(sha(to),digest);records.push({...item,sha256:digest,bytes:fs.statSync(to).size});}return records;}

if(process.argv.includes('--archive')){
  const m=frozen(),build=read(`${evidence}/build-validation.json`),qa=read(`${evidence}/e2e-validation.json`);
  assert.equal(build.status,'PASS');assert.equal(qa.status,'FAIL');assert.equal(qa.total,26);assert.equal(qa.failed,26);assert.equal(qa.passed,0);assert.equal(qa.candidateManifestSha256,sha(`${evidence}/candidate.json`));
  assert(!fs.existsSync(archive),'Never replace archived evidence');
  for(const file of m.rootSnapshots)assert.equal(sha(`${root}/${file.path}`),file.afterSha256);
  const activeNames=fs.readdirSync(evidence).filter(file=>file==='candidate.json'||resettable.has(file)||/^candidate-[A-Za-z0-9_.-]+\.(?:png|html)$/u.test(file));
  for(const required of ['candidate.json','build-validation.json','frontend-tests.json','frontend-plan.json','source-review.json','build-graph-review.json','e2e-validation.json'])assert(activeNames.includes(required));
  const helpers=fs.readdirSync(`${root}/scripts/releases/${task}`).filter(file=>file.endsWith('.mjs'));
  const items=[...activeNames.map(file=>({originalPath:`${evidence}/${file}`,savedPath:`evidence/${file}`,category:'ACTIVE_FAILED_ATTEMPT_EVIDENCE'})),...helpers.map(file=>({originalPath:`${root}/scripts/releases/${task}/${file}`,savedPath:`helpers/${file}`,category:'HELPER'})),...m.files.map(file=>({originalPath:`${candidate}/${file.path}`,savedPath:`candidate-source/${file.path}`,category:'FROZEN_SOURCE'})),...m.rootSnapshots.map(file=>({originalPath:`${root}/${file.path}`,savedPath:`root-source/${file.path}`,category:'ROOT_SOURCE'})),...m.rootSnapshots.filter(file=>file.beforeSha256).map(file=>({originalPath:`${work}/root-before/${file.path}`,savedPath:`root-before/${file.path}`,category:'ROOT_BEFORE'})),...build.artifacts.map(file=>({originalPath:`${candidate}/${file.path}`,savedPath:`built/${file.path}`,category:'BUILD_ARTIFACT'})),{originalPath:`${work}/test-index.html`,savedPath:'work/test-index.html',category:'HYBRID_INDEX'}];
  for(const file of build.artifacts)assert.equal(sha(`${candidate}/${file.path}`),file.sha256);
  fs.mkdirSync(archive);const records=copyRecords(items),record={status:'ARCHIVED_BEFORE_PRODUCT_OR_HARNESS_REPAIR',task,name,at:new Date().toISOString(),candidateManifestSha256:sha(`${evidence}/candidate.json`),browserEvidenceSha256:sha(`${evidence}/e2e-validation.json`),browserHelperSha256:sha(`${root}/scripts/releases/${task}/browser.mjs`),cssSupplementSha256:m.cssSupplementSha256,sourceFiles:m.files.length,failedChecks:26,files:records};
  fs.writeFileSync(recordFile,JSON.stringify(record,null,2),{flag:'wx'});verifyArchive(record);frozen();for(const file of m.rootSnapshots)assert.equal(sha(`${root}/${file.path}`),file.afterSha256);
  console.log(JSON.stringify({status:record.status,archive,files:records.length,sourceFiles:m.files.length,productAndActiveEvidenceUnmodified:true}));
}else if(process.argv.includes('--record-rework')){
  const archived=read(recordFile);verifyArchive(archived);assert(!fs.existsSync(`${archive}/workflow-rework.json`));
  const scope=read(`${evidence}/scope.json`),state=read(`${root}/project-state.json`),priorScopedState=state.loginDesktopBranding20261023;
  const entry={at:new Date().toISOString(),earliestResponsibleStage:3,reason:'Actual browser acceptance failed 0/26: inherited desktop header height and mobile picture source flex spacing require CSS repair; two serialization/origin comparison issues require isolated harness normalization. Preserve original evidence and rerun all affected downstream gates.',archive:name};
  fs.writeFileSync(`${archive}/workflow-rework.json`,JSON.stringify({status:'RETURNED_TO_STAGE_03',scopeBefore:scope,scopedStateBefore:priorScopedState,rework:entry},null,2),{flag:'wx'});
  scope.status='REWORK_REQUIRED';scope.activeStage=3;scope.nextStage=3;scope.reworkHistory=[...(scope.reworkHistory??[]),entry];scope.stages=scope.stages.map(stage=>stage.stage<3?stage:{...stage,status:'PENDING',priorAttemptStatus:stage.status});
  state.loginDesktopBranding20261023={...priorScopedState,status:'REWORK_REQUIRED',activeStage:3,nextStage:3,completedStages:[1,2],reworkHistory:[...(priorScopedState?.reworkHistory??[]),entry]};
  fs.writeFileSync(`${evidence}/scope.json`,JSON.stringify(scope,null,2));fs.writeFileSync(`${root}/project-state.json`,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({status:'RETURNED_TO_STAGE_03',task,archive:name}));
}else if(process.argv.includes('--refreeze')){
  const archived=read(recordFile);assert.equal(archived.status,'ARCHIVED_BEFORE_PRODUCT_OR_HARNESS_REPAIR');verifyArchive(archived);assert(!fs.existsSync(`${archive}/repair.json`));
  const m=frozen();assert.equal(sha(`${evidence}/candidate.json`),archived.candidateManifestSha256);assert.equal(m.files.length,533);assert.equal(sha(`${candidate}/${cssPath}`),archived.cssSupplementSha256);
  for(const file of m.rootSnapshots)if(file.path!==cssPath)assert.equal(sha(`${root}/${file.path}`),file.afterSha256,`Unrelated root source changed ${file.path}`);
  const newCssSha256=sha(`${root}/${cssPath}`);assert.notEqual(newCssSha256,archived.cssSupplementSha256);const css=fs.readFileSync(`${root}/${cssPath}`,'utf8');assert(css.includes('@media (min-width: 901px)'));assert(!/@import|url\(|expression\(|javascript:/iu.test(css));
  for(const item of archived.files.filter(file=>file.category==='ACTIVE_FAILED_ATTEMPT_EVIDENCE'))assert.equal(sha(item.originalPath),item.sha256,'Do not reset altered active evidence');assert.equal(sha(`${work}/test-index.html`),sha(`${archive}/work/test-index.html`));
  fs.copyFileSync(`${root}/${cssPath}`,`${candidate}/${cssPath}`);const snapshot=m.rootSnapshots.find(file=>file.path===cssPath);assert(snapshot);snapshot.previousAfterSha256=snapshot.afterSha256;snapshot.afterSha256=newCssSha256;
  m.cssSupplementSha256=newCssSha256;m.files=m.files.map(file=>file.path===cssPath?{...file,sha256:newCssSha256}:file);assert.deepEqual(files(candidate),m.files.map(file=>file.path));
  const repair={archive:name,reason:'Actual 0/26 browser attempt exposed inherited 76px desktop header and a mobile source flex item shifting the original icon by 8px. Scoped CSS reserves the 64px desktop header/form space and removes source from layout. The browser helper separately canonicalizes undefined JSON keys and owned loopback origins without changing acceptance criteria.',priorCandidateSha256:archived.candidateManifestSha256,priorBrowserEvidenceSha256:archived.browserEvidenceSha256,priorCssSupplementSha256:archived.cssSupplementSha256,cssSupplementSha256:newCssSha256,sourceChanged:[cssPath],helperSha256:sha(helper),baselineAndAttempt01Untouched:true};
  m.reworkHistory=[...(m.reworkHistory??(m.rework?[m.rework]:[])),repair];fs.writeFileSync(`${evidence}/candidate.json`,JSON.stringify(m,null,2));frozen();for(const file of m.rootSnapshots)assert.equal(sha(`${root}/${file.path}`),file.afterSha256);
  const reset=archived.files.filter(file=>file.category==='ACTIVE_FAILED_ATTEMPT_EVIDENCE'&&path.basename(file.originalPath)!=='candidate.json');
  for(const file of reset){assert.equal(path.dirname(file.originalPath).replaceAll('\\','/'),evidence);assert.equal(sha(file.originalPath),file.sha256);fs.unlinkSync(file.originalPath);}
  fs.unlinkSync(`${work}/test-index.html`);verifyArchive(archived);
  fs.writeFileSync(`${archive}/repair.json`,JSON.stringify({status:'CSS_REFROZEN_PENDING_REVALIDATION',task,...repair,candidateManifestSha256:sha(`${evidence}/candidate.json`),resetEvidence:reset.map(file=>path.basename(file.originalPath)),testIndexReset:true,originalFailedArtifactsRetained:true},null,2),{flag:'wx'});
  console.log(JSON.stringify({status:'CSS_REFROZEN_PENDING_REVALIDATION',sourceFiles:m.files.length,cssSupplementSha256:newCssSha256,reset:reset.length,candidateManifestRetained:true}));
}else throw new Error('Use --archive before repairs, --record-rework for Stage 03, then --refreeze after the root CSS repair');
