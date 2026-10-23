import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { root, task, work, evidence, live, sha, read } from "./prepare.mjs";
import { photos, project, session, recordId, parts, digest, sideRows, initialDraft, savedRecord } from "../rula-photo-side-values-20261022-01/fixtures.mjs";

// Exercise the exact deployed application with synthetic accounts on an owned
// loopback origin. No production API, account or organization data is accessed.
const require = createRequire(`${root}/frontend/package.json`);
const { chromium, expect } = require("@playwright/test");
const helper = fileURLToPath(import.meta.url);
const helperSha256 = sha(helper);
const manifestFile = `${evidence}/candidate.json`;
const runtimeFile = `${evidence}/runtime-before.json`;
const capturedIndex = `${work}/index.before.html`;
const manifest = read(manifestFile), runtime = read(runtimeFile);
const manifestSha256 = sha(manifestFile), runtimeSha256 = sha(runtimeFile);
const deployed = process.argv.includes("--deployed");
const deploymentFile = `${evidence}/deployment.json`;
const deployment = deployed ? read(deploymentFile) : null;
if (deployed) { assert.equal(deployment.status, "DEPLOYED"); assert.equal(deployment.oldIndexSha256, runtime.indexSha256); }
const expectedIndexSha256 = deployed ? deployment.newIndexSha256 : runtime.indexSha256;
const cssFile = manifest.cssSupplement ?? manifest.cssPath;
assert(cssFile, "Candidate CSS supplement path missing");
assert.equal(sha(cssFile), manifest.cssSupplementSha256);
assert.equal(sha(capturedIndex), runtime.indexSha256);
assert.equal(sha(`${live}/index.html`), expectedIndexSha256, "Live index changed before isolated QA");
if (deployed) assert.equal(sha(`${live}${deployment.cssAsset}`), manifest.cssSupplementSha256);
const css = fs.readFileSync(cssFile), originalHtml = fs.readFileSync(deployed ? `${live}/index.html` : capturedIndex);
const output = `${evidence}/${deployed ? "live-ui" : "e2e-validation"}.json`;
assert(!fs.existsSync(output), "Preserve previous browser evidence before rerunning");
const accessed = new Map();
const protectedStatic = new Map(runtime.staticFiles.map(file => [file.path, file.sha256]));
const staticRoot = path.resolve(live), fontRoot = `${root}/frontend/tests/e2e/assets`;
const targets = ".rula-image-cancel, .rula-ai-image-note.is-loading > button.secondary";

const checks = [], pageErrors = [], blockedExternalRequests = [], unexpectedApiRequests = [], rejectedMutations = [], allowedSyntheticMutations = [];
const screenshots = [];
let browser, serverClosed = false, browserClosed = false, fatal;
const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".json": "application/json" };
const server = http.createServer((request, response) => {
  try {
    assert.equal(request.method, "GET");
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    response.setHeader("cache-control", "no-store");
    if (url.pathname === "/qa/rula-cancel-hide.css") { response.setHeader("content-type", "text/css"); response.end(css); return; }
    if (url.pathname === "/qa/font-arabic.woff2" || url.pathname === "/qa/font-latin.woff2") {
      response.setHeader("content-type", "font/woff2");
      response.end(fs.readFileSync(`${fontRoot}/${url.pathname.includes("arabic") ? "vazirmatn-arabic.woff2" : "vazirmatn-latin.woff2"}`)); return;
    }
    const decoded = decodeURIComponent(url.pathname);
    assert(!decoded.includes("\\") && !decoded.includes("\0"));
    const target = path.resolve(staticRoot, `.${decoded}`);
    assert(target.startsWith(`${staticRoot}${path.sep}`), "Static traversal rejected");
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      const relative = path.relative(staticRoot, target).replaceAll("\\", "/"), digest = sha(target);
      const expected = relative === "index.html" ? expectedIndexSha256 : protectedStatic.get(relative) ?? (deployed && `/${relative}` === deployment.cssAsset ? manifest.cssSupplementSha256 : null);
      assert(expected, "Static artifact not in captured baseline or explicit release"); assert.equal(digest, expected, "Static artifact differs from frozen release input");
      if (accessed.has(relative)) assert.equal(accessed.get(relative), digest, "Static input changed during QA");
      else accessed.set(relative, digest);
      response.setHeader("content-type", mime[path.extname(target)] ?? "application/octet-stream"); response.end(fs.readFileSync(target)); return;
    }
    assert(!path.extname(decoded), "Unlisted static artifact rejected");
    response.setHeader("content-type", "text/html;charset=utf-8"); response.end(originalHtml);
  } catch { response.statusCode = 404; response.end("Not found"); }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
const stylesheet = [
  "@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;font-display:swap;src:url('/qa/font-arabic.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200F,U+FB50-FDFF,U+FE70-FEFF}",
  "@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;font-display:swap;src:url('/qa/font-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+2000-206F}",
].join("\n");
const fixtureFile = `${root}/scripts/releases/rula-photo-side-values-20261022-01/fixtures.mjs`, fixtureSha256 = sha(fixtureFile);
const selectedPhotos = photos.slice(0, 2), draftKey = `nivasafe-draft:v1:rula:${session.user.id}:${session.organizations[0].id}`;
const policyVersion = fs.readFileSync(`${work}/candidate/frontend/src/features/account/imageProcessingPolicy.ts`, "utf8").match(/ACCOUNT_IMAGE_CONSENT_VERSION = "([^"]+)"/u)[1];
function bindings() { return { candidateManifestSha256: manifestSha256, cssSupplementSha256: sha(cssFile), helperSha256, fixturesSha256: fixtureSha256, runtimeBeforeSha256: runtimeSha256, baselineIndexSha256: runtime.indexSha256, liveIndexSha256: sha(`${live}/index.html`), ...(deployed ? { deploymentSha256: sha(deploymentFile), deployedCssAsset: deployment.cssAsset } : {}), liveStaticInputs: [...accessed].map(([path, sha256]) => ({ path, sha256 })), productionNetworkRequests: 0, productionMutations: 0, realImageBytesTransferred: 0, blockedExternalRequests, rejectedApiMutations: rejectedMutations, unexpectedApiRequests, allowedSyntheticMutations, pageErrors }; }
function save(status, extra = {}) { fs.writeFileSync(output, JSON.stringify({ status, task, at: new Date().toISOString(), ...bindings(), total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, pending: 0, checks, screenshots, ...extra }, null, 2)); }
async function check(name, run) { const record = { name, status: "RUNNING" }, start = performance.now(); checks.push(record); save("RUNNING"); try { record.details = await run(); record.status = "PASS"; } catch (error) { record.status = "FAIL"; record.error = error.stack; } record.elapsedMs = Math.round(performance.now() - start); save("RUNNING"); console.log(JSON.stringify({ name, status: record.status, error: record.status === "FAIL" ? record.error : undefined })); }
async function settled(page) { await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => undefined))); }); }
async function supplement(page) { if (!deployed) await page.addStyleTag({ url: `${origin}/qa/rula-cancel-hide.css` }); await settled(page); }
async function contextPage({ width = 1440, locale = "en", theme = "white", saved = false, failFirst = false } = {}) {
  const record = savedRecord("RIGHT"); record.postureImages = record.postureImages.slice(0, 2); record.postureAnalysis.imageAssessments = record.postureAnalysis.imageAssessments.slice(0, 2);
  const state = { calls: [], releases: [], hold: !saved, failures: new Set(failFirst ? [0] : []), reads: [] }, context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "fa" ? "fa-IR" : "en-US", timezoneId: "Asia/Tehran", reducedMotion: "reduce", serviceWorkers: "block" });
  const page = await context.newPage(); page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(({ session, locale, theme, draftKey, draft }) => { localStorage.setItem("nivasafe-session", JSON.stringify(session)); localStorage.setItem("nivasafe-org", session.organizations[0].id); localStorage.setItem("nivasafe-locale", locale); localStorage.setItem("nivasafe-theme", theme); if (draft) localStorage.setItem(draftKey, JSON.stringify(draft)); }, { session, locale, theme, draftKey, draft: saved ? null : initialDraft("RIGHT") });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === "fonts.googleapis.com") { await route.fulfill({ status: 200, contentType: "text/css", body: stylesheet }); return; }
    if (url.origin !== origin) { blockedExternalRequests.push({ origin: url.origin, pathname: url.pathname }); await route.abort("blockedbyclient"); return; }
    if (!url.pathname.startsWith("/api/v1/")) { await route.continue(); return; }
    const api = url.pathname.slice("/api/v1".length), respond = (data, meta) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data, ...(meta ? { meta } : {}) }) });
    if (request.method() === "POST" && api === "/rula/posture-image-analysis") {
      const bytes = request.postDataBuffer(), photo = selectedPhotos.find(photo => bytes.includes(photo.buffer)); assert(photo, "Only generated fixture image bytes may be submitted locally");
      const call = { path: api, photo: photo.index, syntheticSha256: photo.sha256, completed: false }; state.calls.push(call); allowedSyntheticMutations.push({ method: "POST", ...call, loopbackOnly: true });
      if (state.hold) await new Promise(resolve => state.releases.push(resolve));
      if (state.failures.has(photo.index)) { await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "RULA_IMAGE_AI_UNAVAILABLE", message: "Synthetic photo analysis failure", retryable: true } }) }); call.completed = true; return; }
      const side = sideRows(photo.index, "RIGHT"); delete side.bodySide; for (const part of parts) { delete side[part].source; delete side[part].confirmedByUser; } side.overlay = { points: {} };
      await respond({ sides: { RIGHT: side }, notes: "Synthetic loopback result only", provider: "arvancloud", model: "synthetic-fixture", aiStatus: "connected", analysisRequestId: `60000000-0000-4000-8000-${String(state.calls.length).padStart(12, "0")}` }); call.completed = true; return;
    }
    if (request.method() !== "GET") { rejectedMutations.push({ method: request.method(), path: api }); await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_MUTATION_REJECTED", message: "Unexpected synthetic mutation rejected" } }) }); return; }
    state.reads.push(api);
    if (api === "/rula") { await respond(saved ? [record] : []); return; }
    if (api === "/projects") { await respond([project]); return; }
    if (api === "/rula/image-analysis-policy") { await respond({ available: true, provider: "arvancloud", reasonCode: null, consentAccepted: true, consentVersion: policyVersion }); return; }
    if (api === "/files") { await respond(selectedPhotos.map(({ buffer, sha256, index, name, ...photo }) => photo), { total: 2, page: 1, limit: 8 }); return; }
    const match = api.match(/^\/files\/([^/]+)\/download$/u); if (match) { const photo = selectedPhotos.find(photo => photo.id === match[1]); assert(photo); await route.fulfill({ status: 200, contentType: "image/png", body: photo.buffer }); return; }
    const known = { "/fmea/job-catalog": [], "/actions": [], "/organizations/current": session.organizations[0], "/organizations": session.organizations, "/notifications/summary": { items: [], unreadCount: 0, total: 0 }, "/me/ai-quota": { tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, state: "HEALTHY", serverTimestamp: "2026-10-23T12:00:00.000Z" }, "/profile": session.user, "/profile/image-processing-consent": { accepted: true, policyVersion, acceptedAt: "2026-10-23T12:00:00.000Z" }, "/profile/posture-image-authorizations": { grants: [] } };
    if (Object.hasOwn(known, api)) { await respond(known[api]); return; }
    unexpectedApiRequests.push({ method: request.method(), path: api }); await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_UNKNOWN", message: "Unexpected synthetic request" } }) });
  });
  await page.goto(`${origin}/rula${saved ? `?edit=${recordId}&step=2` : ""}`, { waitUntil: "networkidle" }); await expect(page.locator("#rula-job-search")).toBeAttached(); await settled(page);
  return { page, context, state, async release() { state.hold = false; for (const release of state.releases.splice(0)) release(); }, async close() { state.hold = false; for (const release of state.releases.splice(0)) release(); await context.close(); } };
}
async function uploadTwo(run) { await run.page.locator('input[type="file"][multiple]').setInputFiles(selectedPhotos.map(photo => ({ name: photo.name, mimeType: "image/png", buffer: photo.buffer }))); await expect(run.page.locator("fieldset:not([hidden]) .rula-posture-image-card")).toHaveCount(2); await expect.poll(() => run.state.calls.length).toBe(1); await expect(run.page.locator(".rula-ai-image-note.is-loading > button.secondary")).toHaveCount(1); }
async function review(page) { await page.locator(".wizard-actions > button.primary").click(); await expect(page.locator(".rula-analysis-image-switcher")).toBeVisible(); await settled(page); }
async function controls(page) { return page.locator(`.rula-form button:not(.rula-image-cancel):not(.rula-ai-image-note.is-loading > button.secondary), .app-sidebar`).evaluateAll(elements => elements.map(element => { const s = getComputedStyle(element); return { tag: element.tagName, class: element.className, text: element.textContent, type: element.getAttribute("type"), disabled: element.hasAttribute("disabled"), display: s.display, padding: s.padding, border: s.border, background: s.backgroundColor, color: s.color, font: s.font, radius: s.borderRadius }; })); }
async function hiddenTargets(page, locale) {
  await expect(page.locator(targets)).toHaveCount(2); const values = await page.locator(targets).evaluateAll(elements => elements.map(element => ({ class: element.className, display: getComputedStyle(element).display, text: element.textContent, parentDisplay: getComputedStyle(element.parentElement).display })));
  assert(values.every(value => value.display === "none")); await expect(page.getByRole("button", { name: locale === "fa" ? "لغو تحلیل تصاویر" : "Cancel image analysis", exact: true })).toHaveCount(0);
  const cannotFocus = await page.locator(targets).evaluateAll(elements => elements.every(element => { element.focus(); return document.activeElement !== element; })); assert(cannotFocus); return values;
}
async function inspectStoredStyles(page) {
  const rows = await page.locator(targets).evaluateAll(elements => elements.map(element => { const previous = element.getAttribute("style"); element.style.setProperty("display", "inline-flex", "important"); const s = getComputedStyle(element), result = { class: element.className, padding: s.padding, borderWidth: s.borderWidth, borderStyle: s.borderStyle, radius: s.borderRadius, minHeight: s.minHeight, fontSize: s.fontSize, fontWeight: s.fontWeight, cursor: s.cursor }; if (previous === null) element.removeAttribute("style"); else element.setAttribute("style", previous); return result; }));
  for (const row of rows) { assert.equal(row.padding, "10px 16px"); assert.equal(row.borderWidth, "1px"); assert.equal(row.borderStyle, "solid"); assert.equal(row.radius, "8px"); assert.equal(row.minHeight, "44px"); assert.equal(row.fontSize, "13px"); assert.equal(row.fontWeight, "600"); }
  const button = page.locator(".rula-image-cancel"); await button.evaluate(element => element.style.setProperty("display", "inline-flex", "important"));
  try { await settled(page); const base = await button.evaluate(element => getComputedStyle(element).backgroundColor); await button.hover(); await settled(page); const hover = await button.evaluate(element => getComputedStyle(element).backgroundColor); assert.notEqual(base, hover); await page.keyboard.press("Tab"); await button.focus(); await settled(page); const focused = await button.evaluate(element => ({ visible: element.matches(":focus-visible"), outline: getComputedStyle(element).outlineWidth })); assert(focused.visible); assert.equal(focused.outline, "3px"); await button.evaluate(element => { element.disabled = true; }); await settled(page); const disabled = await button.evaluate(element => ({ cursor: getComputedStyle(element).cursor, opacity: getComputedStyle(element).opacity })); assert.equal(disabled.cursor, "not-allowed"); assert.equal(disabled.opacity, "0.55"); return { rows, hoverChangesBackground: true, focus: focused, disabled }; }
  finally { await button.evaluate(element => { element.disabled = false; element.removeAttribute("style"); }); }
}
async function screenshot(page, name) { const file = `${evidence}/${deployed ? "deployed-" : ""}${name}.png`; await page.locator(".rula-analysis-image-switcher").screenshot({ path: file }); screenshots.push({ path: file, sha256: sha(file) }); }
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  for (const options of [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "fa", theme: "white" }, { width: 1440, locale: "en", theme: "blue" }]) await check(`rula-loading-cancel-hidden-${options.width}-${options.locale}-${options.theme}`, async () => {
    const run = await contextPage(options), { page, state } = run;
    try {
      await uploadTwo(run); const parentDisplay = await page.locator(".rula-posture-panel > .rula-ai-image-note.is-loading").evaluate(element => getComputedStyle(element).display); assert.equal(parentDisplay, "none", "Previously hidden process note must stay hidden"); await review(page); await expect(page.locator(targets)).toHaveCount(2); if (!deployed) await expect(page.locator(".rula-image-cancel")).toBeVisible();
      const beforeControls = await controls(page), beforeCards = await page.locator(".rula-analysis-image-switcher").innerHTML(); await supplement(page); assert.deepEqual(await controls(page), beforeControls); assert.equal(await page.locator(".rula-analysis-image-switcher").innerHTML(), beforeCards); const hidden = await hiddenTargets(page, options.locale), styled = await inspectStoredStyles(page); await hiddenTargets(page, options.locale);
      assert.equal(await page.locator(".rula-posture-panel > .rula-ai-image-note.is-loading").evaluate(element => getComputedStyle(element).display), parentDisplay); await screenshot(page, `loading-${options.width}-${options.locale}`);
      await page.locator(".wizard-actions > button.ghost").click(); await expect(page.locator("#rula-job-search")).toBeVisible(); assert.equal(await page.locator(".rula-ai-image-note.is-loading > button.secondary").evaluate(element => getComputedStyle(element).display), "none"); await review(page);
      await run.release(); await expect(page.locator('.rula-analysis-image-switcher .rula-posture-image-card[data-analysis-state="ready"]')).toHaveCount(2); await expect(page.locator(targets)).toHaveCount(0); assert.equal(state.calls.length, 2); assert(state.calls.every(call => call.completed)); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      return { options, processNoteWasAlreadyHidden: true, directCancelControlsHidden: hidden, unrelatedControlStylesPreserved: true, cardContentPreserved: true, underlyingButtonStyles: styled, queueContinuedToTwoResults: true, localSyntheticInferenceRequests: state.calls.length, cancellationClicks: 0 };
    } finally { await run.close(); }
  });
  if (!deployed) {
    await check("rula-failed-image-retry-still-completes-with-cancel-hidden", async () => {
      const run = await contextPage({ failFirst: true }), { page, state } = run;
      try { await uploadTwo(run); await review(page); await supplement(page); await hiddenTargets(page, "en"); await run.release(); const first = page.locator(".rula-analysis-image-switcher .rula-posture-image-card").first(); await expect(first).toHaveAttribute("data-analysis-state", "error"); await expect(first.getByRole("button", { name: "Retry", exact: true })).toBeVisible(); await expect(page.locator('.rula-analysis-image-switcher .rula-posture-image-card[data-analysis-state="ready"]')).toHaveCount(1); const callsBeforeRetry = state.calls.length, failedPhotoAttempts = state.calls.filter(call => call.photo === 0).length; state.failures.clear(); await first.getByRole("button", { name: "Retry", exact: true }).click(); await expect(page.locator('.rula-analysis-image-switcher .rula-posture-image-card[data-analysis-state="ready"]')).toHaveCount(2); assert.equal(state.calls.length, callsBeforeRetry + 1); return { failureDisplayed: true, existingRetryPreserved: true, existingAutomaticFailureAttempts: failedPhotoAttempts, deliberateRetryAdditionalRequests: 1, localSyntheticRequests: state.calls.length, cancellationClicks: 0 }; }
      finally { await run.close(); }
    });
    await check("rula-saved-images-edit-and-other-cancel-controls-preserved", async () => {
      const run = await contextPage({ saved: true }), { page, state } = run;
      try { await expect(page.locator(".rula-analysis-image-switcher .rula-posture-image-card")).toHaveCount(2); await supplement(page); await expect(page.locator(targets)).toHaveCount(0); await page.locator(".rula-analysis-image-switcher .rula-image-edit").first().click(); await expect(page.locator(".rula-image-review-dialog")).toBeVisible(); await page.locator(".rula-image-review-dialog .rula-edit-button").first().click(); const dialog = page.locator(".rula-edit-dialog"); await expect(dialog).toBeVisible(); const cancel = dialog.locator(".rula-edit-actions > .ghost"); await expect(cancel).toBeVisible(); await expect(dialog.locator('button.icon-button[aria-label="Cancel"]')).toBeVisible(); assert.notEqual(await cancel.evaluate(element => getComputedStyle(element).display), "none"); await cancel.click(); await expect(dialog).toHaveCount(0); await page.locator(".rula-image-review-dialog > footer button").click(); await expect(page.locator(".rula-image-review-dialog")).toHaveCount(0); assert.equal(state.calls.length, 0); return { savedImagesPreserved: 2, imageReviewOpenedAndClosed: true, unrelatedManualCancelVisibleAndWorks: true, inferenceRequests: 0 }; }
      finally { await run.close(); }
    });
  }
  assert.deepEqual(pageErrors, []); assert.deepEqual(rejectedMutations, []); assert.deepEqual(unexpectedApiRequests, []); assert.deepEqual(blockedExternalRequests, []); assert.equal(sha(fixtureFile), fixtureSha256); assert.equal(sha(manifestFile), manifestSha256); assert.equal(sha(runtimeFile), runtimeSha256); assert.equal(sha(cssFile), manifest.cssSupplementSha256); assert.equal(sha(helper), helperSha256); assert.equal(sha(`${live}/index.html`), expectedIndexSha256); for (const file of manifest.files) assert.equal(sha(`${work}/candidate/${file.path}`), file.sha256); for (const [relative, digest] of accessed) assert.equal(sha(`${live}/${relative}`), digest);
} catch (error) { fatal = error.message; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = !fatal && checks.length === (deployed ? 3 : 5) && checks.every(check => check.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: deployed ? "Published index/assets with scoped cancellation CSS, synthetic loopback endpoints only" : "Exact captured deployed bundle with candidate cancellation CSS applied to actual loading DOM", noApplicationSourceOrBuildChanged: true, noProductionProviderOrDataCalls: true }); console.log(JSON.stringify({ status, total: checks.length, passed: checks.filter(check => check.status === "PASS").length, failed: checks.filter(check => check.status === "FAIL").length, fatal })); if (status !== "PASS") process.exitCode = 1;
