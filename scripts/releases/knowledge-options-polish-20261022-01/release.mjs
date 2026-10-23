import fs from "node:fs";
import assert from "node:assert/strict";
import { root, task, id, work, evidence, candidate, live, config, proxy, sha, read, hashText, runtimeIdentity } from "./prepare.mjs";

function atomic(file, bytes) { const temporary = `${file}.${task}.tmp`; fs.writeFileSync(temporary, bytes, { flag: "wx" }); fs.renameSync(temporary, file); }
function protectedUnchanged(before, allowIndex = false) {
  assert.equal(sha(`${root}/.env`), before.envSha256);
  assert.equal(sha(config), before.configSha256);
  assert.equal(sha(proxy), before.proxySha256);
  for (const file of before.staticFiles) if (!(allowIndex && file.path === "index.html")) assert.equal(sha(`${live}/${file.path}`), file.sha256, `Protected production file changed: ${file.path}`);
}
async function publicBytes(url, bytes) {
  const response = await fetch(`https://app.nivasafe.com${url}`, { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200);
  assert(Buffer.from(await response.arrayBuffer()).equals(bytes), `Public asset differs: ${url}`);
}
assert(process.argv.includes("--deploy"));
assert(!fs.existsSync(`${evidence}/deployment.json`));
let published = false;
try {
  const manifestPath = `${evidence}/candidate.json`, manifest = read(manifestPath);
  const before = read(`${evidence}/runtime-before.json`);
  const build = read(`${evidence}/build-validation.json`), browser = read(`${evidence}/e2e-validation.json`), review = read(`${evidence}/security-review.json`);
  for (const record of [build, browser, review]) assert.equal(record.status, "PASS");
  assert.equal(browser.candidateManifestSha256, sha(manifestPath));
  assert.equal(review.candidateManifestSha256, sha(manifestPath));
  assert.equal(browser.cssSupplementSha256, manifest.cssSupplementSha256);
  assert.equal(review.cssSupplementSha256, manifest.cssSupplementSha256);
  assert.equal(browser.total, 5); assert.equal(browser.passed, 5); assert.equal(browser.failed, 0); assert.equal(browser.pending, 0);
  for (const helper of ["prepare.mjs", "validate.mjs", "release.mjs"]) assert.equal(sha(`${root}/scripts/releases/${task}/${helper}`), review.reviewedHelpersSha256?.[helper]);
  for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
  for (const file of browser.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
  for (const file of build.artifacts) assert.equal(sha(`${candidate}/frontend/dist/${file.path}`), file.sha256);
  assert.equal(sha(manifest.cssSupplement), manifest.cssSupplementSha256);
  const css = fs.readFileSync(manifest.cssSupplement, "utf8");
  const cssAsset = `/assets/knowledge-options-${hashText(css).slice(0, 12)}.css`;
  const original = fs.readFileSync(`${work}/index.before.html`, "utf8");
  const stylesheet = `<link rel="stylesheet" crossorigin href="${cssAsset}">`, insertion = `  ${stylesheet}\n`;
  assert.equal(original.split("</head>").length, 2);
  const html = original.replace("</head>", `${insertion}</head>`);
  assert.equal(html.replace(insertion, ""), original, "Unrelated HTML or JavaScript entry changed");
  protectedUnchanged(before);
  assert.deepEqual(await runtimeIdentity(), before.api);
  if (fs.existsSync(`${live}${cssAsset}`)) assert.equal(fs.readFileSync(`${live}${cssAsset}`, "utf8"), css);
  else fs.writeFileSync(`${live}${cssAsset}`, css, { flag: "wx" });
  await publicBytes(cssAsset, Buffer.from(css));
  protectedUnchanged(before);
  atomic(`${live}/index.html`, html); published = true;
  await publicBytes("/knowledge", Buffer.from(html));
  protectedUnchanged(before, true);
  assert.deepEqual(await runtimeIdentity(), before.api);
  const result = { status: "DEPLOYED", task, id, at: new Date().toISOString(), cssOnly: true, frontendOnly: true, javaScriptUnchanged: true, apiRestarted: false, apiUnchanged: before.api, privateEnvironmentUnchanged: true, reverseProxyUnchanged: true, preservedPriorStaticFiles: before.staticFiles.length - 1, preservedStylesheets: original.match(/<link\s+rel="stylesheet"[^>]*>/gu) ?? [], cssAsset, cssSha256: sha(`${live}${cssAsset}`), oldIndexSha256: before.indexSha256, newIndexSha256: sha(`${live}/index.html`), rollbackIndex: `${work}/index.before.html` };
  fs.writeFileSync(`${evidence}/deployment.json`, JSON.stringify(result, null, 2), { flag: "wx" });
  console.log(JSON.stringify(result));
} catch (error) {
  let recovery = "NOT_REQUIRED";
  if (published) { try { const previous = fs.readFileSync(`${work}/index.before.html`); atomic(`${live}/index.html`, previous); await publicBytes("/knowledge", previous); recovery = "RESTORED_OLD_INDEX_NEW_IMMUTABLE_CSS_RETAINED"; } catch { recovery = "FAILED_REQUIRES_ATTENTION"; } }
  const result = { status: "FAILED", task, error: error.message, recovery };
  fs.writeFileSync(`${evidence}/deployment-failure-${Date.now()}.json`, JSON.stringify(result, null, 2), { flag: "wx" });
  console.log(JSON.stringify(result)); process.exitCode = 1;
}
