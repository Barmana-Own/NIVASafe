import fs from "node:fs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { task, candidate, baseline, evidence, sha, read, files } from "./prepare.mjs";

const reportPath = `${evidence}/build-validation.json`;
const records = [];
const manifest = read(`${evidence}/candidate.json`);
const ui = read(`${evidence}/frontend-unchanged.json`);
function verifyFrozen() {
  for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256, `Frozen source changed: ${file.path}`);
  for (const file of ui.sourceFiles) assert.equal(sha(`${ui.source}/${file.path}`), file.sha256, `Baseline frontend source changed: ${file.path}`);
  for (const file of ui.staticFiles) assert.equal(sha(`${ui.staticRoot}/${file.path}`), file.sha256, `Published frontend static file changed: ${file.path}`);
  assert.equal(sha(ui.previousTests.path), ui.previousTests.sha256, "Referenced frontend validation changed");
}
function save(status = "RUNNING", extra = {}) {
  fs.writeFileSync(reportPath, JSON.stringify({ task, candidate, baseline, status, node: process.version, checks: records, ...extra }, null, 2));
}
async function run(name, cwd, args) {
  const log = `${evidence}/${name}.log`;
  const record = { name, command: [process.execPath, ...args], cwd, log, status: "RUNNING", startedAt: new Date().toISOString() };
  records.push(record); save();
  const started = performance.now(), fd = fs.openSync(log, "w");
  const exitCode = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd, env: process.env, shell: false, windowsHide: true, stdio: ["ignore", fd, fd] });
    child.once("error", error => { fs.writeSync(fd, `Process launch failed: ${error.code ?? "UNKNOWN"}\n`); resolve(-1); });
    child.once("close", code => resolve(code ?? -1));
  });
  fs.closeSync(fd);
  Object.assign(record, { status: exitCode === 0 ? "PASS" : "FAIL", exitCode, elapsedMs: Math.round(performance.now() - started) });
  save(); console.log(JSON.stringify({ name, status: record.status, exitCode }));
  return exitCode === 0;
}
const runtimeFiles = directory => files(directory, "", false).filter(file => file.endsWith(".js") && !file.endsWith(".test.js"));

assert(!fs.existsSync(reportPath), "Retain existing validation evidence before rerunning a repaired candidate");
try {
  verifyFrozen(); save();
  const domain = await run("domain-build", `${candidate}/shared/domain`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]);
  assert(domain, "Shared domain build failed");
  const [testsOk, typesOk] = await Promise.all([
    run("backend-tests", `${candidate}/backend`, ["node_modules/vitest/vitest.mjs", "run", "src", "test", "--configLoader", "runner", "--maxWorkers=2", "--reporter=json", `--outputFile=${evidence}/backend-tests-final.json`]),
    run("backend-typecheck-lint", `${candidate}/backend`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit"]),
  ]);
  const buildOk = typesOk && await run("backend-build", `${candidate}/backend`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]);
  assert(testsOk && typesOk && buildOk, "Backend validation failed; see retained logs");
  verifyFrozen();
  const compiled = runtimeFiles(`${candidate}/backend/dist`), prior = runtimeFiles(`${baseline}/backend/dist`);
  const changedRuntimeModules = compiled.flatMap(relative => {
    const old = `${baseline}/backend/dist/${relative}`, current = `${candidate}/backend/dist/${relative}`;
    return !fs.existsSync(old) || sha(old) !== sha(current) ? [{ path: relative, sha256: sha(current), status: fs.existsSync(old) ? "CHANGED" : "NEW" }] : [];
  });
  const removedRuntimeModules = prior.filter(relative => !compiled.includes(relative));
  assert.deepEqual(changedRuntimeModules.map(file => file.path).sort(), manifest.expectedChangedRuntimeModules.slice().sort(), "Unexpected compiled runtime scope");
  assert.deepEqual(removedRuntimeModules, [], "A baseline runtime module disappeared");
  for (const file of runtimeFiles(`${candidate}/shared/domain/dist`)) assert.equal(sha(`${candidate}/shared/domain/dist/${file}`), sha(`${baseline}/shared/domain/dist/${file}`), "Shared domain runtime changed");
  const test = read(`${evidence}/backend-tests-final.json`);
  assert(test.success && test.numFailedTests === 0 && test.numPendingTests === 0, "Required backend tests did not all pass");
  const tests = [{ scope: "backend", success: test.success, total: test.numTotalTests, passed: test.numPassedTests, failed: test.numFailedTests, pending: test.numPendingTests }];
  const frontend = { status: ui.previousTests.status, priorPassed: ui.previousTests.passed, rerun: ui.rerun, sourceFilesVerified: ui.sourceFiles.length, staticFilesVerified: ui.staticFiles.length };
  fs.writeFileSync(`${evidence}/runtime-module-diff.json`, JSON.stringify({ task, baseline, candidate, changedRuntimeModules, removedRuntimeModules }, null, 2));
  save("PASS", { tests, frontend, changedRuntimeModules, removedRuntimeModules, frozenSourceHashesMatch: true, pythonSchemaDependenciesAndSharedDomainUnchanged: true });
  console.log(JSON.stringify({ status: "PASS", tests, changedRuntimeModules: changedRuntimeModules.map(file => file.path), frontend }));
} catch (error) {
  save("FAIL", { failure: error.message });
  console.log(JSON.stringify({ status: "FAIL", error: error.message }));
  process.exitCode = 1;
}
