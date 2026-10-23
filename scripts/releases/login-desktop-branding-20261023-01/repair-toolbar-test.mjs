import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {root,task,work,evidence,candidate,baseline,sha,read,files,frozen} from './prepare.mjs';
const manifest=frozen(),failed=read(`${evidence}/frontend-tests.json`),build=read(`${evidence}/build-validation.json`),test='frontend/src/ui-rules.test.ts',archive=`${evidence}/attempt-01-toolbar-markup`;
assert.equal(build.status,'FAIL');assert.equal(failed.numPassedTests,532);assert.equal(failed.numFailedTests,1);assert.equal(failed.numTotalTests,533);fs.mkdirSync(archive,{recursive:true});
const saved=['candidate.json','build-validation.json','frontend-tests.json','domain-build.log','frontend-tests.log','source-review.json'].filter(name=>fs.existsSync(`${evidence}/${name}`));
for(const name of saved){if(fs.existsSync(`${archive}/${name}`))assert.equal(sha(`${evidence}/${name}`),sha(`${archive}/${name}`),`Archived evidence changed: ${name}`);else fs.copyFileSync(`${evidence}/${name}`,`${archive}/${name}`,fs.constants.COPYFILE_EXCL);}
const before=fs.readFileSync(`${candidate}/${test}`,'utf8'),rootBefore=fs.readFileSync(`${root}/${test}`,'utf8');assert.equal(sha(`${candidate}/${test}`),sha(`${baseline}/${test}`));
fs.writeFileSync(`${archive}/ui-rules.test.ts`,before,{flag:'wx'});fs.writeFileSync(`${archive}/root-ui-rules.test.ts`,rootBefore,{flag:'wx'});
const old='    expect(accountPagesSource).toContain(\'<div className="login-toolbar-brand"><img className="login-toolbar-icon" src="/brand/nivasafe-icon.png"\');';
const replacement=[
'    const toolbarBrand = accountPagesSource.match(/<div className="login-toolbar-brand">([\\s\\S]*?)<\\/div>/)?.[1];',
'    expect(toolbarBrand).toContain(\'<picture className="login-toolbar-brand-image">\');',
'    expect(toolbarBrand).toContain(\'<source media="(min-width: 901px)" srcSet={locale === "en" ? "/brand/login-typography-en-060c9cae.png" : "/brand/login-typography-fa-7488d145.png"}/>\');',
'    expect(toolbarBrand).toContain(\'<img className="login-toolbar-icon" src="/brand/nivasafe-icon.png" alt={brandAltForLocale(locale)}/>\');',
'    expect(toolbarBrand).toContain("</picture>");'
];
assert.equal(before.split(old).length,2);assert.equal(rootBefore.split(old).length,2);
const patch=source=>source.replace(old,replacement.join(source.slice(source.indexOf(old)+old.length).startsWith('\r\n')?'\r\n':'\n'));
const after=patch(before),rootAfter=patch(rootBefore),snapshot=`${work}/root-before/${test}`;fs.mkdirSync(path.dirname(snapshot),{recursive:true});fs.writeFileSync(snapshot,rootBefore,{flag:'wx'});
fs.writeFileSync(`${candidate}/${test}`,after);fs.writeFileSync(`${root}/${test}`,rootAfter);
manifest.modified=[...manifest.modified,test].sort();manifest.rootSnapshots.push({path:test,beforeSha256:sha(snapshot),afterSha256:sha(`${root}/${test}`),candidateAfterSha256:sha(`${candidate}/${test}`),snapshotOrigin:'ROOT_USER_WORK_PRESERVED_INDEPENDENT_ONE_ASSERTION_PATCH'});manifest.rootSnapshots.sort((a,b)=>a.path.localeCompare(b.path));manifest.files=files(candidate).map(p=>({path:p,sha256:sha(`${candidate}/${p}`)}));assert.equal(manifest.files.length,533);
manifest.rework={archive:'attempt-01-toolbar-markup',reason:'The sole failed source contract assumed a direct toolbar img. Native picture intentionally wraps the same mobile fallback. The replacement asserts the desktop media boundary, both supplied locale paths, localized fallback icon and picture structure.',priorCandidateSha256:sha(`${archive}/candidate.json`),runtimeSourceUnchanged:true,repairHelperSha256:sha(`${root}/scripts/releases/${task}/repair-toolbar-test.mjs`)};
fs.writeFileSync(`${evidence}/candidate.json`,JSON.stringify(manifest,null,2));
fs.writeFileSync(`${archive}/repair.json`,JSON.stringify({status:'REPAIRED_PENDING_REVALIDATION',priorPassed:532,priorFailed:1,total:533,reason:manifest.rework.reason,oldTestSha256:sha(`${archive}/ui-rules.test.ts`),newTestSha256:sha(`${candidate}/${test}`),rootBeforeSha256:sha(snapshot),rootAfterSha256:sha(`${root}/${test}`),rootPreexistingDifferencesPreserved:true,runtimeSourceUnchanged:true,removedAssertions:0,initialRepairGuard:'First helper stopped before any source mutation when pre-existing root/candidate test bytes differed; original helper retained. Reset logic corrected before execution to retain the updated manifest.'},null,2),{flag:'wx'});
for(const name of saved.filter(name=>name!=='candidate.json')){assert.equal(sha(`${evidence}/${name}`),sha(`${archive}/${name}`));fs.unlinkSync(`${evidence}/${name}`);}
frozen();console.log(JSON.stringify({status:'TEST_CONTRACT_REPAIRED',files:manifest.files.length,approvedChanges:manifest.modified.length,runtimeSourceUnchanged:true}));
