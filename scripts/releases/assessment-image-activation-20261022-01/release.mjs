import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { root, task, id, evidence, candidate, sha, read } from "./prepare.mjs";
import { assertApiRuntimeIdentity } from "./runtime-identity.mjs";

const require = createRequire(import.meta.url);
process.env.PM2_HOME = "C:/ProgramData/NIVASafe/pm2";
const pm2 = require("C:/Runtime/node/node_modules/pm2");
const call = (method, ...args) => new Promise((resolve, reject) => pm2[method](...args, (error, result) => error ? reject(new Error(`PM2 ${method} failed`)) : resolve(result)));
const old = read(`${evidence}/runtime-before.json`);
const oldRoot = path.dirname(path.dirname(old.entry));
const releaseRoot = `C:/ProgramData/NIVASafe/releases/${id}/backend`;
const backup = `C:/ProgramData/NIVASafe/backups/${id}`;
const live = "C:/inetpub/nivasafe/app-com";
const config = `${root}/deployment/ecosystem.config.cjs`;
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const expectedModules = new Set(["ai-provider.js", "image-provider-approval.js", "image-processing-consent.js", "modules/assessments.js", "posture-image-authorizations.js", "fmea-process.js", "rula-posture-ai.js"]);
let switched = false;
const resuming = process.argv.includes("--resume");
function atomic(file, bytes) {
  const temporary = `${file}.${task}.tmp`;
  fs.writeFileSync(temporary, bytes, { flag: "wx" });
  fs.renameSync(temporary, file);
}
async function health(version) {
  for (let n = 0; n < 120; n++) {
    try { const response = await fetch("http://127.0.0.1:5044/api/v1/health", { signal: AbortSignal.timeout(800) }); const result = await response.json(); if (response.ok && result.data?.version === version && result.data.database === "up") return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("API version/database health check failed");
}
function files(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]);
}
function frontendRelease() {
  const previous = fs.readFileSync(`${live}/index.html`, "utf8");
  const built = fs.readFileSync(`${candidate}/frontend/dist/index.html`, "utf8");
  const entry = html => html.match(/<script\s+type="module"\s+crossorigin\s+src="([^"]+\.js)"><\/script>/u)?.[1];
  const oldEntry = entry(previous), nextEntry = entry(built);
  assert(oldEntry && nextEntry && previous.split(oldEntry).length === 2);
  const index = previous.replace(oldEntry, nextEntry);
  const css = html => html.match(/<link\s+rel="stylesheet"[^>]*>/gu) || [];
  assert.deepEqual(css(index), css(previous), "Active stylesheet links must be byte-preserved");
  assert.equal(index.replace(nextEntry, oldEntry), previous, "Unrelated public HTML changed");
  const assets = new Set();
  function visit(url) {
    if (assets.has(url)) return;
    assert(url.startsWith("/assets/") && !url.includes(".."), "Unsafe candidate asset reference");
    const file = `${candidate}/frontend/dist${url}`;
    assert(fs.existsSync(file), "Candidate dependency is missing");
    assets.add(url);
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/["'`](?:\.\/|\/)?((?:assets\/)?[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(?:js|css))["'`]/gu)) visit(`/assets/${path.posix.basename(match[1])}`);
  }
  visit(nextEntry);
  const unusedGlobalCss = built.match(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"/u)?.[1];
  assert(!unusedGlobalCss || !assets.has(unusedGlobalCss), "New global CSS must not be loaded by JavaScript");
  return { index, assets: [...assets], stylesheetTags: css(previous), oldEntry, nextEntry };
}
function restrictPrivateDirectory(directory) {
  assert(directory === backup || directory === releaseRoot);
  const result = spawnSync("icacls.exe", [directory, "/inheritance:r", "/grant:r", "*S-1-5-18:(OI)(CI)F", "*S-1-5-32-544:(OI)(CI)F"], { windowsHide: true, encoding: "utf8" });
  assert.equal(result.status, 0, "Private release/backup ACL could not be restricted");
}
async function restartManagedApi(version) {
  // PM2's JSON verification discards pm_exec_path. Update the exact managed
  // process through current_conf, which God applies before starting it again.
  delete require.cache[require.resolve(config)];
  const app = require(config).apps.find(item => item.name === "nivasafe-api");
  assert(app && [old.entry, `${releaseRoot}/dist/server.js`].some(entry => same(entry, app.script)));
  const active = (await call("list")).find(item => item.name === app.name);
  assert(active && [old.entry, `${releaseRoot}/dist/server.js`].some(entry => same(entry, active.pm2_env.pm_exec_path)));
  await new Promise((resolve, reject) => pm2.Client.executeRemote("restartProcessId", {
    id: active.pm_id,
    env: { ...app.env, current_conf: { script: app.script, pm_exec_path: app.script, pm_cwd: app.cwd, exec_interpreter: app.interpreter } },
  }, error => error ? reject(new Error("Managed API executable restart failed")) : resolve()));
  await health(version);
  const current = (await call("list")).find(item => item.name === app.name);
  assert(current && current.pid && same(current.pm2_env.pm_exec_path, app.script), "Managed executable path mismatch");
  const processCheck = spawnSync("powershell.exe", ["-NoProfile", "-Command", `$taskProcess = Get-CimInstance Win32_Process -Filter 'ProcessId = ${Number(current.pid)}'; $taskListeners = @(Get-NetTCPConnection -State Listen -LocalPort 5044); [pscustomobject]@{ ProcessId=$taskProcess.ProcessId; CommandLine=$taskProcess.CommandLine; ListenerPids=@($taskListeners.OwningProcess | Sort-Object -Unique) } | ConvertTo-Json -Compress`], { windowsHide: true, encoding: "utf8" });
  assert.equal(processCheck.status, 0);
  const actualProcess = JSON.parse(processCheck.stdout);
  assert.equal(actualProcess.ListenerPids.length, 1, "Unexpected API listener count");
  assertApiRuntimeIdentity(current, app, actualProcess, actualProcess.ListenerPids[0]);
  return { pid: current.pid, pmExecPath: current.pm2_env.pm_exec_path, osCommandLine: actualProcess.CommandLine };
}
async function restore() {
  assert.equal(read(`${backup}/manager.json`).id, id);
  atomic(config, fs.readFileSync(`${backup}/ecosystem.config.cjs`));
  await restartManagedApi(old.version);
  atomic(`${live}/index.html`, fs.readFileSync(`${backup}/index.html`));
  await call("dump");
  return { status: "RESTORED", version: old.version, previousAssetsRetained: true, dataRestored: false };
}

try {
  await call("connect");
  if (process.argv.includes("--repair-runtime")) {
    const previous = read(`${evidence}/deployment.json`);
    assert.equal(previous.id, id);
    assert(!fs.existsSync(`${evidence}/deployment-initial-label-only.json`), "Runtime repair already attempted");
    fs.writeFileSync(`${evidence}/deployment-initial-label-only.json`, JSON.stringify({ ...previous, status: "FALSE_POSITIVE_VERSION_LABEL_ONLY", actualExecutable: old.entry, discoveredBy: "Owner consent V2 validation error and independent OS process check" }, null, 2));
    switched = true;
    const process = await restartManagedApi(id);
    await call("dump");
    const result = { ...previous, at: new Date().toISOString(), ...process, runtimeIdentityVerified: true, priorFalsePositiveRetained: true };
    fs.writeFileSync(`${evidence}/deployment.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  }
  else if (process.argv.includes("--rollback")) { console.log(JSON.stringify(await restore())); }
  else {
    assert(process.argv.includes("--deploy"), "Use --deploy or --rollback");
    assert(!fs.existsSync(`${evidence}/deployment.json`), "Deployment already recorded; inspect before retry");
    for (const project of ["backend", "frontend"]) { const result = read(`${evidence}/${project}-tests-final.json`); assert(result.success && !result.numFailedTests && !result.numPendingTests, `${project} tests incomplete`); }
    assert.equal(read(`${evidence}/synthetic-integration.json`).status, "PASS");
    assert.equal(read(`${evidence}/build-validation.json`).status, "PASS");
    const baseline = read(`${evidence}/integrity-baseline.json`);
    for (const protectedFile of baseline.protectedPaths) assert.equal(sha(protectedFile.path), protectedFile.sha256, "Protected source/runtime changed since baseline");
    const snapshot = read(`${evidence}/candidate.json`);
    for (const file of snapshot.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256, "Frozen source changed");
    const changedModules = files(`${candidate}/backend/dist`).filter(file => file.endsWith(".js") && !file.endsWith(".test.js") && (!fs.existsSync(`${oldRoot}/dist/${file}`) || sha(`${candidate}/backend/dist/${file}`) !== sha(`${oldRoot}/dist/${file}`)));
    assert(changedModules.length > 0 && changedModules.every(file => expectedModules.has(file)), "Unexpected runtime scope");
    const active = (await call("list")).find(app => app.name === "nivasafe-api");
    assert(active && (resuming || active.pid === old.pid) && same(active.pm2_env.pm_exec_path, old.entry) && active.pm2_env.APP_VERSION === old.version, "Production API changed");
    if (!resuming) {
      assert(!fs.existsSync(releaseRoot) && !fs.existsSync(backup), "Release/backup path exists");
      fs.mkdirSync(backup, { recursive: true });
      fs.mkdirSync(releaseRoot, { recursive: true });
      restrictPrivateDirectory(backup);
      restrictPrivateDirectory(releaseRoot);
    } else {
      assert.equal(read(`${backup}/manager.json`).id, id);
      for (const file of changedModules) assert.equal(sha(`${releaseRoot}/dist/${file}`), sha(`${candidate}/backend/dist/${file}`), "Prepared artifact changed");
    }
    const boot = require(config), bootApi = boot.apps.find(app => app.name === "nivasafe-api");
    const previousApp = { ...bootApi, script: active.pm2_env.pm_exec_path, cwd: active.pm2_env.pm_cwd, interpreter: active.pm2_env.exec_interpreter, env: { ...active.pm2_env.env } };
    if (!resuming) {
      fs.writeFileSync(`${backup}/manager.json`, JSON.stringify({ id, app: previousApp }));
      fs.copyFileSync(`${live}/index.html`, `${backup}/index.html`);
    }
    let preparedConfig = fs.readFileSync(config, "utf8");
    if (resuming) preparedConfig = preparedConfig.replace(`APP_VERSION: ${JSON.stringify(old.version)} }`, `APP_VERSION: ${JSON.stringify(old.version)},\n        // Explicit owner-authorized operation; vendor retention/training terms remain unverified.\n        RULA_IMAGE_PROCESSING_ENABLED_PROVIDER: "arvancloud",\n        FMEA_IMAGE_PROCESSING_ENABLED_PROVIDER: "arvancloud",\n        FMEA_IMAGE_VISION_SUPPORTED_PROVIDER: "arvancloud",\n      }`);
    const oldConfig = preparedConfig.replace(/,\r?\n\s*\/\/ Explicit owner-authorized operation; vendor retention\/training terms remain unverified\.\r?\n\s*RULA_IMAGE_PROCESSING_ENABLED_PROVIDER: "arvancloud",\r?\n\s*FMEA_IMAGE_PROCESSING_ENABLED_PROVIDER: "arvancloud",\r?\n\s*FMEA_IMAGE_VISION_SUPPORTED_PROVIDER: "arvancloud",\r?\n\s*\}/u, " }");
    assert(oldConfig !== preparedConfig, "Original operator settings could not be reconstructed");
    if (!resuming) {
      fs.writeFileSync(`${backup}/ecosystem.config.cjs`, oldConfig);
      for (const directory of ["src", "dist", "prisma"]) fs.cpSync(`${candidate}/backend/${directory}`, `${releaseRoot}/${directory}`, { recursive: true });
      for (const file of ["package.json", "tsconfig.json", "vitest.config.ts"]) fs.copyFileSync(`${candidate}/backend/${file}`, `${releaseRoot}/${file}`);
      fs.symlinkSync(`${oldRoot}/node_modules`, `${releaseRoot}/node_modules`, "junction");
    }
    assert.equal(sha(`${releaseRoot}/prisma/schema.prisma`), sha(`${oldRoot}/prisma/schema.prisma`));
    const frontend = frontendRelease();
    fs.writeFileSync(`${evidence}/frontend-release.json`, JSON.stringify({ status: "PREPARED", assets: frontend.assets, oldEntry: frontend.oldEntry, nextEntry: frontend.nextEntry, preservedStylesheets: frontend.stylesheetTags, htmlChangedOnlyAtEntrypoint: true }, null, 2));
    for (const asset of frontend.assets) {
      const file = asset.slice(1);
      const from = `${candidate}/frontend/dist/${file}`, to = `${live}/${file}`;
      if (fs.existsSync(to)) { assert.equal(sha(from), sha(to), `Existing static content differs: ${file}`); continue; }
      assert(file.startsWith("assets/"), "Unexpected new public asset");
      fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    }
    const next = { ...previousApp, script: `${releaseRoot}/dist/server.js`, env: { ...previousApp.env, APP_VERSION: id, RULA_IMAGE_PROCESSING_ENABLED_PROVIDER: "arvancloud", FMEA_IMAGE_PROCESSING_ENABLED_PROVIDER: "arvancloud", FMEA_IMAGE_VISION_SUPPORTED_PROVIDER: "arvancloud" } };
    assert.equal(next.env.RULA_IMAGE_PRIVACY_APPROVED_PROVIDER || "", "");
    assert.equal(next.env.FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER || "", "");
    const nextConfig = preparedConfig.replace(JSON.stringify(bootApi.script), JSON.stringify(next.script)).replace(`APP_VERSION: ${JSON.stringify(old.version)}`, `APP_VERSION: ${JSON.stringify(id)}`);
    assert(nextConfig !== preparedConfig && nextConfig.includes(JSON.stringify(next.script)), "API boot reference update failed");
    atomic(config, nextConfig);
    switched = true;
    const runtimeIdentity = await restartManagedApi(id);
    atomic(`${live}/index.html`, frontend.index);
    const publicResponse = await fetch("https://app.nivasafe.com/", { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(15000) });
    assert(publicResponse.ok && Buffer.from(await publicResponse.arrayBuffer()).equals(fs.readFileSync(`${live}/index.html`)), "Public index mismatch");
    const denials = [];
    for (const route of ["/profile/image-processing-consent", "/rula/image-analysis-policy", "/fmea/image-analysis-policy", "/rula", "/fmea"]) {
      const response = await fetch(`https://app.nivasafe.com/api/v1${route}`, { signal: AbortSignal.timeout(10000) }); assert.equal(response.status, 401); denials.push({ route, status: 401 });
    }
    await call("dump");
    const current = (await call("list")).find(app => app.name === "nivasafe-api");
    const result = { status: "DEPLOYED", id, at: new Date().toISOString(), pid: current.pid, ...runtimeIdentity, runtimeIdentityVerified: true, backup, changedModules, schemaUnchanged: true, migrationExecuted: false, oldAssetsRetained: true, activeStylesheetsPreserved: true, privateEnvironmentUnchanged: sha(`${root}/.env`) === baseline.protectedPaths[0].sha256, vendorTermsStillUnverified: true, renewedCurrentConsentRequired: true, denials };
    fs.writeFileSync(`${evidence}/deployment.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  }
} catch (error) {
  let recovery;
  if (switched) { try { recovery = await restore(); } catch { recovery = { status: "FAILED_REQUIRES_ATTENTION" }; } }
  const result = { status: "FAILED", error: error.message, recovery };
  fs.writeFileSync(`${evidence}/deployment-failure.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result)); process.exitCode = 1;
} finally { pm2.disconnect(); }
