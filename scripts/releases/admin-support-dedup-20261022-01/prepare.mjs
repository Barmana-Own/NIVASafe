import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { sha, read, hashText, files, liveFiles } from "../rula-connected-overlay-20261022-01/prepare.mjs";
import { runtimeIdentity, protectedUnchanged } from "../member-directory-cards-20261022-01/prepare.mjs";
export { sha, read, hashText, files, runtimeIdentity, protectedUnchanged };
export const root = "C:/NIVASafe", task = "admin-support-dedup-20261022-01", id = `release-${task}`;
export const work = `${root}/.local/${task}`, evidence = `${root}/reports/evidence/${task}`;
export const baseline = `${root}/.local/member-directory-cards-20261022-01/candidate`, candidate = `${work}/candidate`;
export const live = "C:/inetpub/nivasafe/app-com", config = `${root}/deployment/ecosystem.config.cjs`, proxy = "C:/Runtime/nginx/conf/nginx.conf";
export const sourcePath = "frontend/src/features/admin/AdminPanelPage.tsx", testPath = "frontend/src/features/admin/adminWorkspace.test.tsx";
export const edits = [
  ['import { SupportInboxSection } from "../support/SupportPage";\n', ""],
  ['type GlobalAdminTab = "users" | "requests" | "ai" | "overview" | "support";', 'type GlobalAdminTab = "users" | "requests" | "ai" | "overview";'],
  ['      { id: "support", label: t("admin.workspaceSupport") },\n', ""],
  ['    <div className="admin-workspace-panel" role="tabpanel" tabIndex={0} id="global-admin-panel-support" aria-labelledby="global-admin-tab-support" hidden={activeTab !== "support"}>\n      <SectionCard title={t("support.inboxTitle")} description={t("support.inboxDescription")} icon="assistant"><SupportInboxSection/></SectionCard>\n    </div>\n', ""]
];
export function transform(bytes) {
  let result = bytes.toString("utf8");
  for (const [before, after] of edits) {
    const normalized = result.replaceAll("\r\n", "\n"), start = normalized.indexOf(before);
    assert(start >= 0 && normalized.indexOf(before, start + 1) === -1, "Removal hunk must occur exactly once");
    const boundary = position => { let original = 0, seen = 0; while (seen < position) { if (result[original] === "\r" && result[original + 1] === "\n") original++; original++; seen++; } return original; };
    const left = boundary(start), right = boundary(start + before.length);
    result = result.slice(0, left) + after + result.slice(right);
  }
  return Buffer.from(result);
}
async function prepare() {
  assert(!fs.existsSync(`${evidence}/candidate.json`));
  const prior = read(`${root}/reports/evidence/member-directory-cards-20261022-01/candidate.json`);
  for (const file of prior.files) assert.equal(sha(`${baseline}/${file.path}`), file.sha256);
  const rootBefore = fs.readFileSync(`${root}/${sourcePath}`), rootAfter = transform(rootBefore);
  const candidateBefore = fs.readFileSync(`${baseline}/${sourcePath}`), candidateAfter = transform(candidateBefore);
  assert(!fs.existsSync(`${root}/${testPath}`) && !fs.existsSync(`${baseline}/${testPath}`));
  fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(evidence, { recursive: true });
  const api = await runtimeIdentity();
  const before = { capturedAt: new Date().toISOString(), api, envSha256: sha(`${root}/.env`), configSha256: sha(config), proxySha256: sha(proxy), indexSha256: sha(`${live}/index.html`), staticFiles: liveFiles().map(file => ({ path: file, sha256: sha(`${live}/${file}`) })) };
  assert.equal(before.indexSha256, read(`${root}/reports/evidence/member-directory-cards-20261022-01/deployment.json`).newIndexSha256);
  fs.writeFileSync(`${evidence}/runtime-before.json`, JSON.stringify(before, null, 2), { flag: "wx" });
  fs.copyFileSync(`${live}/index.html`, `${work}/index.before.html`, fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(`${work}/AdminPanelPage.root.before.tsx`, rootBefore, { flag: "wx" });
  const excluded = new Set(["node_modules", "dist", ".turbo", ".vite-cache", "__pycache__", "playwright-results", "playwright-report"]);
  const filter = source => !excluded.has(path.basename(source)) && !source.endsWith(".tsbuildinfo") && !path.basename(source).startsWith(".env");
  fs.mkdirSync(candidate);
  for (const directory of ["frontend", "shared/domain"]) fs.cpSync(`${baseline}/${directory}`, `${candidate}/${directory}`, { recursive: true, filter });
  for (const file of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json"]) fs.copyFileSync(`${baseline}/${file}`, `${candidate}/${file}`);
  for (const directory of ["", "frontend", "shared/domain"]) fs.symlinkSync(`${root}/${directory ? `${directory}/` : ""}node_modules`, `${candidate}/${directory ? `${directory}/` : ""}node_modules`, "junction");
  fs.writeFileSync(`${candidate}/${sourcePath}`, candidateAfter);
  const test = fs.readFileSync(`${root}/scripts/releases/${task}/adminWorkspace.test.tsx`);
  fs.writeFileSync(`${candidate}/${testPath}`, test, { flag: "wx" });
  const paths = files(candidate), modified = paths.filter(file => !fs.existsSync(`${baseline}/${file}`) || sha(`${candidate}/${file}`) !== sha(`${baseline}/${file}`));
  assert.deepEqual(modified, [sourcePath, testPath].sort());
  const manifest = { status: "PREPARED", task, id, baseline, candidate, modified, approvedRuntimeSource: [sourcePath], intentionalRemoval: "Duplicate AdminPanel support tab and mounted inbox only", dedicatedSupportAndSidebarPreserved: true, backendChanged: false, databaseChanged: false, noDependenciesChanged: true, files: paths.map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) })), rootSourceBeforeSha256: hashText(rootBefore), rootSourceAfterSha256: hashText(rootAfter), testSha256: hashText(test) };
  assert.equal(sha(`${root}/${sourcePath}`), manifest.rootSourceBeforeSha256);
  fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(manifest, null, 2), { flag: "wx" });
  fs.writeFileSync(`${root}/${sourcePath}`, rootAfter); fs.writeFileSync(`${root}/${testPath}`, test, { flag: "wx" });
  assert.equal(sha(`${root}/${sourcePath}`), manifest.rootSourceAfterSha256);
  console.log(JSON.stringify({ status: "PREPARED", task, modified, priorStaticFiles: before.staticFiles.length, apiPid: api.pid }));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await prepare();
