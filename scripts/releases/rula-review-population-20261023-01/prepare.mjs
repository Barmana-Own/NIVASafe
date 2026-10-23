import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {sha,read,files,liveFiles,hashText,powershell} from '../rula-connected-overlay-20261022-01/prepare.mjs';
import {runtimeIdentity as apiIdentity} from '../rula-photo-side-values-20261022-01/prepare.mjs';
export {sha,read,files,liveFiles,hashText,powershell};
export const root='C:/NIVASafe',task='rula-review-population-20261023-01',id=`release-${task}`,work=`${root}/.local/${task}`,evidence=`${root}/reports/evidence/${task}`,candidate=`${work}/candidate`;
export const baseline=`${root}/.local/rula-cancel-hide-20261023-01/candidate`,live='C:/inetpub/nivasafe/app-com',oldApiVersion='release-ai-text-connection-20261023-01',oldApiRoot=`C:/ProgramData/NIVASafe/releases/${oldApiVersion}/backend`,config=`${root}/deployment/ecosystem.config.cjs`,proxy='C:/Runtime/nginx/conf/nginx.conf';
export const runtimeIdentity=(version=oldApiVersion)=>apiIdentity(version);
export const cssPath=`${work}/review-tables.css`;
export function frozen(){const m=read(`${evidence}/candidate.json`);for(const f of m.files)assert.equal(sha(`${candidate}/${f.path}`),f.sha256,`Frozen source changed ${f.path}`);return m;}
export function protectedUnchanged(before,allowIndex=false,allowConfig=false){assert.equal(sha(`${root}/.env`),before.envSha256);assert.equal(sha(proxy),before.proxySha256);if(!allowConfig)assert.equal(sha(config),before.configSha256);for(const f of before.staticFiles)if(!(allowIndex&&f.path==='index.html'))assert.equal(sha(`${live}/${f.path}`),f.sha256);for(const f of before.backendFiles)assert.equal(sha(`${oldApiRoot}/${f.path}`),f.sha256);}
async function prepare(){
 fs.mkdirSync(work,{recursive:true});fs.mkdirSync(evidence,{recursive:true});assert(!fs.existsSync(candidate));
 const prior=read(`${root}/reports/evidence/rula-cancel-hide-20261023-01/candidate.json`);for(const f of prior.files)assert.equal(sha(`${baseline}/${f.path}`),f.sha256);
 const before={at:new Date().toISOString(),api:await runtimeIdentity(),envSha256:sha(`${root}/.env`),configSha256:sha(config),proxySha256:sha(proxy),indexSha256:sha(`${live}/index.html`),staticFiles:liveFiles(live).map(p=>({path:p,sha256:sha(`${live}/${p}`)})),backendFiles:[...['src','dist','prisma','python'].flatMap(d=>liveFiles(`${oldApiRoot}/${d}`).filter(f=>!f.includes('__pycache__')).map(f=>`${d}/${f}`)),'package.json','tsconfig.json','vitest.config.ts'].map(p=>({path:p,sha256:sha(`${oldApiRoot}/${p}`)}))};
 assert.equal(before.indexSha256,read(`${root}/reports/evidence/rula-cancel-hide-20261023-01/deployment.json`).newIndexSha256);
 fs.writeFileSync(`${evidence}/runtime-before.json`,JSON.stringify(before,null,2),{flag:'wx'});fs.copyFileSync(`${live}/index.html`,`${work}/index.before.html`,fs.constants.COPYFILE_EXCL);fs.copyFileSync(config,`${work}/ecosystem.before.cjs`,fs.constants.COPYFILE_EXCL);
 const skip=new Set(['node_modules','dist','.turbo','.vite-cache','__pycache__','playwright-results','playwright-report']);const filter=s=>!skip.has(path.basename(s))&&!s.endsWith('.tsbuildinfo')&&!path.basename(s).startsWith('.env');fs.cpSync(baseline,candidate,{recursive:true,filter});
 // The API baseline is the actual running private release, not an older frontend snapshot.
 for(const directory of ['src','prisma','python'])fs.cpSync(`${oldApiRoot}/${directory}`,`${candidate}/backend/${directory}`,{recursive:true,filter});
 for(const p of ['package.json','tsconfig.json','vitest.config.ts'])fs.copyFileSync(`${oldApiRoot}/${p}`,`${candidate}/backend/${p}`);
 for(const dir of ['','frontend','backend','shared/domain'])fs.symlinkSync(`${root}/${dir?`${dir}/`:''}node_modules`,`${candidate}/${dir?`${dir}/`:''}node_modules`,'junction');
 const baselineFiles=files(candidate).map(p=>({path:p,sha256:sha(`${candidate}/${p}`)}));fs.writeFileSync(`${evidence}/baseline.json`,JSON.stringify({task,frontendBaseline:baseline,backendBaseline:oldApiRoot,files:baselineFiles},null,2),{flag:'wx'});
 const scope={task,status:'IN_PROGRESS',activeStage:1,scope:'Populate existing RULA review tables from real per-image/per-side AI suggestions; distinguish completed unavailable results from waiting; independent group/initial-summary values; apply only evidenced force/muscle adjustments; repair only group A/B table separators, nowrap compact typography and horizontal overflow. Preserve measurement-quality and human-confirmation/save gates, consent, tenant boundaries, all other UI and data.',limitations:['Unobservable angles, load and repetition cannot be fabricated or inferred solely from a still photograph.'],stages:Array.from({length:12},(_,i)=>({stage:i+1,status:'PENDING'}))};fs.writeFileSync(`${evidence}/scope.json`,JSON.stringify(scope,null,2));
 const state=read(`${root}/project-state.json`);state.rulaReviewPopulation20261023={...state.rulaReviewPopulation20261023,task,status:'IN_PROGRESS',activeStage:1,scope:`reports/evidence/${task}/scope.json`};fs.writeFileSync(`${root}/project-state.json`,JSON.stringify(state,null,2)+'\n');
 fs.writeFileSync(`${evidence}/integrity-baseline.json`,JSON.stringify({task,frontendFiles:prior.files.length,baselineFiles:baselineFiles.length,publicFiles:before.staticFiles.length,backendFiles:before.backendFiles.length,protected:'All existing routes, pages, APIs, consent/auth/tenant/save gates, assets, data paths and prior releases; no schema or dependency change intended.'},null,2));console.log(JSON.stringify({task,status:'BASELINE_PREPARED',candidate,sourceFiles:baselineFiles.length,publicFiles:before.staticFiles.length,api:before.api.version}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await prepare();
