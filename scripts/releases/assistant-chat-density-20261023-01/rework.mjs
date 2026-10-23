import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,work,evidence,sha,read} from './prepare.mjs';
const manifest=read(`${evidence}/candidate.json`),suffix='attempt-01-empty-placeholder';
assert.equal(sha(`${root}/frontend/src/styles.css`),manifest.rootStylesAfterSha256);assert.equal(sha(`${work}/root-styles.before.css`),manifest.rootStylesBeforeSha256);
for(const [source,parent] of [[work,`${root}/.local`],[evidence,`${root}/reports/evidence`]]){const target=`${source}-${suffix}`;for(const item of [source,target])assert(path.resolve(item).startsWith(path.resolve(parent)+path.sep));assert(!fs.existsSync(target));}
assert.equal(read(`${evidence}/e2e-validation.json`).status,'FAIL');
fs.writeFileSync(`${root}/frontend/src/styles.css`,fs.readFileSync(`${work}/root-styles.before.css`));fs.renameSync(work,`${work}-${suffix}`);fs.renameSync(evidence,`${evidence}-${suffix}`);
console.log('Preserved the first frozen source, successful build,14/15 browser result and320px diagnostic. Only this task CSS append restored; source author retains the isolated empty-placeholder repair. Live deployment untouched.');
