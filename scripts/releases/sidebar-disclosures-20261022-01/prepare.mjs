import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { sha, read, hashText, files, liveFiles } from "../rula-connected-overlay-20261022-01/prepare.mjs";
import { runtimeIdentity, protectedUnchanged } from "../member-directory-cards-20261022-01/prepare.mjs";
export { sha, read, hashText, files, runtimeIdentity, protectedUnchanged };
export const root = "C:/NIVASafe", task = "sidebar-disclosures-20261022-01", id = `release-${task}`;
export const work = `${root}/.local/${task}`, evidence = `${root}/reports/evidence/${task}`;
export const baseline = `${root}/.local/hide-image-authorizations-20261022-01/candidate`, candidate = `${work}/candidate`;
export const live = "C:/inetpub/nivasafe/app-com", config = `${root}/deployment/ecosystem.config.cjs`, proxy = "C:/Runtime/nginx/conf/nginx.conf", cssPath = `${work}/sidebar-disclosures.css`;
export const navPath = "frontend/src/layout/SidebarNavigation.tsx", testPath = "frontend/src/layout/SidebarNavigation.test.tsx", layoutPath = "frontend/src/layout/AppLayout.tsx", stylePath = "frontend/src/styles.css";
const layoutBefore = "location={location} collapsed={sidebarCollapsed} activeIds={activeNavigationIds}", layoutAfter = "location={location} collapsed={sidebarCollapsed && !mobileViewport} activeIds={activeNavigationIds}";
export function transformLayout(bytes) {
  const original = bytes.toString("utf8"); assert.equal(original.split(layoutBefore).length, 2);
  const result = original.replace(layoutBefore, layoutAfter); assert.equal(result.replace(layoutAfter, layoutBefore), original); return Buffer.from(result);
}
function eols(template, original) { return Buffer.from(template.toString("utf8").replace(/\r?\n/gu, original.toString("utf8").includes("\r\n") ? "\r\n" : "\n")); }
async function prepare() {
  assert(!fs.existsSync(`${evidence}/candidate.json`));
  const prior = read(`${root}/reports/evidence/hide-image-authorizations-20261022-01/candidate.json`);
  for (const file of prior.files) assert.equal(sha(`${baseline}/${file.path}`), file.sha256);
  for (const file of [navPath, testPath]) assert.equal(sha(`${root}/${file}`), sha(`${baseline}/${file}`), `Preserve unknown root edits: ${file}`);
  const css = fs.readFileSync(`${root}/scripts/releases/${task}/sidebar-disclosures.css`), nav = fs.readFileSync(`${root}/scripts/releases/${task}/SidebarNavigation.tsx`), test = fs.readFileSync(`${root}/scripts/releases/${task}/SidebarNavigation.test.tsx`);
  const oldRoot = Object.fromEntries([navPath, testPath, layoutPath, stylePath].map(file => [file, fs.readFileSync(`${root}/${file}`)]));
  assert(!oldRoot[stylePath].toString("utf8").includes("/* Owner-requested nested sidebar disclosure buttons. */"));
  const rootAfter = { [navPath]: eols(nav, oldRoot[navPath]), [testPath]: eols(test, oldRoot[testPath]), [layoutPath]: transformLayout(oldRoot[layoutPath]), [stylePath]: Buffer.concat([oldRoot[stylePath], Buffer.from("\n"), css]) };
  transformLayout(fs.readFileSync(`${baseline}/${layoutPath}`));
  fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(evidence, { recursive: true });
  const api = await runtimeIdentity();
  const before = { capturedAt: new Date().toISOString(), api, envSha256: sha(`${root}/.env`), configSha256: sha(config), proxySha256: sha(proxy), indexSha256: sha(`${live}/index.html`), staticFiles: liveFiles().map(file => ({ path: file, sha256: sha(`${live}/${file}`) })) };
  assert.equal(before.indexSha256, read(`${root}/reports/evidence/hide-image-authorizations-20261022-01/deployment.json`).newIndexSha256);
  fs.writeFileSync(`${evidence}/runtime-before.json`, JSON.stringify(before, null, 2), { flag: "wx" });
  fs.copyFileSync(`${live}/index.html`, `${work}/index.before.html`, fs.constants.COPYFILE_EXCL);
  for (const [file, bytes] of Object.entries(oldRoot)) fs.writeFileSync(`${work}/${path.basename(file)}.root.before`, bytes, { flag: "wx" });
  fs.writeFileSync(cssPath, css, { flag: "wx" });
  const excluded = new Set(["node_modules", "dist", ".turbo", ".vite-cache", "__pycache__", "playwright-results", "playwright-report"]);
  const filter = source => !excluded.has(path.basename(source)) && !source.endsWith(".tsbuildinfo") && !path.basename(source).startsWith(".env");
  fs.mkdirSync(candidate);
  for (const directory of ["frontend", "shared/domain"]) fs.cpSync(`${baseline}/${directory}`, `${candidate}/${directory}`, { recursive: true, filter });
  for (const file of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json"]) fs.copyFileSync(`${baseline}/${file}`, `${candidate}/${file}`);
  for (const directory of ["", "frontend", "shared/domain"]) fs.symlinkSync(`${root}/${directory ? `${directory}/` : ""}node_modules`, `${candidate}/${directory ? `${directory}/` : ""}node_modules`, "junction");
  fs.writeFileSync(`${candidate}/${navPath}`, eols(nav, fs.readFileSync(`${baseline}/${navPath}`)));
  fs.writeFileSync(`${candidate}/${testPath}`, eols(test, fs.readFileSync(`${baseline}/${testPath}`)));
  fs.writeFileSync(`${candidate}/${layoutPath}`, transformLayout(fs.readFileSync(`${baseline}/${layoutPath}`)));
  fs.appendFileSync(`${candidate}/${stylePath}`, Buffer.concat([Buffer.from("\n"), css]));
  const paths = files(candidate), modified = paths.filter(file => sha(`${candidate}/${file}`) !== sha(`${baseline}/${file}`));
  assert.deepEqual(modified, [navPath, testPath, layoutPath, stylePath].sort());
  const manifest = { status: "PREPARED", task, id, baseline, candidate, modified, approvedRuntimeSource: [navPath, layoutPath, stylePath], cssSupplement: cssPath, cssSupplementSha256: sha(cssPath), javaScriptChanged: true, backendChanged: false, databaseChanged: false, noDependenciesChanged: true, navigationTreeAndRoutesUnchanged: true, files: paths.map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) })), rootBefore: Object.entries(oldRoot).map(([path, bytes]) => ({ path, sha256: hashText(bytes) })), rootAfter: Object.entries(rootAfter).map(([path, bytes]) => ({ path, sha256: hashText(bytes) })) };
  for (const file of manifest.rootBefore) assert.equal(sha(`${root}/${file.path}`), file.sha256);
  fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(manifest, null, 2), { flag: "wx" });
  for (const [file, bytes] of Object.entries(rootAfter)) fs.writeFileSync(`${root}/${file}`, bytes);
  for (const file of manifest.rootAfter) assert.equal(sha(`${root}/${file.path}`), file.sha256);
  console.log(JSON.stringify({ status: "PREPARED", task, modified, priorStaticFiles: before.staticFiles.length, apiPid: api.pid }));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await prepare();
