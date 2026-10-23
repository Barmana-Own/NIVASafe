import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {sha,read,files,liveFiles,hashText} from '../rula-connected-overlay-20261022-01/prepare.mjs';
import {runtimeIdentity as apiIdentity} from '../rula-photo-side-values-20261022-01/prepare.mjs';
export {sha,read,files,liveFiles,hashText};
export const root='C:/NIVASafe',task='login-desktop-branding-20261023-01',id=`release-${task}`,work=`${root}/.local/${task}`,evidence=`${root}/reports/evidence/${task}`,candidate=`${work}/candidate`,baseline=`${root}/.local/rula-group-scores-20261023-01/candidate`,live='C:/inetpub/nivasafe/app-com',apiId='release-rula-review-population-20261023-01',apiRoot=`C:/ProgramData/NIVASafe/releases/${apiId}/backend`,config=`${root}/deployment/ecosystem.config.cjs`,proxy='C:/Runtime/nginx/conf/nginx.conf';
export const sourcePath='frontend/src/features/account/AccountPages.tsx';
export const runtimeIdentity=()=>apiIdentity(apiId);
export function frozen(){const m=read(`${evidence}/candidate.json`);for(const f of m.files)assert.equal(sha(`${candidate}/${f.path}`),f.sha256,`Frozen source changed ${f.path}`);return m;}
export function protectedUnchanged(before,allowIndex=false){for(const [p,hash] of [[`${root}/.env`,before.envSha256],[config,before.configSha256],[proxy,before.proxySha256]])assert.equal(sha(p),hash);for(const f of before.staticFiles)if(!(allowIndex&&f.path==='index.html'))assert.equal(sha(`${live}/${f.path}`),f.sha256);for(const f of before.backendFiles)assert.equal(sha(`${apiRoot}/${f.path}`),f.sha256);}
async function prepare(){
 fs.mkdirSync(work,{recursive:true});fs.mkdirSync(evidence,{recursive:true});assert(!fs.existsSync(candidate));
 const prior=read(`${root}/reports/evidence/rula-group-scores-20261023-01/candidate.json`);assert.equal(prior.files.length,530);for(const f of prior.files)assert.equal(sha(`${baseline}/${f.path}`),f.sha256);
 const api=await runtimeIdentity();assert.equal(api.pid,10380);
 const before={at:new Date().toISOString(),api,envSha256:sha(`${root}/.env`),configSha256:sha(config),proxySha256:sha(proxy),indexSha256:sha(`${live}/index.html`),staticFiles:liveFiles(live).map(p=>({path:p,sha256:sha(`${live}/${p}`)})),backendFiles:[...['src','dist','prisma','python'].flatMap(d=>liveFiles(`${apiRoot}/${d}`).filter(p=>!p.includes('__pycache__')).map(p=>`${d}/${p}`)),'package.json','tsconfig.json','vitest.config.ts'].map(p=>({path:p,sha256:sha(`${apiRoot}/${p}`)}))};
 assert.equal(before.indexSha256,read(`${root}/reports/evidence/rula-group-scores-20261023-01/deployment.json`).newIndexSha256);
 const index=fs.readFileSync(`${live}/index.html`,'utf8'),entries=[...index.matchAll(/<script\s+type="module"\s+crossorigin\s+src="([^"]+\.js)"><\/script>/gu)];assert.equal(entries.length,1);assert.equal(entries[0][1],'/assets/index-BPiIxoch.js');
 fs.writeFileSync(`${evidence}/runtime-before.json`,JSON.stringify(before,null,2),{flag:'wx'});for(const [from,to] of [[`${live}/index.html`,`${work}/index.before.html`],[config,`${work}/ecosystem.before.cjs`],[proxy,`${work}/nginx.before.conf`]])fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);
 const skip=new Set(['node_modules','dist','.turbo','.vite-cache','__pycache__','playwright-results','playwright-report']);fs.cpSync(baseline,candidate,{recursive:true,filter:s=>!skip.has(path.basename(s))&&!s.endsWith('.tsbuildinfo')&&!path.basename(s).startsWith('.env')});
 for(const dir of ['','frontend','backend','shared/domain'])fs.symlinkSync(`${root}/${dir?`${dir}/`:''}node_modules`,`${candidate}/${dir?`${dir}/`:''}node_modules`,'junction');
 const initialFiles=files(candidate).map(p=>({path:p,sha256:sha(`${candidate}/${p}`)}));assert.equal(initialFiles.length,530);assert.deepEqual(initialFiles,prior.files);
 fs.writeFileSync(`${evidence}/baseline.json`,JSON.stringify({task,baseline,files:initialFiles},null,2),{flag:'wx'});
 fs.writeFileSync(`${evidence}/initial-candidate-manifest.json`,JSON.stringify({task,status:'INITIAL_BASELINE_FROZEN',baseline,files:initialFiles,sourceUnmodified:true,finalCandidateManifest:'candidate.json is reserved for the reviewed implementation freeze.'},null,2),{flag:'wx'});
 const docPath=`docs/${task}.md`,doc=`# Login desktop branding maintenance

Release: \`${id}\`

Status: baseline prepared; scoped stages 01 and 02 PASS. Product implementation, validation, publication and independent final review remain pending.

## Stage 01 — scope and observable requirements

This maintenance change affects only the existing login screen above the existing 900 px mobile boundary. It evolves the current login page and does not create a new authentication architecture.

| ID | Required behavior |
|---|---|
| FR-01 | On desktop, replace only the toolbar icon with the supplied Persian or English typographic brand asset for the selected locale. Preserve the existing mobile icon. |
| FR-02 | On desktop, place the existing login-card icon inline beside the welcome heading. |
| FR-03 | On desktop, hide only the existing welcome-message paragraph. Preserve its translation and mobile visibility. |
| FR-04 | On desktop, make footer logos smaller, remove the park logo's white border/tile treatment and use the requested monochrome appearance. Preserve seal/link behavior and alternative text. |
| FR-05 | Reduce desktop header/footer height while preserving controls, focus visibility and usable content layout. |
| FR-06 | At 900 px and below, preserve existing login/landing behavior, mobile form navigation, icons, footer and responsive layout. Preserve all other pages. |
| NFR-01 | Preserve login validation, submission locking, credentials/session handling, redirects, API contracts and server authorization. |
| NFR-02 | Preserve all previous routes, content, source, styles outside the authorized scope, public assets, backend files, environment, proxy and managed API identity. |

Inputs are the owner's supplied typography archive and the existing login layout. Asset verification is an implementation prerequisite: select the correct locale variants, inspect file type/content and preserve all supplied originals outside public output if they are unsuitable for direct publication. Do not invent a substitute wordmark.

## Stage 02 — existing UI architecture and preservation rules

The current surface is \`frontend/src/features/account/AccountPages.tsx\`, with existing authentication and responsive styles. Reuse its toolbar, welcome heading/icon, footer logos, theme/language controls and form. Scope new desktop rules to the login page and the existing desktop breakpoint; registration, recovery, mobile and authenticated pages remain unchanged.

Preserve real RTL/LTR behavior, locale selection, readable wordmark proportions, meaningful image alternatives, keyboard focus and all existing form states. Avoid image distortion, header/footer overflow and exposing removed welcome text as a required field. The owner's visibility request applies only to the desktop welcome paragraph.

Verification must include Persian and English, white and blue themes, desktop widths immediately above 900 px and representative larger screens, plus mobile widths at/below 900 px. Compare mobile geometry/content and all unrelated login handlers against the frozen initial baseline. Confirm password visibility, validation/error states, duplicate-submit protection and link destinations through isolated synthetic fixtures; do not use real credentials or production business writes.

## Initial integrity and handoff

The initial source snapshot contains 530 unchanged files. Runtime entry is \`/assets/index-BPiIxoch.js\`. The existing API is \`${apiId}\`, PID ${api.pid}; its identity and database health were verified during preparation. All ${before.staticFiles.length} current public files and ${before.backendFiles.length} private backend files are inventoried. Environment values are never copied into evidence; only their file hash is recorded. Managed config, proxy config and the original public index have local rollback/reference snapshots.

Evidence: \`reports/evidence/${task}/runtime-before.json\`, \`baseline.json\`, \`initial-candidate-manifest.json\`, \`integrity-baseline.json\` and \`scope.json\`. The final \`candidate.json\` must be generated only after the authorized implementation is complete and reviewed.
`;
 assert(!fs.existsSync(`${root}/${docPath}`));fs.writeFileSync(`${root}/${docPath}`,doc,{flag:'wx'});
 const scope={task,status:'IN_PROGRESS',activeStage:3,nextStage:3,scope:'Desktop login branding/layout only above 900 px: supplied localized toolbar typography, inline existing welcome icon, hide existing welcome message, smaller monochrome footer marks without park white border, compact desktop header/footer. Preserve mobile <=900 px and every unrelated UI/auth/data path.',requirementsDocument:docPath,stages:Array.from({length:12},(_,i)=>({stage:i+1,status:i<2?'PASS':'PENDING',applicability:[4,5,6,7].includes(i+1)?'EXISTING_BOUNDARIES_PRESERVED':'SCOPED_FRONTEND_MAINTENANCE',...(i<2?{evidence:'Owner scope reconciled with existing login markup, localization, responsive boundary and frozen source/runtime preservation baseline.'}:{})}))};fs.writeFileSync(`${evidence}/scope.json`,JSON.stringify(scope,null,2),{flag:'wx'});
 const state=read(`${root}/project-state.json`);state.loginDesktopBranding20261023={...state.loginDesktopBranding20261023,task,status:'IN_PROGRESS',activeStage:3,nextStage:3,completedStages:[1,2],scope:`reports/evidence/${task}/scope.json`,architecture:docPath,initialSourceManifest:`reports/evidence/${task}/initial-candidate-manifest.json`};fs.writeFileSync(`${root}/project-state.json`,JSON.stringify(state,null,2)+'\n');
 fs.writeFileSync(`${evidence}/integrity-baseline.json`,JSON.stringify({task,sourceFiles:initialFiles.length,publicFiles:before.staticFiles.length,privateBackendFiles:before.backendFiles.length,initialEntry:entries[0][1],api,protected:'All login handlers, mobile <=900px layouts/content, unrelated authentication and application pages, routes, APIs, data, dependencies, global styles outside authorized desktop rules, prior assets and releases.',authorizedDesktopVisibilityChange:'Only the existing welcome-message paragraph; mobile remains visible.',privateEnvSnapshot:'HASH_ONLY_NO_SECRET_VALUES',stage01:'PASS',stage02:'PASS',implementation:'PENDING'},null,2),{flag:'wx'});
 protectedUnchanged(before);assert.deepEqual(await runtimeIdentity(),before.api);
 console.log(JSON.stringify({status:'BASELINE_PREPARED',task,candidate,sourceFiles:initialFiles.length,publicFiles:before.staticFiles.length,privateBackendFiles:before.backendFiles.length,entry:entries[0][1],apiPid:api.pid,initialManifest:`${evidence}/initial-candidate-manifest.json`,scopeDocument:`${root}/${docPath}`}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await prepare();
