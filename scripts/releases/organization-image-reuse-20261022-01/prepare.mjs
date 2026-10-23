import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { sha, read, hashText, files, liveFiles, runtimeIdentity } from "../rula-connected-overlay-20261022-01/prepare.mjs";

export { sha, read, hashText, files, liveFiles, runtimeIdentity };
export const root = "C:/NIVASafe";
export const task = "organization-image-reuse-20261022-01";
export const id = `release-${task}`;
export const work = `${root}/.local/${task}`;
export const evidence = `${root}/reports/evidence/${task}`;
export const candidate = `${work}/candidate`;
export const frontendBaseline = `${root}/.local/files-organization-image-picker-20261022-01/candidate`;
export const backendBaseline = `${root}/.local/image-first-attempt-20261022-01/candidate-r2`;
export const live = "C:/inetpub/nivasafe/app-com";
export const config = `${root}/deployment/ecosystem.config.cjs`;
export const proxy = "C:/Runtime/nginx/conf/nginx.conf";
export const oldApiVersion = "release-image-first-attempt-20261022-02";
export const oldApiRoot = `C:/ProgramData/NIVASafe/releases/${oldApiVersion}/backend`;
const excluded = new Set(["node_modules", "dist", ".turbo", ".vite-cache", "__pycache__", "playwright-results", "playwright-report"]);

export async function prepareBaseline() {
  assert(!fs.existsSync(candidate), "Never replace an existing candidate");
  fs.mkdirSync(evidence, { recursive: true });
  const api = await runtimeIdentity();
  for (const file of files(`${backendBaseline}/backend/src`)) assert.equal(sha(`${backendBaseline}/backend/src/${file}`), sha(`${oldApiRoot}/src/${file}`), `Backend source differs from active release: ${file}`);
  const staticFiles = liveFiles().map(file => ({ path: file, sha256: sha(`${live}/${file}`), bytes: fs.statSync(`${live}/${file}`).size }));
  const before = { capturedAt: new Date().toISOString(), api, envSha256: sha(`${root}/.env`), configSha256: sha(config), proxySha256: sha(proxy), indexSha256: sha(`${live}/index.html`), staticFiles };
  assert.equal(before.indexSha256, read(`${root}/reports/evidence/files-organization-image-picker-20261022-01/deployment.json`).newIndexSha256);
  fs.writeFileSync(`${evidence}/runtime-before.json`, JSON.stringify(before, null, 2), { flag: "wx" });
  fs.copyFileSync(`${live}/index.html`, `${work}/index.before.html`, fs.constants.COPYFILE_EXCL);
  fs.mkdirSync(candidate);
  const filter = source => { const name = path.basename(source); return !excluded.has(name) && !name.endsWith(".tsbuildinfo") && name !== ".env" && (!name.startsWith(".env.") || [".env.example", ".env.sample"].includes(name)); };
  for (const [source, target] of [[`${frontendBaseline}/frontend`, "frontend"], [`${backendBaseline}/backend`, "backend"], [`${frontendBaseline}/shared/domain`, "shared/domain"]]) fs.cpSync(source, `${candidate}/${target}`, { recursive: true, filter });
  for (const file of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json"]) fs.copyFileSync(`${frontendBaseline}/${file}`, `${candidate}/${file}`);
  fs.copyFileSync(`${backendBaseline}/docker-compose.yml`, `${candidate}/docker-compose.yml`);
  for (const file of ["deployment/ecosystem.config.cjs", "scripts/probe-efficient-vision-model.mjs"]) {
    fs.mkdirSync(path.dirname(`${candidate}/${file}`), { recursive: true });
    fs.copyFileSync(`${backendBaseline}/${file}`, `${candidate}/${file}`);
  }
  for (const directory of ["", "frontend", "backend", "shared/domain"]) fs.symlinkSync(`${root}/${directory ? `${directory}/` : ""}node_modules`, `${candidate}/${directory ? `${directory}/` : ""}node_modules`, "junction");
  const baselineFiles = files(candidate).map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) }));
  fs.writeFileSync(`${evidence}/baseline.json`, JSON.stringify({ status: "BASELINE_PREPARED_NOT_VALIDATED_CANDIDATE", frontendBaseline, backendBaseline, files: baselineFiles }, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ status: "BASELINE_PREPARED", sources: baselineFiles.length, staticFiles: staticFiles.length, apiPid: api.pid }));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await prepareBaseline();
