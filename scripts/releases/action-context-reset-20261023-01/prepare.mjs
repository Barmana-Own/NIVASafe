import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {sha,read,files,liveFiles,hashText} from '../rula-connected-overlay-20261022-01/prepare.mjs';
import {runtimeIdentity as apiIdentity} from '../rula-photo-side-values-20261022-01/prepare.mjs';
export {sha,read,files,liveFiles,hashText};
export const root='C:/NIVASafe',task='action-context-reset-20261023-01',id=`release-${task}`;
export const work=`${root}/.local/${task}`,evidence=`${root}/reports/evidence/${task}`,candidate=`${work}/candidate`;
export const baseline=`${root}/.local/ai-text-connection-20261023-01/candidate`,live='C:/inetpub/nivasafe/app-com';
export const apiId='release-ai-text-connection-20261023-01',apiRoot=`C:/ProgramData/NIVASafe/releases/${apiId}/backend`;
export const config=`${root}/deployment/ecosystem.config.cjs`,proxy='C:/Runtime/nginx/conf/nginx.conf';
export const sourcePath='frontend/src/features/actions/ActionsPage.tsx',testPath='frontend/tests/e2e/actions-create-reset.spec.ts';
export const runtimeIdentity=()=>apiIdentity(apiId);
export function frozen(){const manifest=read(`${evidence}/candidate.json`);for(const file of manifest.files)assert.equal(sha(`${candidate}/${file.path}`),file.sha256,`Frozen input changed ${file.path}`);return manifest;}
export function protectedUnchanged(before,allowIndex=false){for(const [file,hash] of [[`${root}/.env`,before.envSha256],[config,before.configSha256],[proxy,before.proxySha256]])assert.equal(sha(file),hash);for(const file of before.staticFiles)if(!(allowIndex&&file.path==='index.html'))assert.equal(sha(`${live}/${file.path}`),file.sha256);for(const file of before.backendFiles)assert.equal(sha(`${apiRoot}/${file.path}`),file.sha256);}
async function prepare(){
 fs.mkdirSync(work,{recursive:true});fs.mkdirSync(evidence,{recursive:true});assert(!fs.existsSync(candidate));
 for(const file of read(`${root}/reports/evidence/ai-text-connection-20261023-01/candidate.json`).files)assert.equal(sha(`${baseline}/${file.path}`),file.sha256);
 const before={at:new Date().toISOString(),api:await runtimeIdentity(),envSha256:sha(`${root}/.env`),configSha256:sha(config),proxySha256:sha(proxy),indexSha256:sha(`${live}/index.html`),staticFiles:liveFiles(live).map(file=>({path:file,sha256:sha(`${live}/${file}`)})),backendFiles:[...['src','dist','prisma','python'].flatMap(dir=>liveFiles(`${apiRoot}/${dir}`).filter(file=>!file.includes('__pycache__')).map(file=>`${dir}/${file}`)),'package.json','tsconfig.json','vitest.config.ts'].map(file=>({path:file,sha256:sha(`${apiRoot}/${file}`)}))};
 fs.writeFileSync(`${evidence}/runtime-before.json`,JSON.stringify(before,null,2),{flag:'wx'});fs.copyFileSync(`${live}/index.html`,`${work}/index.before.html`,fs.constants.COPYFILE_EXCL);
 const skip=new Set(['node_modules','dist','.turbo','.vite-cache','__pycache__','playwright-results','playwright-report']);const filter=source=>!skip.has(path.basename(source))&&!source.endsWith('.tsbuildinfo')&&!path.basename(source).startsWith('.env');
 // Frontend source-contract tests read backend files. Retain the complete
 // sanitized frozen tree as test fixtures; only frontend artifacts publish.
 fs.cpSync(baseline,candidate,{recursive:true,filter});
 for(const file of [sourcePath,testPath]){fs.mkdirSync(path.dirname(`${work}/before/${file}`),{recursive:true});fs.copyFileSync(`${baseline}/${file}`,`${work}/before/${file}`);fs.copyFileSync(`${root}/${file}`,`${candidate}/${file}`);}
 const modified=files(candidate).filter(file=>!fs.existsSync(`${baseline}/${file}`)||sha(`${candidate}/${file}`)!==sha(`${baseline}/${file}`));assert.deepEqual(modified.sort(),[sourcePath,testPath].sort());
 const ts=createRequire(`${root}/frontend/package.json`)('typescript');
 const tags=source=>{const entries=[];const ast=ts.createSourceFile('ActionsPage.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const visit=node=>{if(ts.isJsxOpeningElement(node)||ts.isJsxClosingElement(node)||ts.isJsxSelfClosingElement(node))entries.push(`${node.kind}:${node.tagName.getText(ast)}`);ts.forEachChild(node,visit);};visit(ast);return entries.sort();};assert.deepEqual(tags(fs.readFileSync(`${candidate}/${sourcePath}`,'utf8')),tags(fs.readFileSync(`${baseline}/${sourcePath}`,'utf8')),'No UI elements may be added/removed');
 for(const dir of ['', 'frontend','backend','shared/domain'])fs.symlinkSync(`${root}/${dir?`${dir}/`:''}node_modules`,`${candidate}/${dir?`${dir}/`:''}node_modules`,'junction');
 const manifest={task,id,baseline,modified,approvedRuntimeSource:[sourcePath],rootSourceAfterSha256:sha(`${root}/${sourcePath}`),testSha256:sha(`${root}/${testPath}`),noNewProductUi:true,backendChanged:false,databaseChanged:false,files:files(candidate).map(file=>({path:file,sha256:sha(`${candidate}/${file}`)}))};fs.writeFileSync(`${evidence}/candidate.json`,JSON.stringify(manifest,null,2),{flag:'wx'});
 fs.writeFileSync(`${evidence}/scope.json`,JSON.stringify({task,status:'IN_PROGRESS',scope:'Reset submitted corrective-action project/assessment/risk selections only after successful creation. Preserve failures, pending different drafts, other tab and independent list filters.',stages:Array.from({length:12},(_,index)=>({stage:index+1,status:index<3?'PASS':'PENDING',applicability:[4,5,6,7].includes(index+1)?'EXISTING_BACKEND_PERSISTENCE_API_AUTH_PRESERVED':'SCOPED_MAINTENANCE'}))},null,2));
 const state=read(`${root}/project-state.json`);state.actionContextReset20261023={...state.actionContextReset20261023,task,status:'IN_PROGRESS',activeStage:3,scope:`reports/evidence/${task}/scope.json`};fs.writeFileSync(`${root}/project-state.json`,JSON.stringify(state,null,2)+'\n');
 console.log(JSON.stringify({status:'PREPARED_FROZEN',task,modified,sourceFiles:manifest.files.length,frontendFiles:before.staticFiles.length,api:before.api.version}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await prepare();
