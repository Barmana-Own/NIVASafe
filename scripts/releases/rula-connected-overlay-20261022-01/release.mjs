import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { root, task, id, work, evidence, candidate, live, config, proxy, sha, read, hashText, runtimeIdentity } from "./prepare.mjs";

function atomic(file, bytes) {
  const temporary = `${file}.${task}.tmp`;
  fs.writeFileSync(temporary, bytes, { flag: "wx" });
  fs.renameSync(temporary, file);
}
function entry(html) {
  const matches = [...html.matchAll(/<script\s+type="module"\s+crossorigin\s+src="([^"]+\.js)"><\/script>/gu)];
  assert.equal(matches.length, 1, "Expected exactly one module entrypoint");
  return matches[0][1];
}
function protectedFilesUnchanged(before, allowNewIndex = false) {
  assert.equal(sha(`${root}/.env`), before.envSha256, "Private environment changed");
  assert.equal(sha(config), before.configSha256, "Backend boot configuration changed");
  assert.equal(sha(proxy), before.proxySha256, "Reverse proxy changed");
  for (const file of before.staticFiles) if (!(allowNewIndex && file.path === "index.html")) assert.equal(sha(`${live}/${file.path}`), file.sha256, `Protected live asset changed: ${file.path}`);
}
function frontendPlan(manifest) {
  const original = fs.readFileSync(`${work}/index.before.html`, "utf8");
  const built = fs.readFileSync(`${candidate}/frontend/dist/index.html`, "utf8");
  const oldEntry = entry(original), newEntry = entry(built);
  assert.notEqual(newEntry, oldEntry, "Candidate JavaScript does not contain the requested overlay change");
  assert.equal(original.split(oldEntry).length, 2);
  assert.equal(sha(manifest.cssSupplement), manifest.cssSupplementSha256);
  const css = fs.readFileSync(manifest.cssSupplement, "utf8");
  const cssAsset = `/assets/rula-skeleton-lines-${hashText(css).slice(0, 12)}.css`;
  const stylesheet = `<link rel="stylesheet" crossorigin href="${cssAsset}">`;
  const insertion = `  ${stylesheet}\n`;
  const html = original.replace(oldEntry, newEntry).replace("</head>", `${insertion}</head>`);
  assert.equal(html.replace(newEntry, oldEntry).replace(insertion, ""), original, "Unrelated HTML changed");
  const stylesheets = source => source.match(/<link\s+rel="stylesheet"[^>]*>/gu) ?? [];
  assert.deepEqual(stylesheets(html).filter(tag => tag !== stylesheet), stylesheets(original));
  const visited = new Set();
  const candidateCss = built.match(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"/u)?.[1];
  function visit(url) {
    if (visited.has(url)) return;
    assert(/^\/assets\/[A-Za-z0-9_-]+\.(?:js|css)$/u.test(url), "Unexpected generated asset path");
    assert.notEqual(url, candidateCss, "Candidate global CSS must not replace the existing production styles");
    const file = `${candidate}/frontend/dist${url}`;
    assert(fs.statSync(file).isFile());
    visited.add(url);
    const contents = fs.readFileSync(file, "utf8");
    for (const match of contents.matchAll(/["'`](?:\.\/|\/)?((?:assets\/)?[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(?:js|css))["'`]/gu)) visit(`/assets/${path.posix.basename(match[1])}`);
  }
  visit(newEntry);
  return { html, oldEntry, newEntry, css, cssAsset, assets: [...visited], preservedStylesheets: stylesheets(original) };
}
async function publicArtifact(url, expected) {
  const response = await fetch(`https://app.nivasafe.com${url}`, { headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `Published artifact unavailable: ${url}`);
  assert(Buffer.from(await response.arrayBuffer()).equals(expected), `Published artifact differs: ${url}`);
}

assert(process.argv.includes("--deploy"), "Publication requires an explicit --deploy action");
assert(!fs.existsSync(`${evidence}/deployment.json`), "Publication is already recorded");
let published = false;
try {
  const build = read(`${evidence}/build-validation.json`);
  assert.equal(build.status, "PASS", "Frontend validation must finish first");
  const tests = read(`${evidence}/frontend-tests-final.json`);
  assert(tests.success && tests.numFailedTests === 0 && tests.numPendingTests === 0, "Frontend tests are incomplete");
  assert.equal(read(`${evidence}/security-review.json`).status, "PASS", "Scoped security review must finish first");
  const before = read(`${evidence}/runtime-before.json`);
  const manifest = read(`${evidence}/candidate.json`);
  for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256, `Frozen source changed after validation: ${file.path}`);
  for (const file of read(`${evidence}/test-contract-sources.json`).files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256, `Frozen test prerequisite changed after validation: ${file.path}`);
  assert(Array.isArray(build.artifacts) && build.artifacts.length > 0, "Build outputs must be hash-bound to the successful validation");
  for (const file of build.artifacts) assert.equal(sha(`${candidate}/frontend/dist/${file.path}`), file.sha256, `Validated build output changed: ${file.path}`);
  protectedFilesUnchanged(before);
  assert.deepEqual(await runtimeIdentity(), before.api, "API identity changed before frontend publication");
  const plan = frontendPlan(manifest);
  const addedAssets = [];
  for (const asset of plan.assets) {
    const source = `${candidate}/frontend/dist${asset}`, destination = `${live}${asset}`;
    if (fs.existsSync(destination)) assert.equal(sha(source), sha(destination), "An existing generated asset cannot be overwritten");
    else { fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL); addedAssets.push(asset); }
  }
  const cssFile = `${live}${plan.cssAsset}`;
  if (fs.existsSync(cssFile)) assert.equal(fs.readFileSync(cssFile, "utf8"), plan.css);
  else { fs.writeFileSync(cssFile, plan.css, { flag: "wx" }); addedAssets.push(plan.cssAsset); }
  for (const asset of addedAssets) await publicArtifact(asset, fs.readFileSync(`${live}${asset}`));
  protectedFilesUnchanged(before);
  atomic(`${live}/index.html`, plan.html);
  published = true;
  await publicArtifact("/", Buffer.from(plan.html));
  protectedFilesUnchanged(before, true);
  assert.deepEqual(await runtimeIdentity(), before.api, "API identity changed after frontend publication");
  const result = { status: "DEPLOYED", task, id, at: new Date().toISOString(), frontendOnly: true, apiUnchanged: before.api, apiRestarted: false, privateEnvironmentUnchanged: true, reverseProxyUnchanged: true, allPriorStaticAssetsRetained: true, preservedPriorStaticFiles: before.staticFiles.length - 1, preservedStylesheets: plan.preservedStylesheets, oldEntry: plan.oldEntry, newEntry: plan.newEntry, cssSupplement: plan.cssAsset, addedAssets, oldIndexSha256: before.indexSha256, newIndexSha256: sha(`${live}/index.html`), rollbackIndex: `${work}/index.before.html`, newFiles: addedAssets.map(url => ({ url, sha256: sha(`${live}${url}`) })) };
  fs.writeFileSync(`${evidence}/deployment.json`, JSON.stringify(result, null, 2), { flag: "wx" });
  console.log(JSON.stringify(result));
} catch (error) {
  let recovery = { status: "NOT_REQUIRED", indexSwitched: false };
  if (published) {
    try {
      const previous = fs.readFileSync(`${work}/index.before.html`);
      atomic(`${live}/index.html`, previous);
      await publicArtifact("/", previous);
      recovery = { status: "RESTORED", indexSwitched: true, addedImmutableAssetsRetained: true };
    } catch { recovery = { status: "FAILED_REQUIRES_ATTENTION", indexSwitched: true }; }
  }
  const result = { status: "FAILED", task, at: new Date().toISOString(), error: error.message, recovery };
  const file = `${evidence}/deployment-failure-${Date.now()}.json`;
  fs.writeFileSync(file, JSON.stringify(result, null, 2), { flag: "wx" });
  console.log(JSON.stringify(result));
  process.exitCode = 1;
}
