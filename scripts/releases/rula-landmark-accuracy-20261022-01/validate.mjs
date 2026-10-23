import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { candidate, baseline, evidence, task, sha, read } from "./prepare.mjs";

const records = [];
const reportPath = `${evidence}/build-validation.json`;
function save(status = "RUNNING") {
  fs.writeFileSync(reportPath, JSON.stringify({ task, candidate, status, node: process.version, checks: records }, null, 2));
}
async function run(name, cwd, args) {
  const log = `${evidence}/${name}.log`;
  const record = { name, command: [process.execPath, ...args], cwd, log, status: "RUNNING", startedAt: new Date().toISOString() };
  records.push(record);
  save();
  const started = performance.now();
  const output = fs.openSync(log, "w");
  const code = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd, env: process.env, windowsHide: true, shell: false, stdio: ["ignore", output, output] });
    child.once("error", error => { fs.writeSync(output, `Command process error: ${error.code ?? "UNKNOWN"}\n`); resolve(-1); });
    child.once("close", value => resolve(value ?? -1));
  });
  fs.closeSync(output);
  Object.assign(record, { exitCode: code, status: code === 0 ? "PASS" : "FAIL", elapsedMs: Math.round(performance.now() - started) });
  save();
  console.log(JSON.stringify({ name, status: record.status, exitCode: code }));
  return code === 0;
}
function runtimeFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    const full = path.join(directory, item.name);
    return item.isDirectory() ? runtimeFiles(full) : item.isFile() && item.name.endsWith(".js") && !item.name.endsWith(".test.js") ? [full] : [];
  });
}

assert(fs.existsSync(`${evidence}/candidate.json`), "Prepare the frozen candidate first");
assert(!fs.existsSync(reportPath), "Validation report already exists; retain evidence before rerunning after a repair");
save();
const domain = await run("domain-build", `${candidate}/shared/domain`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]);
if (!domain) { save("FAIL"); process.exit(1); }
const results = await Promise.all([
  (async () => {
    const tests = await run("backend-tests", `${candidate}/backend`, ["node_modules/vitest/vitest.mjs", "run", "src", "test", "--configLoader", "runner", "--maxWorkers=2", "--reporter=json", `--outputFile=${evidence}/backend-tests-final.json`]);
    const types = await run("backend-typecheck-lint", `${candidate}/backend`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit"]);
    const build = await run("backend-build", `${candidate}/backend`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]);
    return tests && types && build;
  })(),
  (async () => {
    const tests = await run("frontend-tests", `${candidate}/frontend`, ["node_modules/vitest/vitest.mjs", "run", "src", "--configLoader", "runner", "--maxWorkers=2", "--reporter=json", `--outputFile=${evidence}/frontend-tests-final.json`]);
    const types = await run("frontend-typecheck-lint", `${candidate}/frontend`, ["node_modules/typescript/bin/tsc", "-b", "--noEmit"]);
    const compile = await run("frontend-compile", `${candidate}/frontend`, ["node_modules/typescript/bin/tsc", "-b"]);
    const build = compile && await run("frontend-build", `${candidate}/frontend`, ["node_modules/vite/bin/vite.js", "build", "--configLoader", "runner"]);
    return tests && types && build;
  })(),
]);

const candidateManifest = read(`${evidence}/candidate.json`);
for (const file of candidateManifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256, `Frozen source mutated during validation: ${file.path}`);
const changedRuntimeModules = runtimeFiles(`${candidate}/backend/dist`).flatMap(file => {
  const relative = path.relative(`${candidate}/backend/dist`, file).replaceAll("\\", "/");
  const previous = `${baseline}/backend/dist/${relative}`;
  return !fs.existsSync(previous) || sha(file) !== sha(previous) ? [{ path: relative, sha256: sha(file), status: fs.existsSync(previous) ? "CHANGED" : "NEW" }] : [];
});
const removedRuntimeModules = runtimeFiles(`${baseline}/backend/dist`).filter(file => !fs.existsSync(`${candidate}/backend/dist/${path.relative(`${baseline}/backend/dist`, file)}`));
const tests = ["backend", "frontend"].map(scope => {
  const file = `${evidence}/${scope}-tests-final.json`;
  const result = read(file);
  return { scope, success: result.success, total: result.numTotalTests, passed: result.numPassedTests, failed: result.numFailedTests, pending: result.numPendingTests };
});
assert.equal(removedRuntimeModules.length, 0, "A prior runtime module disappeared");
fs.writeFileSync(`${evidence}/runtime-module-diff.json`, JSON.stringify({ task, baseline, candidate, changedRuntimeModules, removedRuntimeModules }, null, 2));
const status = results.every(Boolean) && tests.every(test => test.success && test.failed === 0 && test.pending === 0) ? "PASS" : "FAIL";
save(status);
const final = read(reportPath);
fs.writeFileSync(reportPath, JSON.stringify({ ...final, tests, changedRuntimeModules, removedRuntimeModules, frozenSourceHashesMatch: true }, null, 2));
console.log(JSON.stringify({ status, tests, changedRuntimeModules: changedRuntimeModules.map(file => file.path) }));
process.exit(status === "PASS" ? 0 : 1);
