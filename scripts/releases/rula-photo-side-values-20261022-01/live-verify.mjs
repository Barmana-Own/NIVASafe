import fs from "node:fs";
import assert from "node:assert/strict";
import { task, id, root, evidence, live, config, sha, read, hashText, preserve, runtimeIdentity } from "./prepare.mjs";
const deployment = read(`${evidence}/deployment.json`), plan = read(`${evidence}/frontend-plan.json`), before = read(`${evidence}/runtime-before.json`), dom = read(`${evidence}/live-dom.json`);
assert.equal(deployment.status, "DEPLOYED"); assert(!fs.existsSync(`${evidence}/live-ui.json`));
assert.equal(dom.url, "https://app.nivasafe.com/files"); assert.equal(dom.pageNotFound, false); assert.equal(dom.horizontalOverflow, false);
assert.deepEqual(dom.scripts, [deployment.newEntry]);
assert.deepEqual(dom.stylesheets, plan.preservedStylesheets.map(link => link.match(/href="([^"]+)"/u)[1])); assert.equal(dom.stylesheets.length, 14);
assert.deepEqual(dom.headings, ["مدیریت فایل‌ها", "گزارش‌های نهایی ارزیابی"]);
preserve(before, true, true); assert.equal(sha(config), deployment.newConfigSha256); assert.equal(sha(`${live}/index.html`), deployment.newIndexSha256);
const api = await runtimeIdentity(id), publicAssets = [];
for (const asset of plan.assets) {
  const response = await fetch(`https://app.nivasafe.com${asset.url}`, { signal: AbortSignal.timeout(15000), headers: { "cache-control": "no-cache" } });
  assert.equal(response.status, 200); const bytes = Buffer.from(await response.arrayBuffer()); assert.equal(hashText(bytes), asset.sha256); publicAssets.push({ url: asset.url, sha256: asset.sha256 });
}
const response = await fetch("https://app.nivasafe.com/files", { signal: AbortSignal.timeout(15000), headers: { "cache-control": "no-cache" } }); assert.equal(response.status, 200); assert.equal(hashText(Buffer.from(await response.arrayBuffer())), deployment.newIndexSha256);
const publicHealth = await fetch("https://app.nivasafe.com/api/v1/health", { signal: AbortSignal.timeout(15000) }); assert.equal(publicHealth.status, 200); const health = await publicHealth.json(); assert.equal(health.data.version, id); assert.equal(health.data.database, "up");
let screenshot = `${evidence}/live-files-readonly.png`; const image = fs.readFileSync(screenshot); const jpeg = image[0] === 0xff && image[1] === 0xd8;
if (jpeg) { const destination = `${evidence}/live-files-readonly.jpg`; assert(!fs.existsSync(destination)); fs.renameSync(screenshot, destination); screenshot = destination; }
const result = { status: "PASS", task, at: new Date().toISOString(), candidateManifestSha256: sha(`${evidence}/candidate.json`), deploymentSha256: sha(`${evidence}/deployment.json`), helperSha256: sha(new URL(import.meta.url)), api, url: dom.url, browserTab: "23", observedScript: deployment.newEntry, stylesheetCount: 14, priorStylesheetsExact: true, screenshot: { path: screenshot, sha256: sha(screenshot), format: jpeg ? "JPEG" : "PNG" }, domEvidenceSha256: sha(`${evidence}/live-dom.json`), publicIndexSha256: deployment.newIndexSha256, publicAssets, preservation: { oldStaticFiles: before.staticFiles.length - 1, envAndProxyUnchanged: true, configOnlyReviewedApiEntryAndVersion: true, databaseSchemaUnchanged: true }, observedUserInterface: "Existing read-only Files/report-list page loaded with current module; no overflow or missing-page state", actualRulaBehavior: "PASS_ISOLATED_17_SCENARIOS_FROZEN_BUILD", realProductionInference: "NOT_RUN_NO_CUSTOMER_IMAGE_TRANSFER", customerDraftAutosave: "NOT_TRIGGERED_NO_LIVE_RULA_CREATE_OR_EDIT_OPENED", businessDataMutations: 0, initialUnlistedReportsPath: "Existing not-found state; followed visible Reports and Files navigation to /files; no application change" };
fs.writeFileSync(`${evidence}/live-ui.json`, JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify({ status: "PASS", task, apiVersion: api.version, publicAssets: publicAssets.length, stylesheetCount: 14, screenshot }));
