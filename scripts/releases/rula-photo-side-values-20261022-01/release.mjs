import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { root, task, id, work, evidence, candidate, live, config, oldApiRoot, oldApiVersion, sha, read, hashText, files, liveFiles, preserve, runtimeIdentity, powershell } from "./prepare.mjs";
import { frontendPlan } from "./plan.mjs";
import { assertApiRuntimeIdentity } from "../assessment-image-activation-20261022-01/runtime-identity.mjs";
const require = createRequire(import.meta.url);
process.env.PM2_HOME = "C:/ProgramData/NIVASafe/pm2";
const pm2 = require("C:/Runtime/node/node_modules/pm2");
const call = (method, ...args) => new Promise((resolve, reject) => pm2[method](...args, (error, result) => error ? reject(new Error(`Managed ${method} failed`)) : resolve(result)));
const releaseRoot = `C:/ProgramData/NIVASafe/releases/${id}/backend`, backup = `C:/ProgramData/NIVASafe/backups/${id}`;
let apiSwitched = false, indexSwitched = false;
let rollbackIndexBytes, rollbackConfigBytes;
function atomic(file, bytes) { const temporary = `${file}.${task}.tmp`; fs.writeFileSync(temporary, bytes, { flag: "wx" }); fs.renameSync(temporary, file); }
function restrict(directory) { const result = spawnSync("icacls.exe", [directory, "/inheritance:r", "/grant:r", "*S-1-5-18:(OI)(CI)F", "*S-1-5-32-544:(OI)(CI)F"], { windowsHide: true, encoding: "utf8" }); assert.equal(result.status, 0, "Private artifact ACL failed"); }
async function health(version) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { const response = await fetch("http://127.0.0.1:5044/api/v1/health", { signal: AbortSignal.timeout(800) }); const result = await response.json(); if (response.ok && result.data?.version === version && result.data.database === "up") return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Expected API health/version did not become ready");
}
async function restart(version) {
  delete require.cache[require.resolve(config)]; const app = require(config).apps.find(app => app.name === "nivasafe-api"); assert.equal(app.env.APP_VERSION, version);
  const previous = (await call("list")).find(process => process.name === app.name); assert(previous);
  await new Promise((resolve, reject) => pm2.Client.executeRemote("restartProcessId", { id: previous.pm_id, env: { ...app.env, current_conf: { script: app.script, pm_exec_path: app.script, pm_cwd: app.cwd, exec_interpreter: app.interpreter } } }, error => error ? reject(new Error("Managed API restart failed")) : resolve()));
  await health(version); const active = (await call("list")).find(process => process.name === app.name);
  const actual = powershell(`$rulaProcess=Get-CimInstance Win32_Process -Filter 'ProcessId = ${Number(active.pid)}'; [pscustomobject]@{ProcessId=$rulaProcess.ProcessId;CommandLine=$rulaProcess.CommandLine;ListenerPids=@(Get-NetTCPConnection -State Listen -LocalPort 5044 | Select-Object -ExpandProperty OwningProcess -Unique)} | ConvertTo-Json -Compress`);
  assert.equal(actual.ListenerPids.length, 1); assertApiRuntimeIdentity(active, app, actual, actual.ListenerPids[0]);
  return { pid: active.pid, entry: active.pm2_env.pm_exec_path, version, commandLine: actual.CommandLine, database: "up" };
}
async function publicBytes(url, bytes) { const response = await fetch(`https://app.nivasafe.com${url}`, { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(15000) }); assert.equal(response.status, 200); assert(Buffer.from(await response.arrayBuffer()).equals(bytes), "Public artifact bytes differ"); }
try {
  assert(process.argv.includes("--deploy")); assert(!fs.existsSync(`${evidence}/deployment.json`));
  const manifest = read(`${evidence}/candidate.json`), build = read(`${evidence}/build-validation.json`), browser = read(`${evidence}/e2e-validation.json`), contracts = read(`${evidence}/contract-validation.json`), review = read(`${evidence}/security-review.json`), before = read(`${evidence}/runtime-before.json`);
  for (const gate of [build, browser, contracts, review]) { assert.equal(gate.status, "PASS"); assert.equal(gate.candidateManifestSha256, sha(`${evidence}/candidate.json`)); }
  assert.equal(review.buildEvidenceSha256, sha(`${evidence}/build-validation.json`));
  assert.equal(review.browserEvidenceSha256, sha(`${evidence}/e2e-validation.json`));
  assert.equal(review.contractEvidenceSha256, sha(`${evidence}/contract-validation.json`));
  assert.equal(contracts.buildEvidenceSha256, sha(`${evidence}/build-validation.json`)); assert.equal(contracts.browserEvidenceSha256, sha(`${evidence}/e2e-validation.json`));
  assert.equal(contracts.helperSha256, sha(`${root}/scripts/releases/${task}/contracts.mjs`));
  for (const helper of ["prepare.mjs", "freeze.mjs", "repair-test-fixtures.mjs", "repair-contract-assertions.mjs", "refreeze-repairs.mjs", "validate.mjs", "plan.mjs", "browser.mjs", "fixtures.mjs", "contracts.mjs", "release.mjs", "document.mjs", "finalize.mjs"]) assert.equal(sha(`${root}/scripts/releases/${task}/${helper}`), review.reviewedHelpersSha256[helper]);
  assert.equal(browser.helperSha256, sha(`${root}/scripts/releases/${task}/browser.mjs`));
  assert.equal(browser.fixturesSha256, sha(`${root}/scripts/releases/${task}/fixtures.mjs`));
  for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
  for (const file of build.artifacts) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
  assert.deepEqual(build.changedRuntimeModules.slice().sort(), manifest.expectedChangedRuntimeModules.slice().sort());
  assert.equal(sha(`${candidate}/backend/prisma/schema.prisma`), sha(`${oldApiRoot}/prisma/schema.prisma`));
  for (const file of files(`${oldApiRoot}/prisma/migrations`)) assert.equal(sha(`${candidate}/backend/prisma/migrations/${file}`), sha(`${oldApiRoot}/prisma/migrations/${file}`));
  preserve(before); assert.deepEqual(await runtimeIdentity(), before.api); assert(!fs.existsSync(releaseRoot) && !fs.existsSync(backup));
  await call("connect"); const processes = await call("list"), worker = processes.find(process => process.name === "nivasafe-worker");
  const workerIdentity = worker ? { pid: worker.pid, entry: worker.pm2_env.pm_exec_path } : null;
  const plan = frontendPlan(); assert.deepEqual(plan, read(`${evidence}/frontend-plan.json`));
  assert.equal(browser.hybridIndexSha256, plan.htmlSha256);
  assert.equal(sha(`${work}/test-index.html`), plan.htmlSha256);
  assert.equal(browser.frontendPlanSha256, sha(`${evidence}/frontend-plan.json`));
  assert.equal(review.frontendPlanSha256, sha(`${evidence}/frontend-plan.json`));
  fs.mkdirSync(releaseRoot, { recursive: true }); fs.mkdirSync(backup, { recursive: true }); restrict(releaseRoot); restrict(backup);
  fs.copyFileSync(config, `${backup}/ecosystem.config.cjs`, fs.constants.COPYFILE_EXCL); fs.copyFileSync(`${live}/index.html`, `${backup}/index.html`, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(`${backup}/ecosystem.config.cjs`), before.configSha256); assert.equal(sha(`${backup}/index.html`), before.indexSha256);
  rollbackIndexBytes = fs.readFileSync(`${backup}/index.html`); rollbackConfigBytes = fs.readFileSync(`${backup}/ecosystem.config.cjs`);
  assert.equal(hashText(rollbackIndexBytes), before.indexSha256); assert.equal(hashText(rollbackConfigBytes), before.configSha256);
  for (const directory of ["src", "dist", "prisma", "python"]) fs.cpSync(`${candidate}/backend/${directory}`, `${releaseRoot}/${directory}`, { recursive: true, filter: source => !source.includes("__pycache__") });
  for (const file of ["package.json", "tsconfig.json", "vitest.config.ts"]) fs.copyFileSync(`${candidate}/backend/${file}`, `${releaseRoot}/${file}`);
  fs.symlinkSync(`${oldApiRoot}/node_modules`, `${releaseRoot}/node_modules`, "junction");
  for (const directory of ["src", "dist", "prisma", "python"]) for (const file of liveFiles(`${candidate}/backend/${directory}`).filter(file => !file.includes("__pycache__"))) assert.equal(sha(`${candidate}/backend/${directory}/${file}`), sha(`${releaseRoot}/${directory}/${file}`));
  const originalConfig = fs.readFileSync(config, "utf8"), oldEntry = `${oldApiRoot}/dist/server.js`, newEntry = `${releaseRoot}/dist/server.js`;
  assert.equal(originalConfig.split(JSON.stringify(oldEntry)).length, 2); assert.equal(originalConfig.split(`APP_VERSION: ${JSON.stringify(oldApiVersion)},`).length, 2);
  const nextConfig = originalConfig.replace(JSON.stringify(oldEntry), JSON.stringify(newEntry)).replace(`APP_VERSION: ${JSON.stringify(oldApiVersion)},`, `APP_VERSION: ${JSON.stringify(id)},`);
  assert.equal(nextConfig.replace(JSON.stringify(newEntry), JSON.stringify(oldEntry)).replace(`APP_VERSION: ${JSON.stringify(id)},`, `APP_VERSION: ${JSON.stringify(oldApiVersion)},`), originalConfig);
  const current = new (require("node:module").Module)(config), proposed = new (require("node:module").Module)(config); current._compile(originalConfig, config); proposed._compile(nextConfig, config);
  const reverted = structuredClone(proposed.exports); const revertedApi = reverted.apps.find(app => app.name === "nivasafe-api"); revertedApi.script = oldEntry; revertedApi.env.APP_VERSION = oldApiVersion;
  assert.deepEqual(reverted, structuredClone(current.exports), "Only API entry/version may change");
  const addedAssets = [];
  for (const asset of plan.assets) { const source = `${candidate}/frontend/dist${asset.url}`, destination = `${live}${asset.url}`; assert.equal(sha(source), asset.sha256); if (fs.existsSync(destination)) assert.equal(sha(source), sha(destination)); else { fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL); addedAssets.push(asset.url); } }
  for (const asset of addedAssets) await publicBytes(asset, fs.readFileSync(`${live}${asset}`));
  preserve(before); atomic(config, nextConfig); apiSwitched = true; const api = await restart(id);
  const denials = [];
  for (const route of ["/api/v1/rula/posture-image-analysis", "/api/v1/rula/posture-analysis", "/api/v1/rula"]) { const response = await fetch(`https://app.nivasafe.com${route}`, { method: "POST", signal: AbortSignal.timeout(10000) }); assert.equal(response.status, 401); denials.push({ route, status: response.status }); }
  preserve(before, false, true); atomic(`${live}/index.html`, plan.html); indexSwitched = true; await publicBytes("/rula", Buffer.from(plan.html)); preserve(before, true, true); await health(id);
  const currentWorker = (await call("list")).find(process => process.name === "nivasafe-worker"); assert.deepEqual(currentWorker ? { pid: currentWorker.pid, entry: currentWorker.pm2_env.pm_exec_path } : null, workerIdentity);
  assert.equal(sha(config), hashText(nextConfig), "Managed configuration must retain exactly the reviewed entry/version change");
  await call("dump");
  const result = { status: "DEPLOYED", task, id, at: new Date().toISOString(), api, apiRestarted: true, workerUnchanged: workerIdentity, privateEnvironmentUnchanged: true, reverseProxyUnchanged: true, allPriorStaticAssetsRetained: true, preservedPriorStaticFiles: before.staticFiles.length - 1, preservedStylesheets: plan.preservedStylesheets, oldEntry: plan.oldEntry, newEntry: plan.newEntry, oldIndexSha256: before.indexSha256, newIndexSha256: sha(`${live}/index.html`), oldConfigSha256: before.configSha256, newConfigSha256: sha(config), addedAssets, changedRuntimeModules: build.changedRuntimeModules, databaseSchemaUnchanged: true, noDatabaseMigrationOrDataMutation: true, backup, rollbackIndex: `${backup}/index.html`, denials };
  fs.writeFileSync(`${evidence}/deployment.json`, JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify({ status: "DEPLOYED", task, api, newEntry: plan.newEntry, addedAssets: addedAssets.length }));
} catch (error) {
  let recovery = { status: "NOT_REQUIRED" };
  if (apiSwitched || indexSwitched) {
    const restored = {};
    if (indexSwitched) {
      try { assert(rollbackIndexBytes); atomic(`${live}/index.html`, rollbackIndexBytes); assert.equal(sha(`${live}/index.html`), hashText(rollbackIndexBytes)); restored.index = "PASS"; }
      catch { restored.index = "FAIL"; }
    }
    if (apiSwitched) {
      try { assert(rollbackConfigBytes); atomic(config, rollbackConfigBytes); assert.equal(sha(config), hashText(rollbackConfigBytes)); await restart(oldApiVersion); await call("dump"); restored.api = "PASS"; }
      catch { restored.api = "FAIL"; }
    }
    // A public network failure must never prevent restoring either local layer.
    try { assert(rollbackIndexBytes); await publicBytes("/rula", rollbackIndexBytes); restored.publicVerification = "PASS"; }
    catch { restored.publicVerification = "FAIL"; }
    recovery = { status: Object.values(restored).every(value => value === "PASS") ? "RESTORED_CODE" : "RECOVERY_REQUIRES_ATTENTION", noDatabaseChanges: true, restored };
  }
  const result = { status: "FAILED", task, error: error.message, recovery }; fs.writeFileSync(`${evidence}/deployment-failure-${Date.now()}.json`, JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify(result)); process.exitCode = 1;
} finally { pm2.disconnect(); }
