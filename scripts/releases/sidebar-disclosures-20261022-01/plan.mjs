import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { task, work, evidence, candidate, live, cssPath, sha, read, hashText } from "./prepare.mjs";
function entry(html) { const matches = [...html.matchAll(/<script\s+type="module"\s+crossorigin\s+src="([^"]+\.js)"><\/script>/gu)]; assert.equal(matches.length, 1); return matches[0][1]; }
export function frontendPlan() {
  const originalBytes = fs.readFileSync(`${work}/index.before.html`), original = originalBytes.toString("utf8"), built = fs.readFileSync(`${candidate}/frontend/dist/index.html`, "utf8");
  assert.equal(hashText(originalBytes), read(`${evidence}/runtime-before.json`).indexSha256);
  const oldEntry = entry(original), newEntry = entry(built); assert.notEqual(oldEntry, newEntry); assert.equal(original.split(oldEntry).length, 2);
  const cssAsset = `/assets/sidebar-disclosures-${sha(cssPath).slice(0, 12)}.css`, insertion = `  <link rel="stylesheet" crossorigin href="${cssAsset}">\n`;
  assert.equal(original.split("</head>").length, 2);
  const html = original.replace(oldEntry, newEntry).replace("</head>", `${insertion}</head>`);
  assert.equal(html.replace(insertion, "").replace(newEntry, oldEntry), original);
  const candidateCss = built.match(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"/u)?.[1], visited = new Set();
  function visit(url) {
    if (visited.has(url)) return;
    assert(/^\/assets\/[A-Za-z0-9_-]+\.(?:js|css)$/u.test(url)); assert.notEqual(url, candidateCss, "Never publish the rebuilt global stylesheet");
    const source = `${candidate}/frontend/dist${url}`; assert(fs.statSync(source).isFile()); visited.add(url);
    if (url.endsWith(".css")) { assert(fs.existsSync(`${live}${url}`)); assert.equal(sha(source), sha(`${live}${url}`), "Changed route CSS is outside scope"); }
    if (url.endsWith(".js")) for (const match of fs.readFileSync(source, "utf8").matchAll(/["'`](?:\.\/|\/)?((?:assets\/)?[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(?:js|css))["'`]/gu)) visit(`/assets/${path.posix.basename(match[1])}`);
  }
  visit(newEntry);
  return { task, oldEntry, newEntry, html, htmlSha256: hashText(html), cssAsset, cssSupplementSha256: sha(cssPath), assets: [...visited].sort().map(url => ({ url, sha256: sha(`${candidate}/frontend/dist${url}`) })), preservedStylesheets: original.match(/<link\s+rel="stylesheet"[^>]*>/gu) ?? [] };
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const plan = frontendPlan(); assert.equal(plan.preservedStylesheets.length, 13);
  fs.writeFileSync(`${work}/test-index.html`, plan.html, { flag: "wx" });
  fs.writeFileSync(`${evidence}/frontend-plan.json`, JSON.stringify(plan, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ status: "READY", task, newEntry: plan.newEntry, assets: plan.assets.length, cssAsset: plan.cssAsset, preservedStylesheets: plan.preservedStylesheets.length }));
}
