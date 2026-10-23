import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root='C:/NIVASafe',task='action-context-reset-20261023-01',work=`${root}/.local/${task}`,evidence=`${root}/reports/evidence/${task}`,archive=`${evidence}-attempt-01-missing-cross-tree-fixtures`;
for(const target of [work,evidence,archive])assert(path.resolve(target).toLowerCase().startsWith(path.resolve(root).toLowerCase()+path.sep));
assert.equal(JSON.parse(fs.readFileSync(`${evidence}/build-validation.json`)).status,'FAIL');assert(!fs.existsSync(archive)&&!fs.existsSync(`${work}/attempt-01-candidate`));
fs.renameSync(evidence,archive);fs.renameSync(`${work}/candidate`,`${work}/attempt-01-candidate`);fs.renameSync(`${work}/index.before.html`,`${work}/attempt-01-index.before.html`);
fs.copyFileSync(`${root}/scripts/releases/${task}/prepare.mjs`,`${archive}/prepare-source-before-fixture-repair.mjs`);
fs.writeFileSync(`${archive}/repair-context.json`,JSON.stringify({task,reason:'Frontend tests read frozen backend sources; frontend-only isolated copy omitted these read-only cross-tree fixtures. No application assertion changed.',archivedCandidate:`${work}/attempt-01-candidate`,sourceRework:'Includes final onChangeCapture FMEA draft hydration repair verified by source author.',repairedBy:'Prepare copies complete prior sanitized frozen baseline; deployment remains frontend-only.'},null,2));console.log(JSON.stringify({status:'FAILED_ATTEMPT_PRESERVED',archive}));
