import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,task,id,work,evidence,candidate,baseline,oldApiRoot,cssPath,files,sha,read} from './prepare.mjs';
const approval=read(`${evidence}/approved-changes.json`),before=read(`${evidence}/baseline.json`);assert(!fs.existsSync(`${evidence}/candidate.json`));
const old=new Map(before.files.map(f=>[f.path,f.sha256]));const css=fs.readFileSync(`${root}/scripts/releases/${task}/review-tables.css`,'utf8');assert(!/@import|url\(|expression\(|javascript:/iu.test(css));
const i18nPath='frontend/src/i18n.tsx';
function mergeTranslationKeys(current){const source=fs.readFileSync(`${candidate}/${i18nPath}`,'utf8');const blocks=[...source.matchAll(/(  "assessment\.rulaAutomaticAnalysisPending": [^\n]+\n)((?:  "assessment\.(?:rulaAnalysisSuggestionsAvailable|rulaAiReviewNotice)": [^\n]+\n){2})/gu)];assert.equal(blocks.length,2);assert(!current.includes('"assessment.rulaAnalysisSuggestionsAvailable":'));assert(!current.includes('"assessment.rulaAiReviewNotice":'));let merged=current;for(const block of blocks){assert.equal(merged.split(block[1]).length,2);merged=merged.replace(block[1],block[1]+block[2]);}return merged;}
for(const relative of approval.sourceFiles.filter(p=>p!=='frontend/src/styles.css')){const target=`${root}/${relative}`;if(fs.existsSync(target)){if(relative===i18nPath)mergeTranslationKeys(fs.readFileSync(target,'utf8'));else assert.equal(sha(target),old.get(relative),`Root has unrelated changes; merge explicitly before freezing: ${relative}`);}else assert(!old.has(relative));}
fs.copyFileSync(`${root}/frontend/src/styles.css`,`${work}/root-styles.before.css`,fs.constants.COPYFILE_EXCL);fs.writeFileSync(cssPath,css,{flag:'wx'});
for(const tree of [candidate,root])fs.appendFileSync(`${tree}/frontend/src/styles.css`,`\n${css}`);
const current=files(candidate);for(const p of old.keys())assert(current.includes(p),`Source removed: ${p}`);
const modified=current.filter(p=>!old.has(p)||sha(`${candidate}/${p}`)!==old.get(p));assert.deepEqual(modified.slice().sort(),approval.sourceFiles.slice().sort());
const rootSnapshots=[];
for(const relative of modified.filter(p=>p!=='frontend/src/styles.css')){
 assert(/^(?:frontend|backend)\/src\/[A-Za-z0-9_./-]+\.(?:ts|tsx)$/u.test(relative)&&!relative.split('/').includes('..'));
 const target=`${root}/${relative}`,original=`${work}/root-before/${relative}`;fs.mkdirSync(path.dirname(original),{recursive:true});
 if(fs.existsSync(target)){if(relative!==i18nPath)assert.equal(sha(target),old.get(relative),`Root has unrelated changes; merge explicitly before freezing: ${relative}`);fs.copyFileSync(target,original,fs.constants.COPYFILE_EXCL);}else assert(!old.has(relative));
 fs.mkdirSync(path.dirname(target),{recursive:true});if(relative===i18nPath)fs.writeFileSync(target,mergeTranslationKeys(fs.readFileSync(target,'utf8')));else fs.copyFileSync(`${candidate}/${relative}`,target);rootSnapshots.push({path:relative,beforeSha256:fs.existsSync(original)?sha(original):null,afterSha256:sha(target),...(relative===i18nPath?{unrelatedRootTranslationsPreserved:true}:{})});
}
for(const p of ['backend/prisma/schema.prisma','backend/package.json','frontend/package.json','pnpm-lock.yaml'])assert.equal(sha(`${candidate}/${p}`),old.get(p));
const manifest={task,id,baseline,backendBaseline:oldApiRoot,modified,approvedRuntimeSource:approval.runtimeSource,expectedChangedRuntimeModules:approval.expectedChangedRuntimeModules,backendChanged:true,databaseSchemaChanged:false,dependenciesChanged:false,cssSupplement:cssPath,cssSupplementSha256:sha(cssPath),rootStylesBeforeSha256:sha(`${work}/root-styles.before.css`),rootStylesAfterSha256:sha(`${root}/frontend/src/styles.css`),rootSnapshots,files:current.map(p=>({path:p,sha256:sha(`${candidate}/${p}`)}))};
fs.writeFileSync(`${evidence}/candidate.json`,JSON.stringify(manifest,null,2),{flag:'wx'});console.log(JSON.stringify({status:'FROZEN',task,modified,sourceFiles:current.length}));
