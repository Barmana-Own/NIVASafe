import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { task, candidate, evidence, backendBaseline, sha, read } from "./prepare.mjs";
const revision = `${evidence}/attempt-01-missing-contract-fixtures`;
fs.mkdirSync(revision); const prior = read(`${evidence}/candidate.json`);
for (const file of prior.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
for (const file of ["candidate.json", "build-validation.json", "backend-tests-final.json", "domain-build.log", "domain-tests.log", "backend-tests.log"]) fs.renameSync(`${evidence}/${file}`, `${revision}/${file}`);
const testPrerequisites = ["deployment/ecosystem.config.cjs", "docker-compose.yml", "scripts/probe-efficient-vision-model.mjs"].map(file => {
  assert(!fs.existsSync(`${candidate}/${file}`)); fs.mkdirSync(path.dirname(`${candidate}/${file}`), { recursive: true }); fs.copyFileSync(`${backendBaseline}/${file}`, `${candidate}/${file}`);
  return { path: file, sha256: sha(`${candidate}/${file}`), unchangedSource: `${backendBaseline}/${file}`, purpose: "Existing full-suite read-only source contract fixture; not published" };
});
const manifest = { ...prior, testPrerequisites, files: [...prior.files, ...testPrerequisites.map(({ path, sha256 }) => ({ path, sha256 }))].sort((a,b) => a.path.localeCompare(b.path)) };
fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(manifest, null, 2), { flag: "wx" });
fs.writeFileSync(`${evidence}/test-fixture-repair.json`, JSON.stringify({ status: "REPAIRED_HARNESS_NOT_APPLICATION", task, priorCandidateManifestSha256: sha(`${revision}/candidate.json`), candidateManifestSha256: sha(`${evidence}/candidate.json`), failedTests: 4, passedTestsBeforeRepair: 845, reason: "Frozen test baseline omitted three existing read-only deployment/probe source contract fixtures", applicationSourceChanged: false, testAssertionsChanged: false, runtimeConfigurationChanged: false, testPrerequisites, rerun: "Entire validation required" }, null, 2));
console.log(JSON.stringify({ status: "REPAIRED_TEST_PREREQUISITES", files: testPrerequisites.map(file => file.path) }));
