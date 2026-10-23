import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {sha,read,files,liveFiles,hashText} from '../rula-connected-overlay-20261022-01/prepare.mjs';
import {runtimeIdentity as apiIdentity} from '../rula-photo-side-values-20261022-01/prepare.mjs';
export {sha,read,files,liveFiles,hashText};
export const root='C:/NIVASafe',task='rula-cancel-hide-20261023-01',id=`release-${task}`;
export const work=`${root}/.local/${task}`,evidence=`${root}/reports/evidence/${task}`,candidate=`${work}/candidate`;
export const baseline=`${root}/.local/assistant-chat-density-20261023-01/candidate`,live='C:/inetpub/nivasafe/app-com';
export const apiId='release-ai-text-connection-20261023-01',apiRoot=`C:/ProgramData/NIVASafe/releases/${apiId}/backend`;
export const config=`${root}/deployment/ecosystem.config.cjs`,proxy='C:/Runtime/nginx/conf/nginx.conf';
export const cssPath=`${work}/rula-cancel-hide.css`;
export const runtimeIdentity=()=>apiIdentity(apiId);
export function frozen(){const manifest=read(`${evidence}/candidate.json`);for(const file of manifest.files)assert.equal(sha(`${candidate}/${file.path}`),file.sha256,`Frozen input changed ${file.path}`);assert.equal(sha(cssPath),manifest.cssSupplementSha256);return manifest;}
export function protectedUnchanged(before,allowIndex=false){for(const [file,hash] of [[`${root}/.env`,before.envSha256],[config,before.configSha256],[proxy,before.proxySha256]])assert.equal(sha(file),hash);for(const file of before.staticFiles)if(!(allowIndex&&file.path==='index.html'))assert.equal(sha(`${live}/${file.path}`),file.sha256);for(const file of before.backendFiles)assert.equal(sha(`${apiRoot}/${file.path}`),file.sha256);}
async function prepare(){
 fs.mkdirSync(work,{recursive:true});fs.mkdirSync(evidence,{recursive:true});assert(!fs.existsSync(candidate));
 for(const file of read(`${root}/reports/evidence/assistant-chat-density-20261023-01/candidate.json`).files)assert.equal(sha(`${baseline}/${file.path}`),file.sha256);
 const before={at:new Date().toISOString(),api:await runtimeIdentity(),envSha256:sha(`${root}/.env`),configSha256:sha(config),proxySha256:sha(proxy),indexSha256:sha(`${live}/index.html`),staticFiles:liveFiles(live).map(file=>({path:file,sha256:sha(`${live}/${file}`)})),backendFiles:[...['src','dist','prisma','python'].flatMap(dir=>liveFiles(`${apiRoot}/${dir}`).filter(file=>!file.includes('__pycache__')).map(file=>`${dir}/${file}`)),'package.json','tsconfig.json','vitest.config.ts'].map(file=>({path:file,sha256:sha(`${apiRoot}/${file}`)}))};
 fs.writeFileSync(`${evidence}/runtime-before.json`,JSON.stringify(before,null,2),{flag:'wx'});fs.copyFileSync(`${live}/index.html`,`${work}/index.before.html`,fs.constants.COPYFILE_EXCL);
 const skip=new Set(['node_modules','dist','.turbo','.vite-cache','__pycache__','playwright-results','playwright-report']);
 fs.cpSync(baseline,candidate,{recursive:true,filter:source=>!skip.has(path.basename(source))&&!source.endsWith('.tsbuildinfo')&&!path.basename(source).startsWith('.env')});
 const css=fs.readFileSync(`${root}/scripts/releases/${task}/cancel-button.css`,'utf8');assert(!/@import|url\(|expression\(|javascript:/iu.test(css));
 fs.writeFileSync(cssPath,css,{flag:'wx'});fs.copyFileSync(`${root}/frontend/src/styles.css`,`${work}/root-styles.before.css`,fs.constants.COPYFILE_EXCL);
 for(const directory of [candidate,root]){const filename=`${directory}/frontend/src/styles.css`;assert(!fs.readFileSync(filename,'utf8').includes('Owner-requested cancellation-button styling, retained while its UI is temporarily hidden.'));fs.appendFileSync(filename,`\n${css}`);}
 const modified=files(candidate).filter(file=>!fs.existsSync(`${baseline}/${file}`)||sha(`${candidate}/${file}`)!==sha(`${baseline}/${file}`));assert.deepEqual(modified,['frontend/src/styles.css']);
 for(const dir of ['', 'frontend','backend','shared/domain'])fs.symlinkSync(`${root}/${dir?`${dir}/`:''}node_modules`,`${candidate}/${dir?`${dir}/`:''}node_modules`,'junction');
 const manifest={task,id,baseline,modified,cssOnly:true,javaScriptUnchanged:true,backendChanged:false,databaseChanged:false,cssSupplement:cssPath,cssSupplementSha256:sha(cssPath),rootStylesBeforeSha256:sha(`${work}/root-styles.before.css`),rootStylesAfterSha256:sha(`${root}/frontend/src/styles.css`),files:files(candidate).map(file=>({path:file,sha256:sha(`${candidate}/${file}`)}))};fs.writeFileSync(`${evidence}/candidate.json`,JSON.stringify(manifest,null,2),{flag:'wx'});
 const scope={task,status:'IN_PROGRESS',scope:'Only style and temporarily hide the two existing Cancel image analysis controls in the RULA loading note and image review. Preserve analysis/cancellation handlers, queue, requests, image cards, progress/error/retry and all unrelated UI/backend/API/auth/data.',baselineFrontendRelease:'release-assistant-chat-density-20261023-01',stages:Array.from({length:12},(_,i)=>({stage:i+1,status:i<3?'PASS':'PENDING',applicability:[4,5,6,7].includes(i+1)?'EXISTING_BOUNDARIES_PRESERVED':'SCOPED_CSS_MAINTENANCE'}))};fs.writeFileSync(`${evidence}/scope.json`,JSON.stringify(scope,null,2));
 const state=read(`${root}/project-state.json`);state.rulaCancelHide20261023={...state.rulaCancelHide20261023,task,status:'IN_PROGRESS',activeStage:3,scope:`reports/evidence/${task}/scope.json`};fs.writeFileSync(`${root}/project-state.json`,JSON.stringify(state,null,2)+'\n');
 fs.writeFileSync(`${evidence}/integrity-baseline.json`,JSON.stringify({status:'PRESERVE',task,sourceManifest:sha(`${evidence}/candidate.json`),protectedSource:'Every baseline file except appended frontend/src/styles.css is byte-identical; no JSX, route, API, persistence, auth or existing asset removed.',liveFiles:before.staticFiles.length,privateBackendFiles:before.backendFiles.length,api:before.api.version},null,2));
 console.log(JSON.stringify({status:'PREPARED_FROZEN',task,modified,files:manifest.files.length,staticFiles:before.staticFiles.length,api:before.api.version}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await prepare();
