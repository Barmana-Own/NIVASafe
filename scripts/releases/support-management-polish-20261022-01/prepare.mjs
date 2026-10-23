import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { sha, read, hashText, files, liveFiles, powershell } from "../rula-connected-overlay-20261022-01/prepare.mjs";

export { sha, read, hashText, files };
export const root = "C:/NIVASafe", task = "support-management-polish-20261022-01", id = `release-${task}`;
export const work = `${root}/.local/${task}`, evidence = `${root}/reports/evidence/${task}`;
export const baseline = `${root}/.local/checklist-add-button-20261022-01/candidate`, candidate = `${work}/candidate`;
export const live = "C:/inetpub/nivasafe/app-com", config = `${root}/deployment/ecosystem.config.cjs`, proxy = "C:/Runtime/nginx/conf/nginx.conf";
export const cssPath = `${work}/support-management.css`;
export async function runtimeIdentity() {
  const response = await fetch("http://127.0.0.1:5044/api/v1/health", { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.data?.version, "release-organization-image-reuse-20261022-01");
  assert.equal(health.data?.database, "up");
  const actual = powershell("$cardListeners=@(Get-NetTCPConnection -State Listen -LocalPort 5044 | Select-Object -ExpandProperty OwningProcess -Unique); if($cardListeners.Count -ne 1){throw 'Unexpected API listeners'}; $cardProcess=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$cardListeners[0]); [pscustomobject]@{pid=[int]$cardProcess.ProcessId;commandLine=$cardProcess.CommandLine} | ConvertTo-Json -Compress");
  const entry = "C:/ProgramData/NIVASafe/releases/release-organization-image-reuse-20261022-01/backend/dist/server.js";
  assert(actual.commandLine.replaceAll("\\", "/").includes(entry));
  return { ...actual, entry, version: health.data.version, database: health.data.database };
}
export function protectedUnchanged(before, allowIndex = false) {
  assert.equal(sha(`${root}/.env`), before.envSha256);
  assert.equal(sha(config), before.configSha256);
  assert.equal(sha(proxy), before.proxySha256);
  for (const file of before.staticFiles) if (!(allowIndex && file.path === "index.html")) assert.equal(sha(`${live}/${file.path}`), file.sha256, `Protected asset changed: ${file.path}`);
}
async function prepare() {
  assert(!fs.existsSync(`${evidence}/candidate.json`), "Preserve an existing candidate");
  fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(evidence, { recursive: true });
  const api = await runtimeIdentity();
  const previous = read(`${root}/reports/evidence/checklist-add-button-20261022-01/candidate.json`);
  for (const file of previous.files) assert.equal(sha(`${baseline}/${file.path}`), file.sha256);
  const before = { capturedAt: new Date().toISOString(), api, envSha256: sha(`${root}/.env`), configSha256: sha(config), proxySha256: sha(proxy), indexSha256: sha(`${live}/index.html`), staticFiles: liveFiles().map(file => ({ path: file, sha256: sha(`${live}/${file}`) })) };
  assert.equal(before.indexSha256, read(`${root}/reports/evidence/checklist-add-button-20261022-01/deployment.json`).newIndexSha256);
  fs.writeFileSync(`${evidence}/runtime-before.json`, JSON.stringify(before, null, 2), { flag: "wx" });
  fs.copyFileSync(`${live}/index.html`, `${work}/index.before.html`, fs.constants.COPYFILE_EXCL);
  const css = fs.readFileSync(`${root}/scripts/releases/${task}/support-management.css`, "utf8");
  fs.writeFileSync(cssPath, css, { flag: "wx" });
  const rootStyle = `${root}/frontend/src/styles.css`, oldRootStyle = fs.readFileSync(rootStyle);
  fs.writeFileSync(`${work}/styles.root.before.css`, oldRootStyle, { flag: "wx" });
  assert(!oldRootStyle.toString("utf8").includes("/* Owner-requested ticket-management presentation;"));
  const excluded = new Set(["node_modules", "dist", ".turbo", ".vite-cache", "__pycache__", "playwright-results", "playwright-report"]);
  const filter = source => !excluded.has(path.basename(source)) && !source.endsWith(".tsbuildinfo") && !path.basename(source).startsWith(".env");
  fs.mkdirSync(candidate);
  for (const directory of ["frontend", "shared/domain"]) fs.cpSync(`${baseline}/${directory}`, `${candidate}/${directory}`, { recursive: true, filter });
  for (const file of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json"]) fs.copyFileSync(`${baseline}/${file}`, `${candidate}/${file}`);
  for (const directory of ["", "frontend", "shared/domain"]) fs.symlinkSync(`${root}/${directory ? `${directory}/` : ""}node_modules`, `${candidate}/${directory ? `${directory}/` : ""}node_modules`, "junction");
  fs.appendFileSync(`${candidate}/frontend/src/styles.css`, `\n${css}`);
  const paths = files(candidate);
  const modified = paths.filter(file => sha(`${candidate}/${file}`) !== sha(`${baseline}/${file}`));
  assert.deepEqual(modified, ["frontend/src/styles.css"]);
  const manifest = { status: "PREPARED", task, id, baseline, candidate, modified, cssSupplement: cssPath, cssSupplementSha256: sha(cssPath), cssOnly: true, javaScriptChanged: false, backendChanged: false, databaseChanged: false, noDependenciesChanged: true, files: paths.map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) })), rootStylesBeforeSha256: hashText(oldRootStyle), rootStylesAfterSha256: hashText(Buffer.concat([oldRootStyle, Buffer.from(`\n${css}`)])) };
  fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(manifest, null, 2), { flag: "wx" });
  fs.appendFileSync(rootStyle, `\n${css}`);
  assert.equal(sha(rootStyle), manifest.rootStylesAfterSha256);
  console.log(JSON.stringify({ status: "PREPARED", task, modified, priorStaticFiles: before.staticFiles.length, apiPid: api.pid }));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await prepare();
