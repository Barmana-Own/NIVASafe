import fs from "node:fs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { root, task, candidate, baseline, evidence, sha, read, files } from "./prepare.mjs";

const report = `${evidence}/build-validation.json`;
assert(fs.existsSync(`${evidence}/candidate.json`), "Prepare the frozen candidate first");
assert(!fs.existsSync(report), "Preserve earlier validation evidence before running a repair");
const manifest = read(`${evidence}/candidate.json`);
const checks = [];
function frozen() {
  for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256, `Frozen source changed: ${file.path}`);
  for (const file of read(`${evidence}/test-contract-sources.json`).files) {
    assert.equal(sha(`${candidate}/${file.path}`), file.sha256, `Frozen backend test contract changed: ${file.path}`);
    assert.equal(sha(`${baseline}/${file.path}`), file.sha256, `Backend test contract differs from the verified baseline: ${file.path}`);
  }
}
function save(status, extra = {}) {
  fs.writeFileSync(report, JSON.stringify({ task, status, candidate, node: process.version, checks, ...extra }, null, 2));
}
async function run(name, args, cwd = `${candidate}/frontend`) {
  const log = `${evidence}/${name}.log`;
  const record = { name, command: [process.execPath, ...args], cwd, log, status: "RUNNING", startedAt: new Date().toISOString() };
  checks.push(record); save("RUNNING");
  const descriptor = fs.openSync(log, "wx");
  const start = performance.now();
  const exitCode = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd, env: process.env, windowsHide: true, shell: false, stdio: ["ignore", descriptor, descriptor] });
    child.once("error", error => { fs.writeSync(descriptor, `Command execution failed: ${error.code ?? "UNKNOWN"}\n`); resolve(-1); });
    child.once("close", code => resolve(code ?? -1));
  });
  fs.closeSync(descriptor);
  Object.assign(record, { status: exitCode === 0 ? "PASS" : "FAIL", exitCode, elapsedMs: Math.round(performance.now() - start) });
  save("RUNNING");
  console.log(JSON.stringify({ name, status: record.status, exitCode }));
  return exitCode === 0;
}

frozen();
const baselineDomain = read(`${baseline}/shared/domain/package.json`);
const existingDomain = read(`${root}/shared/domain/package.json`);
const normalizedDomain = structuredClone(existingDomain);
normalizedDomain.scripts.test = baselineDomain.scripts.test;
normalizedDomain.devDependencies.vitest = baselineDomain.devDependencies.vitest;
assert.deepEqual(normalizedDomain, baselineDomain, "Existing domain runtime manifest differs from the verified baseline");
const domainManifestDifference = { status: "EXISTING_TEST_METADATA_ONLY", baseline: { test: baselineDomain.scripts.test, vitest: baselineDomain.devDependencies.vitest }, existing: { test: existingDomain.scripts.test, vitest: existingDomain.devDependencies.vitest }, candidateUsesFrozenManifest: true, runtimeExportsIdentical: true };
if (fs.existsSync(`${evidence}/domain-dependency-preflight.json`)) assert.deepEqual(read(`${evidence}/domain-dependency-preflight.json`), domainManifestDifference);
else fs.writeFileSync(`${evidence}/domain-dependency-preflight.json`, JSON.stringify(domainManifestDifference, null, 2));
for (const file of files(`${baseline}/shared/domain`).filter(file => file !== "package.json")) assert.equal(sha(`${root}/shared/domain/${file}`), sha(`${baseline}/shared/domain/${file}`), "Existing domain dependency source differs from the verified baseline");
for (const file of files(`${baseline}/shared/domain/dist`)) assert.equal(sha(`${root}/shared/domain/dist/${file}`), sha(`${baseline}/shared/domain/dist/${file}`), "Existing domain build differs from the verified baseline");
const domainOk = await run("domain-build", ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"], `${candidate}/shared/domain`);
assert(domainOk, "Build the unchanged shared domain before running frontend imports");
const testsOk = await run("frontend-tests", ["node_modules/vitest/vitest.mjs", "run", "src", "--configLoader", "runner", "--maxWorkers=2", "--reporter=json", `--outputFile=${evidence}/frontend-tests-final.json`]);
const typesOk = await run("frontend-typecheck-lint", ["node_modules/typescript/bin/tsc", "-b", "--noEmit"]);
const compileOk = await run("frontend-compile", ["node_modules/typescript/bin/tsc", "-b"]);
const buildOk = compileOk && await run("frontend-build", ["node_modules/vite/bin/vite.js", "build", "--configLoader", "runner"]);
frozen();
const testResult = read(`${evidence}/frontend-tests-final.json`);
const tests = { total: testResult.numTotalTests, passed: testResult.numPassedTests, failed: testResult.numFailedTests, pending: testResult.numPendingTests, success: testResult.success };
const status = testsOk && typesOk && compileOk && buildOk && tests.success && tests.failed === 0 && tests.pending === 0 ? "PASS" : "FAIL";
const artifacts = buildOk ? files(`${candidate}/frontend/dist`).map(file => ({ path: file, sha256: sha(`${candidate}/frontend/dist/${file}`) })) : [];
save(status, { tests, artifacts, frozenSourceHashesMatch: true, sharedDomainUnchanged: true, backendValidation: "NOT_RUN_FRONTEND_ONLY_CHANGE", frontendLintCommand: "tsc -b --noEmit (repository lint script)", noDependenciesChanged: true });
console.log(JSON.stringify({ status, tests, artifacts: artifacts.length }));
process.exit(status === "PASS" ? 0 : 1);
