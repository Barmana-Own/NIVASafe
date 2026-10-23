import fs from "node:fs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { task, evidence, candidate, oldApiRoot, sha, read, files, liveFiles } from "./prepare.mjs";
const manifest = read(`${evidence}/candidate.json`), report = `${evidence}/build-validation.json`, checks = [];
assert(!fs.existsSync(report), "Preserve prior validation evidence before rerunning");
function frozen() { for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256, `Frozen input changed: ${file.path}`); }
function save(status, extra = {}) { fs.writeFileSync(report, JSON.stringify({ task, status, node: process.version, candidateManifestSha256: sha(`${evidence}/candidate.json`), checks, ...extra }, null, 2)); }
async function run(name, directory, args, extraEnv = {}) {
  const log = `${evidence}/${name}.log`, fd = fs.openSync(log, "wx");
  const record = { name, command: [process.execPath, ...args], cwd: directory, log, startedAt: new Date().toISOString(), status: "RUNNING" };
  checks.push(record); save("RUNNING"); const started = performance.now();
  const code = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd: directory, env: { ...process.env, ...extraEnv }, shell: false, windowsHide: true, stdio: ["ignore", fd, fd] });
    child.once("error", error => { fs.writeSync(fd, `Execution failed: ${error.code ?? "UNKNOWN"}`); resolve(-1); }); child.once("close", value => resolve(value ?? -1));
  });
  fs.closeSync(fd); Object.assign(record, { status: code === 0 ? "PASS" : "FAIL", exitCode: code, elapsedMs: Math.round(performance.now() - started) });
  save("RUNNING"); console.log(JSON.stringify({ name, status: record.status })); return code === 0;
}
try {
  frozen();
  assert(await run("domain-build", `${candidate}/shared/domain`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]));
  assert(await run("domain-tests", `${candidate}/shared/domain`, ["node_modules/vitest/vitest.mjs", "run", "src", "--maxWorkers=2"]));
  assert(await run("backend-tests", `${candidate}/backend`, ["node_modules/vitest/vitest.mjs", "run", "src", "test", "--configLoader", "runner", "--maxWorkers=2", "--reporter=json", `--outputFile=${evidence}/backend-tests-final.json`]));
  assert(await run("frontend-tests", `${candidate}/frontend`, ["node_modules/vitest/vitest.mjs", "run", "src", "--configLoader", "runner", "--maxWorkers=2", "--reporter=json", `--outputFile=${evidence}/frontend-tests-final.json`]));
  const typeResults = await Promise.all([
    run("backend-typecheck-lint", `${candidate}/backend`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit"]),
    run("frontend-typecheck-lint", `${candidate}/frontend`, ["node_modules/typescript/bin/tsc", "-b", "--noEmit"]),
    run("prisma-schema-validate", `${candidate}/backend`, ["node_modules/prisma/build/index.js", "validate", "--schema", "prisma/schema.prisma"], { DATABASE_URL: "mysql://unused@127.0.0.1:53306/schema_validation_only" }),
  ]); assert(typeResults.every(Boolean));
  assert(await run("backend-build", `${candidate}/backend`, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"]));
  assert(await run("frontend-compile", `${candidate}/frontend`, ["node_modules/typescript/bin/tsc", "-b"]));
  assert(await run("frontend-build", `${candidate}/frontend`, ["node_modules/vite/bin/vite.js", "build", "--configLoader", "runner"]));
  frozen(); const summaries = {};
  for (const scope of ["backend", "frontend"]) { const result = read(`${evidence}/${scope}-tests-final.json`); assert(result.success && !result.numFailedTests); summaries[scope] = { total: result.numTotalTests, passed: result.numPassedTests, failed: result.numFailedTests, pending: result.numPendingTests }; }
  const runtime = liveFiles(`${candidate}/backend/dist`).filter(file => file.endsWith(".js") && !file.endsWith(".test.js"));
  const changedRuntimeModules = runtime.filter(file => !fs.existsSync(`${oldApiRoot}/dist/${file}`) || sha(`${candidate}/backend/dist/${file}`) !== sha(`${oldApiRoot}/dist/${file}`));
  assert.deepEqual(changedRuntimeModules.sort(), manifest.expectedChangedRuntimeModules.slice().sort());
  for (const file of liveFiles(`${oldApiRoot}/dist`).filter(file => file.endsWith(".js") && !file.endsWith(".test.js"))) assert(runtime.includes(file), "Prior runtime module disappeared");
  const artifacts = ["backend/dist", "frontend/dist", "shared/domain/dist"].flatMap(directory => liveFiles(`${candidate}/${directory}`).map(file => ({ path: `${directory}/${file}`, sha256: sha(`${candidate}/${directory}/${file}`) })));
  save("PASS", { tests: summaries, changedRuntimeModules, artifacts, frozenSourceHashesMatch: true, dependenciesUnchanged: true, databaseSchemaUnchanged: true, databaseMigration: "NOT_APPLICABLE_NO_PERSISTENCE_SCHEMA_CHANGE" });
} catch (error) { save("FAIL", { error: error.message }); console.log(JSON.stringify({ status: "FAIL", error: error.message })); process.exitCode = 1; }
