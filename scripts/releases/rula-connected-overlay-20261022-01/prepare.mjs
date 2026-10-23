import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const root = "C:/NIVASafe";
export const task = "rula-connected-overlay-20261022-01";
export const id = `release-${task}`;
export const work = `${root}/.local/${task}`;
export const evidence = `${root}/reports/evidence/${task}`;
export const baseline = `${root}/.local/rula-landmark-accuracy-20261022-01/candidate`;
export const candidate = `${work}/candidate`;
export const live = "C:/inetpub/nivasafe/app-com";
export const config = `${root}/deployment/ecosystem.config.cjs`;
export const proxy = "C:/Runtime/nginx/conf/nginx.conf";
export const currentApiVersion = "release-image-first-attempt-20261022-02";
export const currentApiEntry = `C:/ProgramData/NIVASafe/releases/${currentApiVersion}/backend/dist/server.js`;
const backendContractSources = ["image-processing-consent.ts", "modules/assessments.ts", "modules/admin.ts", "modules/files.ts", "fmea-process.ts", "modules/reports.ts", "modules/actions.ts", "action-progress.ts", "fmea-report.ts"].map(file => `backend/src/${file}`);
export const sha = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export const read = file => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/u, ""));
export const hashText = value => crypto.createHash("sha256").update(value).digest("hex");
const excluded = new Set(["node_modules", "dist", ".turbo", ".vite-cache", "__pycache__", "playwright-results", "playwright-report"]);
export function files(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    if (excluded.has(item.name) || item.name.endsWith(".tsbuildinfo")) return [];
    const relative = `${prefix}${item.name}`;
    return item.isDirectory() ? files(path.join(directory, item.name), `${relative}/`) : item.isFile() ? [relative] : [];
  }).sort();
}
export function liveFiles(directory = live, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    const relative = `${prefix}${item.name}`;
    return item.isDirectory() ? liveFiles(path.join(directory, item.name), `${relative}/`) : item.isFile() ? [relative] : [];
  }).sort();
}
export function powershell(command) {
  const env = { ...process.env };
  delete env.PSModulePath;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", `$ErrorActionPreference='Stop'; ${command}`], { env, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, "Read-only runtime identity check failed");
  return JSON.parse(result.stdout.replace(/^\uFEFF/u, ""));
}
export async function runtimeIdentity() {
  const response = await fetch("http://127.0.0.1:5044/api/v1/health", { signal: AbortSignal.timeout(3000) });
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.data?.version, currentApiVersion);
  assert.equal(health.data?.database, "up");
  const actual = powershell("$taskListeners=@(Get-NetTCPConnection -State Listen -LocalPort 5044 | Select-Object -ExpandProperty OwningProcess -Unique); if($taskListeners.Count -ne 1){throw 'Unexpected API listeners'}; $taskProcess=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$taskListeners[0]); [pscustomobject]@{pid=[int]$taskProcess.ProcessId;commandLine=$taskProcess.CommandLine;listeners=$taskListeners} | ConvertTo-Json -Compress");
  assert(actual.commandLine.replaceAll("\\", "/").includes(currentApiEntry));
  assert.deepEqual(actual.listeners, [actual.pid]);
  return { version: currentApiVersion, entry: currentApiEntry, pid: actual.pid, commandLine: actual.commandLine, listenerPid: actual.listeners[0], database: health.data.database };
}
function sourceBlock(source) {
  const start = source.indexOf("const RULA_OVERLAY_MIN_CONFIDENCE = ");
  const end = source.indexOf("\nfunction AssessmentImageLightbox(", start);
  assert(start >= 0 && end > start, "Cannot identify the exact overlay source boundary");
  assert.equal(source.indexOf("const RULA_OVERLAY_MIN_CONFIDENCE = ", start + 1), -1);
  return { start, end, text: source.slice(start, end) };
}
function cssRule(source, selector) {
  const matches = [...source.matchAll(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")} \\{[^}]*\\}`, "gu"))];
  assert.equal(matches.length, 1, `Ambiguous scoped CSS selector: ${selector}`);
  return matches[0][0];
}
export function prepareTestDependencies() {
  const manifest = `${evidence}/test-contract-sources.json`;
  assert(!fs.existsSync(manifest), "Test-prerequisite evidence already exists");
  const sources = backendContractSources.map(relative => {
    const source = `${baseline}/${relative}`, destination = `${candidate}/${relative}`;
    assert(fs.existsSync(source));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) assert.equal(sha(destination), sha(source));
    else fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    return { path: relative, sha256: sha(destination) };
  });
  fs.writeFileSync(manifest, JSON.stringify({ status: "VERIFIED_UNCHANGED_BASELINE_TEST_INPUTS", baseline, candidate, frontendSourceContractTestsOnly: true, backendBuiltOrPublished: false, files: sources }, null, 2), { flag: "wx" });
}
export async function prepare() {
  assert(process.argv.includes("--source-ready"), "Source owner must finish the exact scoped implementation before preparing");
  assert(!fs.existsSync(candidate), "Never replace an existing frozen candidate");
  assert(!fs.existsSync(`${evidence}/candidate.json`), "Candidate evidence already exists");
  const relative = "frontend/src/features/assessments/AssessmentPages.tsx";
  const testRelative = "frontend/src/features/assessments/RulaPostureOverlayLayer.test.tsx";
  const cssRelative = "frontend/src/styles.css";
  const original = fs.readFileSync(`${baseline}/${relative}`, "utf8");
  const previous = sourceBlock(original);
  const approved = sourceBlock(fs.readFileSync(`${root}/${relative}`, "utf8"));
  assert.notEqual(approved.text, previous.text, "Requested overlay implementation is not ready");
  assert(fs.existsSync(`${root}/${testRelative}`), "Overlay regression coverage is missing");
  const css = fs.readFileSync(`${baseline}/${cssRelative}`, "utf8");
  const rootCss = fs.readFileSync(`${root}/${cssRelative}`, "utf8");
  const selectors = [".rula-skeleton-overlay line", ".rula-skeleton-overlay circle"];
  const oldRules = selectors.map(selector => cssRule(css, selector));
  const newRules = selectors.map(selector => cssRule(rootCss, selector));
  assert.equal(newRules[0], oldRules[0].replace("stroke-width: .008;", "stroke-width: 2px; stroke-linecap: round;"), "Line CSS exceeds the approved visible-width and rounded-cap scope");
  assert.equal(newRules[1], oldRules[1].replace("stroke-width: .006;", "stroke-width: 1px;"), "Point CSS exceeds the approved border-width scope");
  const identity = await runtimeIdentity();
  const staticFiles = liveFiles().map(file => ({ path: file, sha256: sha(`${live}/${file}`), bytes: fs.statSync(`${live}/${file}`).size }));
  const protection = { capturedAt: new Date().toISOString(), api: identity, envSha256: sha(`${root}/.env`), configSha256: sha(config), proxySha256: sha(proxy), indexSha256: sha(`${live}/index.html`), stylesheets: [...fs.readFileSync(`${live}/index.html`, "utf8").matchAll(/<link\s+rel="stylesheet"[^>]*>/gu)].map(match => match[0]), staticFiles };
  fs.mkdirSync(evidence, { recursive: true });
  fs.mkdirSync(work, { recursive: true });
  fs.writeFileSync(`${evidence}/runtime-before.json`, JSON.stringify(protection, null, 2), { flag: "wx" });
  fs.copyFileSync(`${live}/index.html`, `${work}/index.before.html`, fs.constants.COPYFILE_EXCL);
  fs.mkdirSync(candidate);
  const copyFilter = source => {
    const basename = path.basename(source);
    return !excluded.has(basename) && !basename.endsWith(".tsbuildinfo") && basename !== ".env" && (!basename.startsWith(".env.") || [".env.example", ".env.sample"].includes(basename));
  };
  for (const directory of ["frontend", "shared/domain"]) fs.cpSync(`${baseline}/${directory}`, `${candidate}/${directory}`, { recursive: true, filter: copyFilter });
  for (const file of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json"]) fs.copyFileSync(`${baseline}/${file}`, `${candidate}/${file}`);
  for (const directory of ["", "frontend", "shared/domain"]) fs.symlinkSync(`${root}/${directory ? `${directory}/` : ""}node_modules`, `${candidate}/${directory ? `${directory}/` : ""}node_modules`, "junction");
  prepareTestDependencies();
  fs.writeFileSync(`${candidate}/${relative}`, original.slice(0, previous.start) + approved.text + original.slice(previous.end));
  fs.copyFileSync(`${root}/${testRelative}`, `${candidate}/${testRelative}`);
  let patchedCss = css;
  for (let index = 0; index < oldRules.length; index++) patchedCss = patchedCss.replace(oldRules[index], newRules[index]);
  fs.writeFileSync(`${candidate}/${cssRelative}`, patchedCss);
  const allowed = new Set([relative, cssRelative, testRelative]);
  const allFiles = files(candidate);
  const modified = allFiles.filter(file => !fs.existsSync(`${baseline}/${file}`) || sha(`${baseline}/${file}`) !== sha(`${candidate}/${file}`));
  assert.deepEqual(modified.sort(), [...allowed].sort(), "Candidate changed unrelated baseline source");
  for (const directory of ["frontend", "shared/domain"]) for (const file of files(`${baseline}/${directory}`)) assert(fs.existsSync(`${candidate}/${directory}/${file}`), "A protected source or asset disappeared");
  fs.writeFileSync(`${evidence}/overlay-source-before.txt`, previous.text);
  fs.writeFileSync(`${evidence}/overlay-source-after.txt`, approved.text);
  fs.writeFileSync(`${work}/skeleton-lines.css`, `${newRules.join("\n")}\n`);
  const manifest = { status: "PREPARED", task, id, candidate, baseline, preparedAt: new Date().toISOString(), modified, cssSupplement: `${work}/skeleton-lines.css`, cssSupplementSha256: sha(`${work}/skeleton-lines.css`), backendChanged: false, apiRestartRequired: false, noDependenciesChanged: true, files: allFiles.map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) })) };
  fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(manifest, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ status: manifest.status, task, candidate, modified, protectedStaticFiles: staticFiles.length, apiPid: identity.pid }));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.includes("--repair-test-prerequisites")) prepareTestDependencies();
  else await prepare();
}
