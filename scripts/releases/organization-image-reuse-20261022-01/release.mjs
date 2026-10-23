import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { root, task, id, work, evidence, candidate, live, config, proxy, oldApiRoot, oldApiVersion, sha, read, files, runtimeIdentity } from "./prepare.mjs";
import { databaseConnection, backupDatabase } from "./database.mjs";
import { powershell } from "../rula-connected-overlay-20261022-01/prepare.mjs";
import { assertApiRuntimeIdentity } from "../assessment-image-activation-20261022-01/runtime-identity.mjs";

// powershell is imported from the runtime helper below; no credential is passed
// to a shell or printed in the release evidence.
const require = createRequire(import.meta.url);
process.env.PM2_HOME = "C:/ProgramData/NIVASafe/pm2";
const pm2 = require("C:/Runtime/node/node_modules/pm2");
const call = (method, ...args) => new Promise((resolve, reject) => pm2[method](...args, (error, result) => error ? reject(new Error(`Managed ${method} failed`)) : resolve(result)));
const releaseRoot = `C:/ProgramData/NIVASafe/releases/${id}/backend`, backup = `C:/ProgramData/NIVASafe/backups/${id}`;
let apiSwitched = false, indexSwitched = false;
const resuming = process.argv.includes("--resume");
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
  const previous = (await call("list")).find(process => process.name === app.name);
  await new Promise((resolve, reject) => pm2.Client.executeRemote("restartProcessId", { id: previous.pm_id, env: { ...app.env, current_conf: { script: app.script, pm_exec_path: app.script, pm_cwd: app.cwd, exec_interpreter: app.interpreter } } }, error => error ? reject(new Error("Managed API restart failed")) : resolve()));
  await health(version); const active = (await call("list")).find(process => process.name === app.name);
  const actual = powershell(`$taskProcess=Get-CimInstance Win32_Process -Filter 'ProcessId = ${Number(active.pid)}'; [pscustomobject]@{ProcessId=$taskProcess.ProcessId;CommandLine=$taskProcess.CommandLine;ListenerPids=@(Get-NetTCPConnection -State Listen -LocalPort 5044 | Select-Object -ExpandProperty OwningProcess -Unique)} | ConvertTo-Json -Compress`);
  assert.equal(actual.ListenerPids.length, 1); assertApiRuntimeIdentity(active, app, actual, actual.ListenerPids[0]);
  return { pid: active.pid, entry: active.pm2_env.pm_exec_path, version, commandLine: actual.CommandLine, database: "up" };
}
function entry(html) { const matches = [...html.matchAll(/<script\s+type="module"\s+crossorigin\s+src="([^"]+\.js)"><\/script>/gu)]; assert.equal(matches.length, 1); return matches[0][1]; }
function frontendPlan() {
  const original = fs.readFileSync(`${work}/index.before.html`, "utf8"), built = fs.readFileSync(`${candidate}/frontend/dist/index.html`, "utf8");
  const oldEntry = entry(original), newEntry = entry(built); assert.notEqual(oldEntry, newEntry);
  assert.equal(original.split(oldEntry).length, 2); const html = original.replace(oldEntry, newEntry); assert.equal(html.replace(newEntry, oldEntry), original);
  const candidateCss = built.match(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"/u)?.[1], visited = new Set();
  function visit(url) {
    if (visited.has(url)) return; assert(/^\/assets\/[A-Za-z0-9_-]+\.(?:js|css)$/u.test(url)); assert.notEqual(url, candidateCss);
    const source = `${candidate}/frontend/dist${url}`; assert(fs.statSync(source).isFile()); visited.add(url);
    if (url.endsWith(".css")) { assert(fs.existsSync(`${live}${url}`), "Route CSS must already exist in the protected live assets"); assert.equal(sha(source), sha(`${live}${url}`), "This repair cannot publish changed route CSS"); }
    for (const match of fs.readFileSync(source, "utf8").matchAll(/["'`](?:\.\/|\/)?((?:assets\/)?[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(?:js|css))["'`]/gu)) visit(`/assets/${path.posix.basename(match[1])}`);
  }
  visit(newEntry); return { html, oldEntry, newEntry, assets: [...visited], preservedStylesheets: original.match(/<link\s+rel="stylesheet"[^>]*>/gu) ?? [] };
}
async function publicBytes(url, bytes) { const response = await fetch(`https://app.nivasafe.com${url}`, { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(15000) }); assert.equal(response.status, 200, "Public artifact is unavailable"); assert(Buffer.from(await response.arrayBuffer()).equals(bytes), "Public artifact bytes differ"); }
function preserve(before, newIndex = false) {
  assert.equal(sha(`${root}/.env`), before.envSha256); assert.equal(sha(proxy), before.proxySha256);
  for (const file of before.staticFiles) if (!(newIndex && file.path === "index.html")) assert.equal(sha(`${live}/${file.path}`), file.sha256, "Prior static artifact changed");
}
try {
  assert(process.argv.includes("--deploy")); assert(!fs.existsSync(`${evidence}/deployment.json`));
  const manifest = read(`${evidence}/candidate.json`), build = read(`${evidence}/build-validation.json`), browser = read(`${evidence}/e2e-validation.json`), integration = read(`${evidence}/integration-validation.json`), review = read(`${evidence}/security-review.json`), before = read(`${evidence}/runtime-before.json`);
  for (const gate of [build, browser, integration, review]) { assert.equal(gate.status, "PASS"); assert.equal(gate.candidateManifestSha256, sha(`${evidence}/candidate.json`)); }
  for (const helper of ["prepare.mjs", "apply-source.mjs", "validate.mjs", "database.mjs", "release.mjs", "integration.mjs"]) assert.equal(sha(`${root}/scripts/releases/${task}/${helper}`), review.reviewedHelpersSha256[helper]);
  for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
  for (const file of build.artifacts) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
  assert.deepEqual(build.changedRuntimeModules.slice().sort(), manifest.expectedChangedRuntimeModules.slice().sort());
  assert.equal(sha(config), before.configSha256); preserve(before); assert.deepEqual(await runtimeIdentity(), before.api);
  await call("connect"); const processes = await call("list"), worker = processes.find(process => process.name === "nivasafe-worker");
  const workerIdentity = worker ? { pid: worker.pid, entry: worker.pm2_env.pm_exec_path } : null;
  const plan = frontendPlan();
  if (resuming) {
    assert(fs.existsSync(releaseRoot) && fs.existsSync(backup));
    assert.equal(sha(`${backup}/ecosystem.config.cjs`), before.configSha256); assert.equal(sha(`${backup}/index.html`), before.indexSha256);
    for (const directory of ["src", "dist", "prisma", "python"]) for (const file of files(`${candidate}/backend/${directory}`)) assert.equal(sha(`${candidate}/backend/${directory}/${file}`), sha(`${releaseRoot}/${directory}/${file}`));
    for (const file of ["package.json", "tsconfig.json", "vitest.config.ts"]) assert.equal(sha(`${candidate}/backend/${file}`), sha(`${releaseRoot}/${file}`));
    fs.renameSync(`${backup}/migration-output.private.txt`, `${backup}/migration-attempt-one.private.txt`);
  } else {
    assert(!fs.existsSync(releaseRoot) && !fs.existsSync(backup)); fs.mkdirSync(releaseRoot, { recursive: true }); fs.mkdirSync(backup, { recursive: true }); restrict(releaseRoot); restrict(backup);
    fs.copyFileSync(config, `${backup}/ecosystem.config.cjs`, fs.constants.COPYFILE_EXCL); fs.copyFileSync(`${live}/index.html`, `${backup}/index.html`, fs.constants.COPYFILE_EXCL);
    for (const directory of ["src", "dist", "prisma", "python"]) fs.cpSync(`${candidate}/backend/${directory}`, `${releaseRoot}/${directory}`, { recursive: true, filter: source => !source.includes("__pycache__") });
    for (const file of ["package.json", "tsconfig.json", "vitest.config.ts"]) fs.copyFileSync(`${candidate}/backend/${file}`, `${releaseRoot}/${file}`);
    fs.symlinkSync(`${oldApiRoot}/node_modules`, `${releaseRoot}/node_modules`, "junction");
  }
  for (const file of files(`${candidate}/backend/dist`)) assert.equal(sha(`${candidate}/backend/dist/${file}`), sha(`${releaseRoot}/dist/${file}`));
  const databaseBackup = resuming ? read(`${evidence}/database-backup.json`) : await backupDatabase(backup);
  assert.equal(databaseBackup.path, `${backup}/database.sql`); assert.equal(sha(databaseBackup.path), databaseBackup.sha256);
  const connection = databaseConnection(), history = connection.sql("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name;").split("\n").filter(Boolean);
  assert.deepEqual(history, read(`${evidence}/database-preflight.json`).history, "Applied migration history changed since read-only preflight");
  const currentChecksums = connection.sql("SELECT migration_name, checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name;").replaceAll("\r\n", "\n");
  assert.equal(currentChecksums, read(`${evidence}/database-history-checksums.json`).history, "Applied migration checksums changed since read-only preflight");
  assert.equal(connection.sql("SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL;"), "0");
  const migrations = fs.readdirSync(`${releaseRoot}/prisma/migrations`, { withFileTypes: true }).filter(item => item.isDirectory()).map(item => item.name).sort();
  const pending = migrations.filter(name => !history.includes(name)); assert.deepEqual(pending, [manifest.migrationName], "Only the reviewed additive migration may run");
  const migrationPath = `${releaseRoot}/prisma/migrations/${manifest.migrationName}/migration.sql`; assert.equal(sha(migrationPath), manifest.migrationSha256);
  assert.equal(connection.sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='AttachmentAssessmentLink';"), "0");
  const migrationCli = `${candidate}/backend/node_modules/prisma/build/index.js`;
  assert(fs.statSync(migrationCli).isFile(), "Use the validated build-tool CLI, which is intentionally absent from production-only dependencies");
  const migration = spawnSync(process.execPath, [migrationCli, "migrate", "deploy", "--schema", `${releaseRoot}/prisma/schema.prisma`], { cwd: root, env: process.env, windowsHide: true, encoding: "utf8", timeout: 120000 });
  fs.writeFileSync(`${backup}/migration-output.private.txt`, `${migration.stdout ?? ""}\n${migration.stderr ?? ""}`, { flag: "wx" });
  assert(!migration.error && migration.status === 0, "Additive migration failed before switching API/frontend");
  assert.equal(connection.sql("SELECT COUNT(*) FROM AttachmentAssessmentLink;"), "0", "New association table must initialize empty");
  fs.writeFileSync(`${evidence}/database-migration.json`, JSON.stringify({ status: "PASS", name: manifest.migrationName, sha256: manifest.migrationSha256, additiveOnly: true, existingAttachmentsModified: false, originalObjectStorageModified: false, backupSha256: databaseBackup.sha256, at: new Date().toISOString() }, null, 2), { flag: "wx" });
  const originalConfig = fs.readFileSync(config, "utf8"), oldEntry = `${oldApiRoot}/dist/server.js`, newEntry = `${releaseRoot}/dist/server.js`;
  assert.equal(originalConfig.split(JSON.stringify(oldEntry)).length, 2, "Active executable token must occur exactly once");
  assert.equal(originalConfig.split(`APP_VERSION: ${JSON.stringify(oldApiVersion)},`).length, 2, "Active API version token must occur exactly once");
  const nextConfig = originalConfig.replace(JSON.stringify(oldEntry), JSON.stringify(newEntry)).replace(`APP_VERSION: ${JSON.stringify(oldApiVersion)},`, `APP_VERSION: ${JSON.stringify(id)},`);
  assert.notEqual(nextConfig, originalConfig); assert.equal(nextConfig.replace(JSON.stringify(newEntry), JSON.stringify(oldEntry)).replace(`APP_VERSION: ${JSON.stringify(id)},`, `APP_VERSION: ${JSON.stringify(oldApiVersion)},`), originalConfig);
  const proposed = new (require("node:module").Module)(config); proposed._compile(nextConfig, config);
  const proposedApi = proposed.exports.apps.find(app => app.name === "nivasafe-api");
  assert.equal(path.resolve(proposedApi.script).toLowerCase(), path.resolve(newEntry).toLowerCase());
  assert.equal(path.resolve(proposedApi.cwd).toLowerCase(), path.resolve(root).toLowerCase());
  assert.equal(proposedApi.env.APP_VERSION, id);
  preserve(before); atomic(config, nextConfig); apiSwitched = true; const api = await restart(id);
  const denials = [];
  for (const route of ["/api/v1/files/00000000-0000-4000-8000-000000000001/assessment-links", "/api/v1/fmea/process-image-analysis", "/api/v1/rula/posture-image-analysis"]) { const response = await fetch(`https://app.nivasafe.com${route}`, { method: "POST", signal: AbortSignal.timeout(10000) }); assert.equal(response.status, 401); denials.push({ route, status: response.status }); }
  const addedAssets = [];
  for (const asset of plan.assets) { const source = `${candidate}/frontend/dist${asset}`, destination = `${live}${asset}`; if (fs.existsSync(destination)) assert.equal(sha(source), sha(destination)); else { fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL); addedAssets.push(asset); } }
  for (const asset of addedAssets) await publicBytes(asset, fs.readFileSync(`${live}${asset}`));
  preserve(before); atomic(`${live}/index.html`, plan.html); indexSwitched = true; await publicBytes("/files", Buffer.from(plan.html)); preserve(before, true); await health(id);
  const currentWorker = (await call("list")).find(process => process.name === "nivasafe-worker"); assert.deepEqual(currentWorker ? { pid: currentWorker.pid, entry: currentWorker.pm2_env.pm_exec_path } : null, workerIdentity);
  await call("dump");
  const result = { status: "DEPLOYED", task, id, at: new Date().toISOString(), api, apiRestarted: true, resumedBeforeAnyApiOrSchemaChange: resuming, workerUnchanged: workerIdentity, privateEnvironmentUnchanged: true, reverseProxyUnchanged: true, allPriorStaticAssetsRetained: true, preservedPriorStaticFiles: before.staticFiles.length - 1, preservedStylesheets: plan.preservedStylesheets, oldEntry: plan.oldEntry, newEntry: plan.newEntry, oldIndexSha256: before.indexSha256, newIndexSha256: sha(`${live}/index.html`), addedAssets, newFiles: addedAssets.map(url => ({ url, sha256: sha(`${live}${url}`) })), changedRuntimeModules: build.changedRuntimeModules, migrationName: manifest.migrationName, originalFilesAndExistingDatabaseRecordsPreserved: true, backup, rollbackIndex: `${backup}/index.html`, denials };
  fs.writeFileSync(`${evidence}/deployment.json`, JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify({ status: "DEPLOYED", task, api, newEntry: plan.newEntry, addedAssets: addedAssets.length, migration: manifest.migrationName }));
} catch (error) {
  let recovery = { status: "NOT_REQUIRED", additiveTableRetained: true };
  if (apiSwitched || indexSwitched) { try { if (indexSwitched) { atomic(`${live}/index.html`, fs.readFileSync(`${backup}/index.html`)); await publicBytes("/files", fs.readFileSync(`${backup}/index.html`)); } if (apiSwitched) { atomic(config, fs.readFileSync(`${backup}/ecosystem.config.cjs`)); await restart(oldApiVersion); await call("dump"); } recovery = { status: "RESTORED_CODE", additiveTableAndAnyReferencesRetained: true, noOriginalDataDeleted: true }; } catch { recovery = { status: "FAILED_REQUIRES_ATTENTION", additiveTableRetained: true }; } }
  const result = { status: "FAILED", task, error: error.message, recovery }; fs.writeFileSync(`${evidence}/deployment-failure-${Date.now()}.json`, JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify(result)); process.exitCode = 1;
} finally { pm2.disconnect(); }
