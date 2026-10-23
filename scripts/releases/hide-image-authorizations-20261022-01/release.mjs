import fs from "node:fs";
import assert from "node:assert/strict";
import { root, task, id, work, evidence, candidate, live, cssPath, sha, read, hashText, protectedUnchanged, runtimeIdentity } from "./prepare.mjs";
function atomic(file, bytes) { const temporary = `${file}.${task}.tmp`; fs.writeFileSync(temporary, bytes, { flag: "wx" }); fs.renameSync(temporary, file); }
async function publicBytes(url, expected) {
  const response = await fetch(`https://app.nivasafe.com${url}`, { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200); assert(Buffer.from(await response.arrayBuffer()).equals(expected), `Public bytes differ: ${url}`);
}
assert(process.argv.includes("--deploy"), "Use an explicit deployment action");
assert(!fs.existsSync(`${evidence}/deployment.json`));
let published = false, originalBytes;
try {
  const manifest = read(`${evidence}/candidate.json`), before = read(`${evidence}/runtime-before.json`);
  const build = read(`${evidence}/build-validation.json`), browser = read(`${evidence}/e2e-validation.json`), review = read(`${evidence}/security-review.json`);
  for (const gate of [build, browser, review]) { assert.equal(gate.status, "PASS"); assert.equal(gate.candidateManifestSha256, sha(`${evidence}/candidate.json`)); assert.equal(gate.cssSupplementSha256, manifest.cssSupplementSha256); }
  assert.equal(review.browserEvidenceSha256, sha(`${evidence}/e2e-validation.json`));
  assert.equal(review.buildEvidenceSha256, sha(`${evidence}/build-validation.json`));
  for (const helper of ["prepare.mjs", "validate.mjs", "release.mjs", "browser.mjs"]) assert.equal(sha(`${root}/scripts/releases/${task}/${helper}`), review.reviewedHelpersSha256[helper]);
  for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
  assert.equal(sha(`${root}/frontend/src/styles.css`), manifest.rootStylesAfterSha256);
  assert.equal(sha(cssPath), manifest.cssSupplementSha256);
  const css = fs.readFileSync(cssPath), cssAsset = `/assets/hide-image-authorizations-${hashText(css).slice(0, 12)}.css`;
  originalBytes = fs.readFileSync(`${work}/index.before.html`);
  assert.equal(hashText(originalBytes), before.indexSha256, "Protected rollback index differs from the live baseline");
  const original = originalBytes.toString("utf8");
  const insertion = `  <link rel="stylesheet" crossorigin href="${cssAsset}">\n`;
  assert.equal(original.split("</head>").length, 2);
  const html = original.replace("</head>", `${insertion}</head>`);
  assert.equal(html.replace(insertion, ""), original, "Unrelated index or JavaScript changed");
  protectedUnchanged(before); assert.deepEqual(await runtimeIdentity(), before.api);
  if (fs.existsSync(`${live}${cssAsset}`)) assert.equal(sha(`${live}${cssAsset}`), manifest.cssSupplementSha256);
  else fs.writeFileSync(`${live}${cssAsset}`, css, { flag: "wx" });
  await publicBytes(cssAsset, css);
  protectedUnchanged(before);
  atomic(`${live}/index.html`, html); published = true;
  await publicBytes("/profile", Buffer.from(html));
  protectedUnchanged(before, true); assert.deepEqual(await runtimeIdentity(), before.api);
  const result = { status: "DEPLOYED", task, id, at: new Date().toISOString(), cssOnly: true, frontendOnly: true, javaScriptUnchanged: true, backendUnchanged: true, databaseUntouched: true, apiRestarted: false, api: before.api, privateEnvironmentAndProxyUnchanged: true, preservedPriorStaticFiles: before.staticFiles.length - 1, preservedStylesheets: original.match(/<link\s+rel="stylesheet"[^>]*>/gu) ?? [], cssAsset, cssSha256: sha(`${live}${cssAsset}`), oldIndexSha256: before.indexSha256, newIndexSha256: sha(`${live}/index.html`), rollbackIndex: `${work}/index.before.html` };
  fs.writeFileSync(`${evidence}/deployment.json`, JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify(result));
} catch (error) {
  let recovery = "NOT_REQUIRED";
  if (published) { try { atomic(`${live}/index.html`, originalBytes); await publicBytes("/profile", originalBytes); recovery = "OLD_INDEX_RESTORED_NEW_IMMUTABLE_CSS_RETAINED"; } catch { recovery = "FAILED_REQUIRES_ATTENTION"; } }
  const result = { status: "FAIL", task, error: error.message, recovery };
  fs.writeFileSync(`${evidence}/deployment-failure-${Date.now()}.json`, JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify(result)); process.exitCode = 1;
}
