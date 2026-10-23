import fs from "node:fs";
import assert from "node:assert/strict";
import { root, task, candidate, evidence, sha, read, files } from "./prepare.mjs";

assert(process.argv.includes("--test-fixtures-ready"));
const manifestPath = `${evidence}/candidate.json`;
const previous = read(manifestPath);
const oldManifestSha256 = sha(manifestPath);
for (const file of previous.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
const build = read(`${evidence}/build-validation.json`);
assert.equal(build.status, "PASS");
for (const file of build.artifacts) assert.equal(sha(`${candidate}/frontend/dist/${file.path}`), file.sha256);
const changed = ["frontend/tests/e2e/actions-card-layout.spec.ts", "frontend/tests/e2e/actions-create-reset.spec.ts"];
assert(!fs.existsSync(`${evidence}/test-fixture-repair.json`));
fs.copyFileSync(manifestPath, `${evidence}/candidate-before-test-fixture-repair.json`, fs.constants.COPYFILE_EXCL);
for (const file of changed) {
  const source = fs.readFileSync(`${root}/${file}`, "utf8");
  assert(source.includes('path === "/me/ai-quota"'), "Real quota contract fixture is missing");
  fs.copyFileSync(`${root}/${file}`, `${candidate}/${file}`);
}
const next = { ...previous, files: previous.files.map(file => changed.includes(file.path) ? { ...file, sha256: sha(`${candidate}/${file.path}`) } : file) };
const actual = files(candidate).filter(file => !file.startsWith("frontend/tests/e2e/assets/") && !["frontend/tests/e2e/fixtures.ts", "frontend/tests/e2e/testData.ts"].includes(file));
assert.deepEqual(actual, next.files.map(file => file.path).sort());
for (const file of next.files.filter(file => !changed.includes(file.path))) assert.equal(sha(`${candidate}/${file.path}`), file.sha256, "Production or unrelated source changed");
fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2));
const prerequisitesPath = `${evidence}/e2e-test-prerequisites.json`;
const prerequisites = read(prerequisitesPath);
assert.equal(prerequisites.candidateManifestSha256, oldManifestSha256);
for (const file of prerequisites.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
fs.copyFileSync(prerequisitesPath, `${evidence}/e2e-test-prerequisites-before-fixture-repair.json`, fs.constants.COPYFILE_EXCL);
fs.writeFileSync(prerequisitesPath, JSON.stringify({ ...prerequisites, candidateManifestSha256: sha(manifestPath) }, null, 2));
const result = { status: "VERIFIED_TEST_CONTRACT_REPAIR", task, at: new Date().toISOString(), changed, oldCandidateManifestSha256: oldManifestSha256, candidateManifestSha256: sha(manifestPath), unchangedProductionFiles: next.files.length - changed.length, productionArtifactsChanged: false, buildValidationSha256: sha(`${evidence}/build-validation.json`), reason: "Supply the existing quota banner's real response contract in synthetic browser mocks; preserve every production input and previously validated artifact." };
fs.writeFileSync(`${evidence}/test-fixture-repair.json`, JSON.stringify(result, null, 2), { flag: "wx" });
console.log(JSON.stringify(result));
