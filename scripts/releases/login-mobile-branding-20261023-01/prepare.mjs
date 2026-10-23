import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {sha,read,files,liveFiles,hashText} from '../rula-connected-overlay-20261022-01/prepare.mjs';
import {runtimeIdentity as apiIdentity} from '../rula-photo-side-values-20261022-01/prepare.mjs';
export {sha,read,files,liveFiles,hashText};
export const root='C:/NIVASafe',task='login-mobile-branding-20261023-01',id=`release-${task}`,work=`${root}/.local/${task}`,evidence=`${root}/reports/evidence/${task}`,candidate=`${work}/candidate`,baseline=`${root}/.local/login-desktop-branding-20261023-01/candidate`,live='C:/inetpub/nivasafe/app-com',apiId='release-rula-review-population-20261023-01',apiRoot=`C:/ProgramData/NIVASafe/releases/${apiId}/backend`,config=`${root}/deployment/ecosystem.config.cjs`,proxy='C:/Runtime/nginx/conf/nginx.conf';
export const sourcePath='frontend/src/features/account/AccountPages.tsx';
export const runtimeIdentity=()=>apiIdentity(apiId);
export function frozen(){const m=read(`${evidence}/candidate.json`);assert.deepEqual(files(candidate),m.files.map(f=>f.path));for(const f of m.files)assert.equal(sha(`${candidate}/${f.path}`),f.sha256,`Frozen source changed ${f.path}`);return m;}
export function protectedUnchanged(before,allowIndex=false){for(const [p,hash] of [[`${root}/.env`,before.envSha256],[config,before.configSha256],[proxy,before.proxySha256]])assert.equal(sha(p),hash);for(const f of before.staticFiles)if(!(allowIndex&&f.path==='index.html'))assert.equal(sha(`${live}/${f.path}`),f.sha256);for(const f of before.backendFiles)assert.equal(sha(`${apiRoot}/${f.path}`),f.sha256);}

async function prepare(){
  fs.mkdirSync(work,{recursive:true});fs.mkdirSync(evidence,{recursive:true});assert(!fs.existsSync(candidate));
  const previous=`${root}/reports/evidence/login-desktop-branding-20261023-01`,prior=read(`${previous}/candidate.json`);assert.equal(prior.files.length,533);for(const f of prior.files)assert.equal(sha(`${baseline}/${f.path}`),f.sha256);assert.equal(read(`${previous}/completion.json`).STAGE_12_STATUS,'PASS');
  const api=await runtimeIdentity();assert.equal(api.pid,10380);
  const before={at:new Date().toISOString(),api,envSha256:sha(`${root}/.env`),configSha256:sha(config),proxySha256:sha(proxy),indexSha256:sha(`${live}/index.html`),staticFiles:liveFiles(live).map(p=>({path:p,sha256:sha(`${live}/${p}`)})),backendFiles:[...['src','dist','prisma','python'].flatMap(d=>liveFiles(`${apiRoot}/${d}`).filter(p=>!p.includes('__pycache__')).map(p=>`${d}/${p}`)),'package.json','tsconfig.json','vitest.config.ts'].map(p=>({path:p,sha256:sha(`${apiRoot}/${p}`)}))};
  assert.equal(before.indexSha256,read(`${previous}/deployment.json`).newIndexSha256);assert.equal(before.staticFiles.length,909);assert.equal(before.backendFiles.length,368);
  const index=fs.readFileSync(`${live}/index.html`,'utf8'),entries=[...index.matchAll(/<script\s+type="module"\s+crossorigin\s+src="([^"]+\.js)"><\/script>/gu)];assert.equal(entries.length,1);assert.equal(entries[0][1],'/assets/index-BUWCCQVs.js');assert.equal((index.match(/<link\s+rel="stylesheet"[^>]*>/gu)??[]).length,20);
  fs.writeFileSync(`${evidence}/runtime-before.json`,JSON.stringify(before,null,2),{flag:'wx'});for(const [from,to] of [[`${live}/index.html`,`${work}/index.before.html`],[config,`${work}/ecosystem.before.cjs`],[proxy,`${work}/nginx.before.conf`]])fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);
  const skip=new Set(['node_modules','dist','.turbo','.vite-cache','__pycache__','playwright-results','playwright-report']);fs.cpSync(baseline,candidate,{recursive:true,filter:s=>!skip.has(path.basename(s))&&!s.endsWith('.tsbuildinfo')&&!path.basename(s).startsWith('.env')});
  for(const dir of ['','frontend','backend','shared/domain'])fs.symlinkSync(`${root}/${dir?`${dir}/`:''}node_modules`,`${candidate}/${dir?`${dir}/`:''}node_modules`,'junction');
  const initialFiles=files(candidate).map(p=>({path:p,sha256:sha(`${candidate}/${p}`)}));assert.equal(initialFiles.length,533);assert.deepEqual(initialFiles,prior.files);
  fs.writeFileSync(`${evidence}/baseline.json`,JSON.stringify({task,baseline,files:initialFiles},null,2),{flag:'wx'});fs.writeFileSync(`${evidence}/initial-candidate-manifest.json`,JSON.stringify({task,status:'INITIAL_BASELINE_FROZEN',baseline,files:initialFiles,sourceUnmodified:true,finalCandidateManifest:'candidate.json is reserved for the authorized implementation freeze.'},null,2),{flag:'wx'});
  const rootSources=[];for(const p of [sourcePath,'frontend/src/main.tsx']){const to=`${work}/root-initial/${p}`;fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(`${root}/${p}`,to,fs.constants.COPYFILE_EXCL);rootSources.push({path:p,sha256:sha(`${root}/${p}`),baselineSha256:sha(`${baseline}/${p}`)});}
  fs.writeFileSync(`${evidence}/root-initial-sources.json`,JSON.stringify({task,files:rootSources},null,2),{flag:'wx'});
  const brandAssets=prior.brandAssets.map(asset=>{assert.equal(sha(`${candidate}/${asset.path}`),asset.sha256);assert.equal(sha(`${live}${asset.url}`),asset.sha256);return asset;});assert.equal(brandAssets.length,2);
  fs.writeFileSync(`${evidence}/assets-preservation.json`,JSON.stringify({status:'PASS',task,newAssets:0,brandAssets,priorInspectionSha256:sha(`${previous}/assets-inspection.json`),originalSuppliedPngBytesRetained:true},null,2),{flag:'wx'});
  const docPath=`docs/${task}.md`,doc=`# Mobile login branding maintenance

Release: \`${id}\`

Status: baseline prepared; scoped stages 01 and 02 PASS. Product implementation, validation, publication and independent final review remain pending.

## Stage 01 — requirements and preservation

Only the mobile login landing surface at widths of 900 px and below changes. Reuse the existing main-brand icon container and the two already published original locale wordmarks. Desktop login, the mobile login form, every authentication handler and all unrelated pages remain unchanged.

| ID | Observable behavior |
|---|---|
| FR-01 | On the mobile landing view, remove the existing icon from the toolbar visually and show the existing icon in the main brand area. |
| FR-02 | Place the currently selected locale's existing original wordmark directly beneath that main icon; retain the existing subtitle node and translations. |
| FR-03 | Reflow the landing toolbar within the space released by its hidden brand, preserving all theme/language/navigation controls and destinations. |
| FR-04 | Use compact responsive brand sizing, including shorter viewport heights, without overlap, distortion or horizontal clipping. |
| NFR-01 | Preserve the desktop layout above 900 px, mobile form layout/navigation/content, validation, submission locking, credentials/session/redirect handling and API authorization. |
| NFR-02 | Preserve every prior source/asset/API/data/configuration boundary. Reuse both original supplied PNGs byte-for-byte; add no new image assets or dependencies. |

## Stage 02 — UI architecture and verification

Reuse LoginPage and its existing \`.login-mobile-brand\` container. Add only the requested locale wordmark image; retain existing text nodes and behaviors. Scope new visual rules to mobile landing state, excluding the mobile form, registration and recovery screens. Reuse the established 900 px boundary, RTL/LTR behavior and selected locale/theme. Preserve desktop typography, 64 px desktop header and compact footer from the previous accepted release.

Verify the actual candidate JavaScript with all twenty existing production stylesheet links retained exactly and one new scoped mobile stylesheet. Do not publish the rebuilt global stylesheet. Compare desktop and mobile form geometry/content against the actual published baseline in Persian and English, white and blue themes. Exercise landing/form/back navigation and runtime locale/theme switching with isolated loopback fixtures. No real credentials, provider calls, production business writes or external seal service calls are required.

## Initial integrity and handoff

The unchanged baseline has 533 source files. Current entry is \`/assets/index-BUWCCQVs.js\`; all 909 public files and 368 private backend files are inventoried. API \`${apiId}\`, PID ${api.pid}, reports database up. The two wordmarks are already public and hash-verified. Original public index and configuration snapshots support preservation/rollback; environment evidence contains a hash only. Root source snapshots preserve the original files separately from the published candidate.

Evidence: \`reports/evidence/${task}/runtime-before.json\`, \`baseline.json\`, \`initial-candidate-manifest.json\`, \`root-initial-sources.json\`, \`assets-preservation.json\`, \`integrity-baseline.json\` and \`scope.json\`.
`;
  assert(!fs.existsSync(`${root}/${docPath}`));fs.writeFileSync(`${root}/${docPath}`,doc,{flag:'wx'});
  const scope={task,status:'IN_PROGRESS',activeStage:3,nextStage:3,scope:'Mobile login landing brand only <=900px: existing icon in main area, selected-locale original wordmark beneath, landing toolbar reflow. Preserve all desktop and mobile form behavior/layout and all unrelated UI/auth/data paths.',requirementsDocument:docPath,stages:Array.from({length:12},(_,i)=>({stage:i+1,status:i<2?'PASS':'PENDING',applicability:[4,5,6,7].includes(i+1)?'EXISTING_BOUNDARIES_PRESERVED':'SCOPED_FRONTEND_MAINTENANCE',...(i<2?{evidence:'Owner scope reconciled with current login markup, existing locale assets, responsive boundary and frozen source/runtime preservation baseline.'}:{})}))};
  fs.writeFileSync(`${evidence}/scope.json`,JSON.stringify(scope,null,2),{flag:'wx'});const state=read(`${root}/project-state.json`);state.loginMobileBranding20261023={...state.loginMobileBranding20261023,task,status:'IN_PROGRESS',activeStage:3,nextStage:3,completedStages:[1,2],scope:`reports/evidence/${task}/scope.json`,architecture:docPath,initialSourceManifest:`reports/evidence/${task}/initial-candidate-manifest.json`};fs.writeFileSync(`${root}/project-state.json`,JSON.stringify(state,null,2)+'\n');
  fs.writeFileSync(`${evidence}/integrity-baseline.json`,JSON.stringify({task,sourceFiles:533,publicFiles:909,privateBackendFiles:368,initialEntry:entries[0][1],priorStylesheetLinks:20,api,protected:'All desktop login and mobile form layout/content/handlers, every unrelated page/route/API/data/auth/dependency/configuration path and all previous source/public/private assets.',authorizedVisibilityChange:'Only the mobile landing toolbar brand and existing main-brand subtitle are visually hidden; their original nodes/assets/translations retained.',newImageAssets:0,privateEnvSnapshot:'HASH_ONLY_NO_SECRET_VALUES',stage01:'PASS',stage02:'PASS',implementation:'PENDING'},null,2),{flag:'wx'});
  protectedUnchanged(before);assert.deepEqual(await runtimeIdentity(),before.api);console.log(JSON.stringify({status:'BASELINE_PREPARED',task,candidate,sourceFiles:533,publicFiles:909,privateBackendFiles:368,entry:entries[0][1],apiPid:api.pid}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await prepare();
