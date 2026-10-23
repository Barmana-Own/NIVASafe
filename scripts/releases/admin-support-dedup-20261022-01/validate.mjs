import fs from "node:fs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { task, candidate, evidence, sha, read, files } from "./prepare.mjs";
const manifest = read(`${evidence}/candidate.json`), report = `${evidence}/build-validation.json`, checks = [];
assert(!fs.existsSync(report));
function frozen() { for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256); }
async function run(name, args, cwd) {
  const log = `${evidence}/${name}.log`, descriptor = fs.openSync(log, "wx");
  const code = await new Promise(resolve => { const child = spawn(process.execPath, args, { cwd, env: process.env, windowsHide: true, shell: false, stdio: ["ignore", descriptor, descriptor] }); child.once("error", () => resolve(-1)); child.once("close", value => resolve(value ?? -1)); });
  fs.closeSync(descriptor); checks.push({ name, command: [process.execPath, ...args], cwd, log, status: code === 0 ? "PASS" : "FAIL", exitCode: code });
  console.log(JSON.stringify(checks.at(-1))); assert.equal(code, 0, `${name} failed`);
}
try {
  frozen();
  await run("domain-build", ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"], `${candidate}/shared/domain`);
  await run("frontend-support-admin-tests", ["node_modules/vitest/vitest.mjs", "run", "src/features/admin/adminWorkspace.test.tsx", "src/features/support/supportWorkspace.test.tsx", "src/features/support/supportModel.test.ts", "--configLoader", "runner"], `${candidate}/frontend`);
  await run("frontend-typecheck-lint", ["node_modules/typescript/bin/tsc", "-b", "--noEmit"], `${candidate}/frontend`);
  await run("frontend-compile", ["node_modules/typescript/bin/tsc", "-b"], `${candidate}/frontend`);
  await run("frontend-build", ["node_modules/vite/bin/vite.js", "build", "--configLoader", "runner"], `${candidate}/frontend`);
  frozen();
  const artifacts = files(`${candidate}/frontend/dist`).map(file => ({ path: `frontend/dist/${file}`, sha256: sha(`${candidate}/frontend/dist/${file}`) }));
  fs.writeFileSync(report, JSON.stringify({ status: "PASS", task, candidateManifestSha256: sha(`${evidence}/candidate.json`), checks, artifacts, backendChecks: "NOT_RUN_BACKEND_UNCHANGED", fullSourceContractSuite: "NOT_RUN_FRONTEND_ONLY_FROZEN_BASELINE_LACKS_BACKEND_CONTRACT_FIXTURES" }, null, 2), { flag: "wx" });
} catch (error) { fs.writeFileSync(report, JSON.stringify({ status: "FAIL", task, checks, error: error.message }, null, 2), { flag: "wx" }); process.exitCode = 1; }
