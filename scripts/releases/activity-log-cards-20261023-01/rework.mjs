import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,work,evidence,sha,read} from './prepare.mjs';
const manifest=read(`${evidence}/candidate.json`);
assert.equal(sha(`${root}/frontend/src/styles.css`),manifest.rootStylesAfterSha256);
assert.equal(sha(`${work}/root-styles.before.css`),manifest.rootStylesBeforeSha256);
for(const [source,parent] of [[work,`${root}/.local`],[evidence,`${root}/reports/evidence`]]){
 const target=`${source}-attempt-01-dense-table-preflight`;
 for(const item of [source,target])assert(path.resolve(item).startsWith(path.resolve(parent)+path.sep));
 assert(!fs.existsSync(target));
}
fs.writeFileSync(`${root}/frontend/src/styles.css`,fs.readFileSync(`${work}/root-styles.before.css`));
fs.renameSync(work,`${work}-attempt-01-dense-table-preflight`);fs.renameSync(evidence,`${evidence}-attempt-01-dense-table-preflight`);
console.log('Preserved the initial prepared source; scoped important minimum-width override corrects the existing dense-table cascade before build/browser checks. Live files untouched.');
