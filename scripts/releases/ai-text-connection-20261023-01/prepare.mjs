import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {sha,read,files,liveFiles,runtimeIdentity} from '../rula-photo-side-values-20261022-01/prepare.mjs';
export {sha,read,files,liveFiles,runtimeIdentity};
export const root='C:/NIVASafe', task='ai-text-connection-20261023-01', id=`release-${task}`;
export const work=`${root}/.local/${task}`,candidate=`${work}/candidate`,evidence=`${root}/reports/evidence/${task}`;
export const oldId='release-rula-photo-side-values-20261022-01',oldBackend=`C:/ProgramData/NIVASafe/releases/${oldId}/backend`;
export const live='C:/inetpub/nivasafe/app-com',config=`${root}/deployment/ecosystem.config.cjs`,proxy='C:/Runtime/nginx/conf/nginx.conf';
export function frozen(){const manifest=read(`${evidence}/candidate.json`);for(const file of manifest.files)assert.equal(sha(`${candidate}/${file.path}`),file.sha256,`Frozen file changed ${file.path}`);return manifest;}
export function preserve(before,allowConfig=false){assert.equal(sha(`${root}/.env`),before.envSha256);assert.equal(sha(proxy),before.proxySha256);if(!allowConfig)assert.equal(sha(config),before.configSha256);for(const file of before.staticFiles)assert.equal(sha(`${live}/${file.path}`),file.sha256,`Frontend changed ${file.path}`);}
async function prepare(){
 fs.mkdirSync(work,{recursive:true});fs.mkdirSync(evidence,{recursive:true});assert(!fs.existsSync(candidate));
 const previous=`${root}/.local/rula-photo-side-values-20261022-01/candidate`;
 for(const file of read(`${root}/reports/evidence/rula-photo-side-values-20261022-01/candidate.json`).files)assert.equal(sha(`${previous}/${file.path}`),file.sha256);
 const before={at:new Date().toISOString(),api:await runtimeIdentity(oldId),envSha256:sha(`${root}/.env`),proxySha256:sha(proxy),configSha256:sha(config),staticFiles:liveFiles(live).map(file=>({path:file,sha256:sha(`${live}/${file}`)})),backendFiles:['src','dist','prisma','python'].flatMap(directory=>liveFiles(`${oldBackend}/${directory}`).filter(file=>!file.includes('__pycache__')).map(file=>({path:`${directory}/${file}`,sha256:sha(`${oldBackend}/${directory}/${file}`)})))};
 fs.writeFileSync(`${evidence}/runtime-before.json`,JSON.stringify(before,null,2),{flag:'wx'});
 const skip=new Set(['node_modules','dist','.turbo','.vite-cache','__pycache__','playwright-results','playwright-report']);
 fs.cpSync(previous,candidate,{recursive:true,filter:source=>!skip.has(path.basename(source))&&!source.endsWith('.tsbuildinfo')&&!path.basename(source).startsWith('.env')});
 const changed=['backend/src/ai-provider.ts','backend/src/ai-provider.test.ts'];
 for(const file of changed){assert.equal(sha(`${previous}/${file}`),sha(`C:/ProgramData/NIVASafe/releases/${oldId}/${file}`));fs.mkdirSync(path.dirname(`${work}/before/${file}`),{recursive:true});fs.copyFileSync(`${previous}/${file}`,`${work}/before/${file}`);fs.copyFileSync(`${root}/${file}`,`${candidate}/${file}`);}
 for(const dir of ['', 'backend','frontend','shared/domain'])fs.symlinkSync(`${root}/${dir?`${dir}/`:''}node_modules`,`${candidate}/${dir?`${dir}/`:''}node_modules`,'junction');
 const prior=read(`${root}/reports/evidence/rula-photo-side-values-20261022-01/candidate.json`).files;
 for(const file of prior)if(!changed.includes(file.path))assert.equal(sha(`${candidate}/${file.path}`),file.sha256);
 const manifest={task,at:new Date().toISOString(),baseline:oldId,changedSource:changed,expectedChangedRuntimeModules:['ai-provider.js'],files:files(candidate).map(file=>({path:file,sha256:sha(`${candidate}/${file}`)}))};
 fs.writeFileSync(`${evidence}/candidate.json`,JSON.stringify(manifest,null,2),{flag:'wx'});
 fs.writeFileSync(`${evidence}/scope.json`,JSON.stringify({task,status:'IN_PROGRESS',scope:'Restore approved Arvan assessment TEXT connectivity using an independent bounded certificate-verified pool; no frontend/image/chat/model/credential/schema/authorization changes.',diagnostics:'reports/evidence/ai-availability-20261023-01',stages:[{stage:1,status:'PASS',evidence:'Live failure, readonly audits, native fetch vs strict TLS dispatcher differential.'},{stage:2,status:'PASS',evidence:'No product UI change; preserve all existing controls/assets.'},{stage:3,status:'PASS',applicability:'PRESERVATION_ONLY_NO_FRONTEND_CHANGE'},{stage:4,status:'IMPLEMENTED_PENDING_VALIDATION'},...Array.from({length:8},(_,index)=>({stage:index+5,status:'PENDING'}))],priorCommandFailure:{command:'vitest run backend/src/ai-provider.test.ts --config backend/vitest.config.ts from repository root',result:'NO_TEST_FILES_FOUND; corrected backend working directory, 91/91 PASS; no test changes required to repair invocation.'}},null,2));
 const state=read(`${root}/project-state.json`);state.aiTextConnection20261023={...state.aiTextConnection20261023,task,status:'IN_PROGRESS',activeStage:4,scope:`reports/evidence/${task}/scope.json`};fs.writeFileSync(`${root}/project-state.json`,JSON.stringify(state,null,2)+'\n');
 console.log(JSON.stringify({status:'PREPARED_FROZEN',task,sourceFiles:manifest.files.length,frontendFiles:before.staticFiles.length}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await prepare();
