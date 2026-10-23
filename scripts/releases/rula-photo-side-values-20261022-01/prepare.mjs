import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { sha, read, hashText, files, liveFiles, powershell } from "../rula-connected-overlay-20261022-01/prepare.mjs";
import { runtimeIdentity as originalRuntime } from "../member-directory-cards-20261022-01/prepare.mjs";
export { sha, read, hashText, files, liveFiles, powershell };
export const root = "C:/NIVASafe", task = "rula-photo-side-values-20261022-01", id = `release-${task}`;
export const work = `${root}/.local/${task}`, evidence = `${root}/reports/evidence/${task}`, candidate = `${work}/candidate`;
export const frontendBaseline = `${root}/.local/sidebar-disclosures-20261022-01/candidate`;
export const backendBaseline = `${root}/.local/organization-image-reuse-20261022-01/candidate`;
export const oldApiVersion = "release-organization-image-reuse-20261022-01", oldApiRoot = `C:/ProgramData/NIVASafe/releases/${oldApiVersion}/backend`;
export const live = "C:/inetpub/nivasafe/app-com", config = `${root}/deployment/ecosystem.config.cjs`, proxy = "C:/Runtime/nginx/conf/nginx.conf";
export async function runtimeIdentity(version = oldApiVersion) {
  if (version === oldApiVersion) return originalRuntime();
  const response = await fetch("http://127.0.0.1:5044/api/v1/health", { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200); const health = await response.json();
  assert.equal(health.data?.version, version); assert.equal(health.data.database, "up");
  const actual = powershell("$rulaListeners=@(Get-NetTCPConnection -State Listen -LocalPort 5044 | Select-Object -ExpandProperty OwningProcess -Unique); if($rulaListeners.Count -ne 1){throw 'Unexpected API listeners'}; $rulaProcess=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$rulaListeners[0]); [pscustomobject]@{pid=[int]$rulaProcess.ProcessId;commandLine=$rulaProcess.CommandLine} | ConvertTo-Json -Compress");
  const entry = `C:/ProgramData/NIVASafe/releases/${version}/backend/dist/server.js`;
  assert(actual.commandLine.replaceAll("\\", "/").includes(entry));
  return { ...actual, entry, version, database: health.data.database };
}
export function preserve(before, allowIndex = false, allowConfig = false) {
  assert.equal(sha(`${root}/.env`), before.envSha256); assert.equal(sha(proxy), before.proxySha256);
  if (!allowConfig) assert.equal(sha(config), before.configSha256);
  for (const file of before.staticFiles) if (!(allowIndex && file.path === "index.html")) assert.equal(sha(`${live}/${file.path}`), file.sha256, `Protected asset changed: ${file.path}`);
}
async function prepare() {
  fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(evidence, { recursive: true });
  assert(!fs.existsSync(candidate)); assert(!fs.existsSync(`${evidence}/runtime-before.json`));
  const prior = read(`${root}/reports/evidence/sidebar-disclosures-20261022-01/candidate.json`);
  for (const file of prior.files) assert.equal(sha(`${frontendBaseline}/${file.path}`), file.sha256);
  for (const file of files(`${backendBaseline}/backend/src`)) assert.equal(sha(`${backendBaseline}/backend/src/${file}`), sha(`${oldApiRoot}/src/${file}`));
  const api = await runtimeIdentity();
  const before = { capturedAt: new Date().toISOString(), api, envSha256: sha(`${root}/.env`), configSha256: sha(config), proxySha256: sha(proxy), indexSha256: sha(`${live}/index.html`), staticFiles: liveFiles().map(file => ({ path: file, sha256: sha(`${live}/${file}`) })) };
  assert.equal(before.indexSha256, read(`${root}/reports/evidence/sidebar-disclosures-20261022-01/deployment.json`).newIndexSha256);
  fs.writeFileSync(`${evidence}/runtime-before.json`, JSON.stringify(before, null, 2), { flag: "wx" });
  fs.copyFileSync(`${live}/index.html`, `${work}/index.before.html`, fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(config, `${work}/ecosystem.before.cjs`, fs.constants.COPYFILE_EXCL);
  const excluded = new Set(["node_modules", "dist", ".turbo", ".vite-cache", "__pycache__", "playwright-results", "playwright-report"]);
  const filter = source => !excluded.has(path.basename(source)) && !source.endsWith(".tsbuildinfo") && !path.basename(source).startsWith(".env");
  fs.mkdirSync(candidate);
  for (const [source, destination] of [[`${frontendBaseline}/frontend`, "frontend"], [`${frontendBaseline}/shared/domain`, "shared/domain"], [`${backendBaseline}/backend`, "backend"]]) fs.cpSync(source, `${candidate}/${destination}`, { recursive: true, filter });
  for (const file of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json"]) fs.copyFileSync(`${frontendBaseline}/${file}`, `${candidate}/${file}`);
  for (const file of ["deployment/ecosystem.config.cjs", "docker-compose.yml", "scripts/probe-efficient-vision-model.mjs"]) { fs.mkdirSync(path.dirname(`${candidate}/${file}`), { recursive: true }); fs.copyFileSync(`${backendBaseline}/${file}`, `${candidate}/${file}`); }
  for (const directory of ["", "frontend", "backend", "shared/domain"]) fs.symlinkSync(`${root}/${directory ? `${directory}/` : ""}node_modules`, `${candidate}/${directory ? `${directory}/` : ""}node_modules`, "junction");
  for (const directory of ["frontend/src/features/assessments", "backend/src", "shared/domain/src"]) for (const file of files(`${root}/${directory}`)) {
    const relative = `${directory}/${file}`, destination = `${work}/root-before/${relative}`;
    if (!fs.existsSync(destination)) { fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(`${root}/${relative}`, destination); }
  }
  fs.writeFileSync(`${evidence}/baseline.json`, JSON.stringify({ status: "BASELINE_PREPARED", frontendBaseline, backendBaseline, files: files(candidate).map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) })) }, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ status: "BASELINE_PREPARED", task, apiPid: api.pid, staticFiles: before.staticFiles.length }));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await prepare();
