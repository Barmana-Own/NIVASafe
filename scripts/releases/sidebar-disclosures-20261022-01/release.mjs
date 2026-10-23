import fs from "node:fs";
import assert from "node:assert/strict";
import { root, task, id, work, evidence, candidate, live, cssPath, sha, read, hashText, protectedUnchanged, runtimeIdentity } from "./prepare.mjs";
import { frontendPlan } from "./plan.mjs";
function atomic(file, bytes) { const temporary = `${file}.${task}.tmp`; fs.writeFileSync(temporary, bytes, { flag: "wx" }); fs.renameSync(temporary, file); }
async function publicBytes(url, bytes) {
  const response = await fetch(`https://app.nivasafe.com${url}`, { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200); assert(Buffer.from(await response.arrayBuffer()).equals(bytes), `Public bytes differ: ${url}`);
}
assert(process.argv.includes("--deploy")); assert(!fs.existsSync(`${evidence}/deployment.json`));
let published = false, originalBytes;
try {
  const manifest = read(`${evidence}/candidate.json`), before = read(`${evidence}/runtime-before.json`), build = read(`${evidence}/build-validation.json`), browser = read(`${evidence}/e2e-validation.json`), review = read(`${evidence}/security-review.json`);
  for (const gate of [build, browser, review]) { assert.equal(gate.status, "PASS"); assert.equal(gate.candidateManifestSha256, sha(`${evidence}/candidate.json`)); }
  for (const gate of [browser, review]) assert.equal(gate.cssSupplementSha256, manifest.cssSupplementSha256);
  assert.equal(review.browserEvidenceSha256, sha(`${evidence}/e2e-validation.json`)); assert.equal(review.buildEvidenceSha256, sha(`${evidence}/build-validation.json`));
  for (const helper of ["prepare.mjs", "validate.mjs", "plan.mjs", "release.mjs", "browser.mjs"]) assert.equal(sha(`${root}/scripts/releases/${task}/${helper}`), review.reviewedHelpersSha256[helper]);
  for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
  for (const file of build.artifacts) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
  for (const file of manifest.rootAfter) assert.equal(sha(`${root}/${file.path}`), file.sha256);
  assert.equal(sha(cssPath), manifest.cssSupplementSha256);
  originalBytes = fs.readFileSync(`${work}/index.before.html`); assert.equal(hashText(originalBytes), before.indexSha256);
  const plan = frontendPlan(); assert.deepEqual(plan, read(`${evidence}/frontend-plan.json`)); assert.equal(sha(`${work}/test-index.html`), plan.htmlSha256); assert.equal(browser.hybridIndexSha256, plan.htmlSha256);
  assert.equal(plan.preservedStylesheets.length, 13);
  for (const file of browser.candidateStaticInputs) assert.equal(sha(`${candidate}/frontend/dist/${file.path}`), file.sha256);
  for (const file of browser.liveStaticInputs) assert.equal(sha(`${live}/${file.path}`), file.sha256);
  protectedUnchanged(before); assert.deepEqual(await runtimeIdentity(), before.api);
  const addedAssets = [];
  for (const asset of [...plan.assets, { url: plan.cssAsset, sha256: manifest.cssSupplementSha256 }]) {
    const source = asset.url === plan.cssAsset ? cssPath : `${candidate}/frontend/dist${asset.url}`, destination = `${live}${asset.url}`;
    assert.equal(sha(source), asset.sha256);
    if (fs.existsSync(destination)) assert.equal(sha(destination), asset.sha256);
    else { fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL); addedAssets.push(asset.url); }
  }
  for (const url of addedAssets) await publicBytes(url, fs.readFileSync(`${live}${url}`));
  protectedUnchanged(before); atomic(`${live}/index.html`, plan.html); published = true;
  await publicBytes("/profile", Buffer.from(plan.html));
  protectedUnchanged(before, true); assert.deepEqual(await runtimeIdentity(), before.api);
  const result = { status: "DEPLOYED", task, id, at: new Date().toISOString(), frontendOnly: true, approvedRuntimeSource: manifest.approvedRuntimeSource, navigationTreeRoutesRolesAndPendingEntriesPreserved: true, backendUnchanged: true, databaseUntouched: true, apiRestarted: false, api: before.api, privateEnvironmentAndProxyUnchanged: true, preservedPriorStaticFiles: before.staticFiles.length - 1, preservedStylesheets: plan.preservedStylesheets, oldEntry: plan.oldEntry, newEntry: plan.newEntry, cssAsset: plan.cssAsset, cssSha256: manifest.cssSupplementSha256, addedAssets, newFiles: [...plan.assets, { url: plan.cssAsset, sha256: manifest.cssSupplementSha256 }], oldIndexSha256: before.indexSha256, newIndexSha256: sha(`${live}/index.html`), rollbackIndex: `${work}/index.before.html` };
  fs.writeFileSync(`${evidence}/deployment.json`, JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify({ status: result.status, task, newEntry: plan.newEntry, cssAsset: plan.cssAsset, addedAssets: addedAssets.length, apiPid: before.api.pid }));
} catch (error) {
  let recovery = "NOT_REQUIRED";
  if (published) { try { atomic(`${live}/index.html`, originalBytes); await publicBytes("/profile", originalBytes); recovery = "OLD_INDEX_RESTORED_IMMUTABLE_ASSETS_RETAINED"; } catch { recovery = "FAILED_REQUIRES_ATTENTION"; } }
  const result = { status: "FAIL", task, error: error.message, recovery };
  fs.writeFileSync(`${evidence}/deployment-failure-${Date.now()}.json`, JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify(result)); process.exitCode = 1;
}
