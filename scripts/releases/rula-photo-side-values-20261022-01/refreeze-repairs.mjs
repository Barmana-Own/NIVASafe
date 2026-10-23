import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { root, task, work, evidence, candidate, sha, read } from "./prepare.mjs";
const approval = read(`${evidence}/source-repair-approval.json`), prior = read(`${evidence}/candidate.json`), contract = read(`${evidence}/contract-assertion-repair-applied.json`);
assert.equal(approval.task, task); assert.equal(contract.status, "APPLIED_TEST_ONLY_NEEDS_REFREEZE_AND_VALIDATION");
const testPath = "frontend/src/ui-rules.test.ts", afterTest = contract.targets.find(target => target.file === `${candidate}/${testPath}`);
assert(afterTest); assert.equal(sha(afterTest.file), afterTest.afterSha256);
for (const file of prior.files) if (file.path !== testPath) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
const revision = `${evidence}/attempt-02-contract-and-partial-snapshot-repair`; fs.mkdirSync(revision);
for (const file of ["candidate.json", "build-validation.json", "backend-tests-final.json", "frontend-tests-final.json", "domain-build.log", "domain-tests.log", "backend-tests.log", "frontend-tests.log"]) if (fs.existsSync(`${evidence}/${file}`)) fs.renameSync(`${evidence}/${file}`, `${revision}/${file}`);
const paths = new Map(prior.files.map(file => [file.path, file]));
paths.set(testPath, { path: testPath, sha256: sha(`${candidate}/${testPath}`) });
for (const file of approval.files) {
  assert(/^frontend\/src\/features\/assessments\/[A-Za-z0-9_.]+\.(?:ts|tsx)$/u.test(file.path));
  assert.equal(sha(`${root}/${file.path}`), file.sha256);
  fs.mkdirSync(path.dirname(`${candidate}/${file.path}`), { recursive: true }); fs.copyFileSync(`${root}/${file.path}`, `${candidate}/${file.path}`);
  paths.set(file.path, { path: file.path, sha256: file.sha256 });
}
const modified = [...new Set([...prior.modified, testPath, ...approval.files.map(file => file.path)])].sort();
const manifest = { ...prior, modified, repairs: { application: approval, contractAssertions: contract, previousManifestSha256: sha(`${revision}/candidate.json`) }, files: [...paths.values()].sort((a,b) => a.path.localeCompare(b.path)) };
fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(manifest, null, 2), { flag: "wx" });
const scope = read(`${evidence}/scope.json`); scope.candidateManifestSha256 = sha(`${evidence}/candidate.json`); scope.rework = [ ...(scope.rework ?? []), { ownerStages: [3,9], defects: ["Partial persisted side overrides leaked through a direct-side fallback", "Three RULA implementation-string contract cases and one pre-existing sidebar spelling assertion were obsolete"], repairs: "Hydrate existing persisted sides using their own explicit or original scalar fallback; strengthen exact test contracts without changing production behavior to satisfy old spellings", evidence: revision, newManifestSha256: sha(`${evidence}/candidate.json`) } ]; fs.writeFileSync(`${evidence}/scope.json`, JSON.stringify(scope, null, 2));
console.log(JSON.stringify({ status: "REFROZEN_REPAIRS", sourceFiles: manifest.files.length, modified }));
