import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,task,work,evidence,sha,read} from './prepare.mjs';
const manifest=read(`${evidence}/candidate.json`);
assert.equal(sha(`${root}/frontend/src/styles.css`),manifest.rootStylesAfterSha256);
assert.equal(sha(`${work}/root-styles.before.css`),manifest.rootStylesBeforeSha256);
const destinations=[`${work}-attempt-01-half-width-actions`,`${evidence}-attempt-01-half-width-actions`];
for(const [index,source] of [work,evidence].entries()){
 const parent=path.resolve(index===0?`${root}/.local`:`${root}/reports/evidence`)+path.sep;
 for(const target of [source,destinations[index]])assert(path.resolve(target).startsWith(parent),'Archive target must remain inside the named task workspace');
 assert(!fs.existsSync(destinations[index]));
}
fs.writeFileSync(`${root}/frontend/src/styles.css`,fs.readFileSync(`${work}/root-styles.before.css`));
fs.renameSync(work,destinations[0]);fs.renameSync(evidence,destinations[1]);
console.log(JSON.stringify({status:'OLD_ATTEMPT_PRESERVED',reason:'Manual1440px screenshot review found an awkward midword activation label wrap despite16passing functional checks. Buttons will span the card width without smaller text.',archivedWork:destinations[0],archivedEvidence:destinations[1],sourceBeforeRestored:true,liveUntouched:true}));
