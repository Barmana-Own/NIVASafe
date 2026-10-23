import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { sha, read, hashText, files, liveFiles, runtimeIdentity } from "../rula-connected-overlay-20261022-01/prepare.mjs";

export { sha, read, hashText, files, runtimeIdentity };
export const root = "C:/NIVASafe";
export const task = "files-organization-image-picker-20261022-01";
export const id = `release-${task}`;
export const work = `${root}/.local/${task}`;
export const evidence = `${root}/reports/evidence/${task}`;
export const baseline = `${root}/.local/knowledge-options-polish-20261022-01/candidate`;
export const candidate = `${work}/candidate`;
export const live = "C:/inetpub/nivasafe/app-com";
export const config = `${root}/deployment/ecosystem.config.cjs`;
export const proxy = "C:/Runtime/nginx/conf/nginx.conf";
const sourcePath = "frontend/src/features/files/FilesPage.tsx";
const testPath = "frontend/tests/e2e/files-organization-picker.spec.ts";
const excluded = new Set(["node_modules", "dist", ".turbo", ".vite-cache", "__pycache__", "playwright-results", "playwright-report"]);

export async function prepare() {
  assert(process.argv.includes("--source-ready"));
  assert(!fs.existsSync(candidate), "Never replace an existing frozen candidate");
  const cssPath = `${work}/upload.css`, css = fs.readFileSync(cssPath, "utf8");
  assert.equal(sha(cssPath), "205970d2baabab9cbef5337adc2e2364848e62a72c21ff0a797ed2b0cd568395");
  assert.equal(fs.readFileSync(`${root}/frontend/src/styles.css`, "utf8"), `${fs.readFileSync(`${work}/styles.before.css`, "utf8")}\n${css}`);
  assert.equal(sha(`${baseline}/${sourcePath}`), "0672f1d1b3c2a91a9be82b03023aae937dab7a678d192c75a638f4ebbdea308e");
  assert.equal(sha(`${root}/${sourcePath}`), "2ae560d1df9a2ff385b76ce29922bead31e71e71c4738520e7b54719f6c4de67");
  assert.equal(sha(`${root}/${testPath}`), "ef115d18f30f10ec999b69c9641d3311bbd0820cea9aee370e1f5b2cb71d4ba6");
  const previous = fs.readFileSync(`${baseline}/${sourcePath}`, "utf8"), current = fs.readFileSync(`${root}/${sourcePath}`, "utf8");
  for (const [start, end] of [["type FileReference", "export function FilesPage()"], ["  const canUpload =", "  async function upload("], ["  async function remove(", "  return <section"], ['    {canViewReports && <SectionCard', null]]) {
    const block = text => text.slice(text.indexOf(start), end ? text.indexOf(end, text.indexOf(start)) : undefined);
    assert(previous.includes(start) && current.includes(start));
    assert.equal(block(current), block(previous), "Protected file-management behavior changed");
  }
  const picker = "frontend/src/features/files/OrganizationImagePicker.tsx";
  assert.equal(sha(`${root}/${picker}`), sha(`${baseline}/${picker}`));
  fs.mkdirSync(evidence, { recursive: true });
  const api = await runtimeIdentity();
  const staticFiles = liveFiles().map(file => ({ path: file, sha256: sha(`${live}/${file}`), bytes: fs.statSync(`${live}/${file}`).size }));
  const protection = { capturedAt: new Date().toISOString(), api, envSha256: sha(`${root}/.env`), configSha256: sha(config), proxySha256: sha(proxy), indexSha256: sha(`${live}/index.html`), staticFiles };
  assert.equal(protection.indexSha256, read(`${root}/reports/evidence/knowledge-options-polish-20261022-01/deployment.json`).newIndexSha256);
  fs.writeFileSync(`${evidence}/runtime-before.json`, JSON.stringify(protection, null, 2), { flag: "wx" });
  fs.copyFileSync(`${live}/index.html`, `${work}/index.before.html`, fs.constants.COPYFILE_EXCL);
  fs.mkdirSync(candidate);
  const filter = source => { const name = path.basename(source); return !excluded.has(name) && !name.endsWith(".tsbuildinfo") && name !== ".env" && (!name.startsWith(".env.") || [".env.example", ".env.sample"].includes(name)); };
  for (const directory of ["frontend", "shared/domain"]) fs.cpSync(`${baseline}/${directory}`, `${candidate}/${directory}`, { recursive: true, filter });
  for (const file of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json"]) fs.copyFileSync(`${baseline}/${file}`, `${candidate}/${file}`);
  for (const directory of ["", "frontend", "shared/domain"]) fs.symlinkSync(`${root}/${directory ? `${directory}/` : ""}node_modules`, `${candidate}/${directory ? `${directory}/` : ""}node_modules`, "junction");
  const contract = read(`${root}/reports/evidence/knowledge-options-polish-20261022-01/test-contract-sources.json`).files;
  for (const file of contract) {
    assert.equal(sha(`${baseline}/${file.path}`), file.sha256);
    fs.mkdirSync(path.dirname(`${candidate}/${file.path}`), { recursive: true });
    fs.copyFileSync(`${baseline}/${file.path}`, `${candidate}/${file.path}`, fs.constants.COPYFILE_EXCL);
  }
  fs.writeFileSync(`${evidence}/test-contract-sources.json`, JSON.stringify({ files: contract, backendBuiltOrPublished: false }, null, 2), { flag: "wx" });
  fs.copyFileSync(`${root}/${sourcePath}`, `${candidate}/${sourcePath}`);
  fs.copyFileSync(`${root}/${testPath}`, `${candidate}/${testPath}`, fs.constants.COPYFILE_EXCL);
  fs.appendFileSync(`${candidate}/frontend/src/styles.css`, `\n${css}`);
  const allFiles = files(candidate);
  const modified = allFiles.filter(file => !fs.existsSync(`${baseline}/${file}`) || sha(`${baseline}/${file}`) !== sha(`${candidate}/${file}`));
  assert.deepEqual(modified.sort(), [sourcePath, "frontend/src/styles.css", testPath].sort());
  for (const directory of ["frontend", "shared/domain"]) for (const file of files(`${baseline}/${directory}`)) assert(fs.existsSync(`${candidate}/${directory}/${file}`), "Protected source disappeared");
  const manifest = { status: "PREPARED", task, id, candidate, baseline, preparedAt: new Date().toISOString(), modified, cssSupplement: cssPath, cssSupplementSha256: sha(cssPath), backendChanged: false, javaScriptChanged: true, apiRestartRequired: false, noDependenciesChanged: true, files: allFiles.map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) })) };
  fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(manifest, null, 2), { flag: "wx" });
  const inputs = ["fixtures.ts", "testData.ts", "assets/vazirmatn-arabic.woff2", "assets/vazirmatn-latin.woff2"].map(file => `frontend/tests/e2e/${file}`);
  fs.writeFileSync(`${evidence}/e2e-test-prerequisites.json`, JSON.stringify({ candidateManifestSha256: sha(`${evidence}/candidate.json`), files: inputs.map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) })) }, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ status: "PREPARED", task, modified, protectedStaticFiles: staticFiles.length, apiPid: api.pid }));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await prepare();
