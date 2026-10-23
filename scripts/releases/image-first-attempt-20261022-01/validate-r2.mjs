import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { task, candidate, baseline, evidence, sha, read, files, manifestPath } from "./prepare-r2.mjs";

const reportPath = `${evidence}/build-validation-r2.json`, testsPath = `${evidence}/backend-tests-r2.json`;
const records = [], manifest = read(manifestPath), ui = read(manifest.frontendUnchangedEvidence);
function verifyFrozen() {
  for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256, `Frozen r2 source changed: ${file.path}`);
  for (const file of manifest.preservedV1Evidence) assert.equal(sha(file.path), file.sha256, `Prior immutable evidence changed: ${file.path}`);
  for (const file of ui.sourceFiles) assert.equal(sha(`${ui.source}/${file.path}`), file.sha256, `Baseline frontend source changed: ${file.path}`);
  for (const file of ui.staticFiles) assert.equal(sha(`${ui.staticRoot}/${file.path}`), file.sha256, `Published frontend asset changed: ${file.path}`);
  const dependency = manifest.nodeDependencyAddition;
  assert.equal(sha(dependency.proofPath), dependency.proofSha256, "Dependency installation evidence changed");
  for (const file of dependency.files) assert.equal(sha(`${dependency.packagePath}/${file.path}`), file.sha256, `Pinned Undici artifact changed: ${file.path}`);
  const candidateRequire = createRequire(`${candidate}/backend/package.json`);
  assert.equal(candidateRequire("undici/package.json").version, dependency.version, "Candidate resolves another Undici version");
  assert.equal(fs.realpathSync(candidateRequire.resolve("undici/package.json")), fs.realpathSync(`${dependency.packagePath}/package.json`), "Candidate dependency artifact is not the pinned installation");
}
function save(status = "RUNNING", extra = {}) {
  fs.writeFileSync(reportPath, JSON.stringify({ task, revision: 2, candidate, baseline, status, node: process.version, checks: records, ...extra }, null, 2));
}
async function run(name, cwd, args) {
  const log = `${evidence}/${name}-r2.log`, record = { name, command: [process.execPath, ...args], cwd, log, status: "RUNNING", startedAt: new Date().toISOString() };
  records.push(record); save();
  const started = performance.now(), fd = fs.openSync(log, "w");
  const exitCode = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd, env: process.env, shell: false, windowsHide: true, stdio: ["ignore", fd, fd] });
    child.once("error", error => { fs.writeSync(fd, `Process launch failed: ${error.code ?? "UNKNOWN"}\n`); resolve(-1); });
    child.once("close", code => resolve(code ?? -1));
  });
  fs.closeSync(fd);
  Object.assign(record, { status: exitCode === 0 ? "PASS" : "FAIL", exitCode, elapsedMs: Math.round(performance.now() - started) });
  save(); console.log(JSON.stringify({ name, revision: 2, status: record.status, exitCode }));
  return exitCode === 0;
}
const runtimeFiles = directory => files(directory, "", false).filter(file => file.endsWith(".js") && !file.endsWith(".test.js"));

assert(!fs.existsSync(reportPath) && !fs.existsSync(testsPath), "Preserve existing revision validation evidence before rerunning");
try {
  verifyFrozen(); save();
  assert(await run("domain-build", `${candidate}/shared/domain`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]), "Shared build failed");
  const [testsOk, typesOk] = await Promise.all([
    run("backend-tests", `${candidate}/backend`, ["node_modules/vitest/vitest.mjs", "run", "src", "test", "--configLoader", "runner", "--maxWorkers=2", "--reporter=json", `--outputFile=${testsPath}`]),
    run("backend-typecheck-lint", `${candidate}/backend`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit"]),
  ]);
  const buildOk = typesOk && await run("backend-build", `${candidate}/backend`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]);
  assert(testsOk && typesOk && buildOk, "Backend revision validation failed; see retained r2 logs");
  verifyFrozen();
  const compiled = runtimeFiles(`${candidate}/backend/dist`), prior = runtimeFiles(`${baseline}/backend/dist`);
  const changedRuntimeModules = compiled.flatMap(relative => {
    const old = `${baseline}/backend/dist/${relative}`, current = `${candidate}/backend/dist/${relative}`;
    return !fs.existsSync(old) || sha(old) !== sha(current) ? [{ path: relative, sha256: sha(current), status: fs.existsSync(old) ? "CHANGED" : "NEW" }] : [];
  });
  const removedRuntimeModules = prior.filter(relative => !compiled.includes(relative));
  assert.deepEqual(changedRuntimeModules.map(file => file.path).sort(), manifest.expectedChangedRuntimeModules.slice().sort(), "Unexpected compiled revision scope");
  assert.deepEqual(removedRuntimeModules, [], "Prior runtime module disappeared");
  for (const file of runtimeFiles(`${candidate}/shared/domain/dist`)) assert.equal(sha(`${candidate}/shared/domain/dist/${file}`), sha(`${baseline}/shared/domain/dist/${file}`), "Shared runtime changed");
  const test = read(testsPath); assert(test.success && test.numFailedTests === 0 && test.numPendingTests === 0, "Required backend tests did not all pass");
  const tests = [{ scope: "backend", success: test.success, total: test.numTotalTests, passed: test.numPassedTests, failed: test.numFailedTests, pending: test.numPendingTests }];
  const frontend = { status: ui.previousTests.status, priorPassed: ui.previousTests.passed, rerun: "NOT_RUN: backend-only connection/diagnostic repair; frontend source, static assets and API contracts unchanged", sourceFilesVerified: ui.sourceFiles.length, staticFilesVerified: ui.staticFiles.length };
  fs.writeFileSync(`${evidence}/runtime-module-diff-r2.json`, JSON.stringify({ task, revision: 2, baseline, candidate, changedRuntimeModules, removedRuntimeModules }, null, 2));
  save("PASS", { tests, frontend, changedRuntimeModules, removedRuntimeModules, frozenSourceHashesMatch: true, priorV1CandidateAndEvidenceUnchanged: true, pythonSchemaOtherDependenciesAndSharedDomainUnchanged: true, onlyNodeDependencyAddition: "undici@6.29.1", functionalAcceptance: "NOT_RUN: separate root-controlled live acceptance required" });
  console.log(JSON.stringify({ status: "PASS", revision: 2, tests, changedRuntimeModules: changedRuntimeModules.map(file => file.path), frontend }));
} catch (error) {
  save("FAIL", { failure: error.message }); console.log(JSON.stringify({ status: "FAIL", revision: 2, error: error.message })); process.exitCode = 1;
}
