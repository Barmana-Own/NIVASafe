import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { root, task, work, evidence, candidate, live, apiRoot, sha, read } from "./prepare.mjs";
import { photos, project, session, digest, initialDraft, parts, adjustment, imageResponse, expectedSummary, expectedBands, responseSide, rawModelSide, inheritedFixtures, parserFixtureInputs, parserRoot } from "./fixtures.mjs";

// Run the real built application on an owned loopback origin. All API traffic
// is intercepted; only generated images and audited synthetic observations exist.
const require = createRequire(`${root}/frontend/package.json`), { chromium, expect } = require("@playwright/test");
const helper = fileURLToPath(import.meta.url), fixtureFile = `${path.dirname(helper)}/fixtures.mjs`, deployed = process.argv.includes("--deployed");
const manifestFile = `${evidence}/candidate.json`, runtimeFile = `${evidence}/runtime-before.json`, planFile = `${evidence}/frontend-plan.json`, buildFile = `${evidence}/build-validation.json`;
for (const file of [manifestFile, runtimeFile, planFile, buildFile, `${work}/test-index.html`]) assert(fs.existsSync(file), `Freeze/build required: ${file}`);
const manifest = read(manifestFile), runtime = read(runtimeFile), plan = read(planFile), build = read(buildFile);
assert.equal(build.status, "PASS");
const fixedInputs = [helper, fixtureFile, `${root}/${inheritedFixtures}`, manifestFile, runtimeFile, planFile, buildFile, `${work}/test-index.html`].map(file => ({ path: file, sha256: sha(file) }));
const deploymentFile = `${evidence}/deployment.json`, deployment = deployed ? read(deploymentFile) : null;
if (deployed) { assert.equal(deployment.status, "DEPLOYED"); assert.equal(deployment.oldIndexSha256, runtime.indexSha256); }
const expectedLiveIndex = deployed ? deployment.newIndexSha256 : runtime.indexSha256;
assert.equal(sha(`${live}/index.html`), expectedLiveIndex); assert.equal(sha(`${work}/index.before.html`), runtime.indexSha256); assert.equal(sha(`${work}/test-index.html`), plan.htmlSha256);
const originalHtml = fs.readFileSync(deployed ? `${live}/index.html` : `${work}/test-index.html`, "utf8"), capturedHtml = fs.readFileSync(`${work}/index.before.html`, "utf8");
const stylesheetLinks = html => html.match(/<link\s+rel="stylesheet"[^>]*>/gu) ?? [];
assert.equal(stylesheetLinks(capturedHtml).length, 19); assert.equal(stylesheetLinks(originalHtml).length, 19);
assert.deepEqual(stylesheetLinks(originalHtml), stylesheetLinks(capturedHtml));
const staticRoot = path.resolve(live), candidateRoot = path.resolve(candidate, "frontend/dist"), planned = new Map(plan.assets.map(asset => [asset.url, asset.sha256])), protectedStatic = new Map(runtime.staticFiles.map(file => [file.path, file.sha256]));
const domainInputs = ["shared/domain/src/index.ts", "shared/domain/src/rula-tables.ts", "shared/domain/dist/index.js", "shared/domain/dist/rula-tables.js"].map(relative => { const hash = sha(`${root}/${relative}`); assert.equal(sha(`${candidate}/${relative}`), hash, "Fixture domain differs from candidate"); return { path: relative, sha256: hash }; });
const parserVisited = new Set();
function visitParser(relative) {
  if (parserVisited.has(relative)) return;
  parserVisited.add(relative);
  for (const match of fs.readFileSync(`${parserRoot}/${relative}`, "utf8").matchAll(/(?:from\s+|import\s*)["'](\.\.?\/[^"']+\.js)["']/gu)) visitParser(path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1])));
}
for (const relative of parserFixtureInputs) visitParser(relative);
const parserInputs = [...parserVisited].map(relative => { const hash = sha(`${parserRoot}/${relative}`); assert.equal(sha(`${apiRoot}/${relative.replace(/^backend\//u, "")}`), hash, "Fixture parser differs from current private API runtime"); return { path: relative, sha256: hash }; });
const fixtureInputs = [{ path: fixtureFile, sha256: sha(fixtureFile) }, { path: `${root}/${inheritedFixtures}`, sha256: sha(`${root}/${inheritedFixtures}`) }, ...domainInputs.flatMap(file => [root, candidate].map(base => ({ path: `${base}/${file.path}`, sha256: file.sha256 }))), ...parserInputs.flatMap(file => [{ path: `${parserRoot}/${file.path}`, sha256: file.sha256 }, { path: `${apiRoot}/${file.path.replace(/^backend\//u, "")}`, sha256: file.sha256 }])];
const output = `${evidence}/${deployed ? "live-ui" : "e2e-validation"}.json`, schemaLedgerFile = `${evidence}/${deployed ? "deployed-" : ""}browser-schema-ledger.json`;
assert(!fs.existsSync(output) && !fs.existsSync(schemaLedgerFile), "Preserve previous QA attempt before rerunning");
for (const file of fixedInputs.slice(0, 3)) { const destination = `${evidence}/${path.basename(file.path, ".mjs")}-source-${file.sha256.slice(0, 16)}.mjs`; if (!fs.existsSync(destination)) fs.copyFileSync(file.path, destination, fs.constants.COPYFILE_EXCL); }
const liveInputs = new Map(), candidateInputs = new Map(), checks = [], pageErrors = [], blockedExternalRequests = [], unexpectedApiRequests = [], rejectedMutations = [], allowedSyntheticMutations = [], ledgers = [], screenshots = [];
let browser, browserClosed = false, serverClosed = false, fatal;
const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webp": "image/webp" };
const server = http.createServer((request, response) => {
  try {
    assert.equal(request.method, "GET"); const url = new URL(request.url, "http://127.0.0.1"), decoded = decodeURIComponent(url.pathname); assert(!decoded.includes("\\") && !decoded.includes("\0")); response.setHeader("cache-control", "no-store");
    if (/^\/qa\/font-(arabic|latin)\.woff2$/u.test(decoded)) { response.setHeader("content-type", "font/woff2"); response.end(fs.readFileSync(`${root}/frontend/tests/e2e/assets/vazirmatn-${decoded.includes("arabic") ? "arabic" : "latin"}.woff2`)); return; }
    const built = path.resolve(candidateRoot, `.${decoded}`), prior = path.resolve(staticRoot, `.${decoded}`); assert(built.startsWith(candidateRoot + path.sep) && prior.startsWith(staticRoot + path.sep));
    if (!deployed && planned.has(decoded)) { assert.equal(sha(built), planned.get(decoded)); const relative = path.relative(candidateRoot, built).replaceAll("\\", "/"); candidateInputs.set(relative, sha(built)); response.setHeader("content-type", mime[path.extname(built)] ?? "application/octet-stream"); response.end(fs.readFileSync(built)); return; }
    if (fs.existsSync(prior) && fs.statSync(prior).isFile()) { const relative = path.relative(staticRoot, prior).replaceAll("\\", "/"), hash = sha(prior), expected = relative === "index.html" ? expectedLiveIndex : protectedStatic.get(relative) ?? planned.get(decoded); assert(expected, "Unlisted static artifact rejected"); assert.equal(hash, expected); if (liveInputs.has(relative)) assert.equal(liveInputs.get(relative), hash); liveInputs.set(relative, hash); response.setHeader("content-type", mime[path.extname(prior)] ?? "application/octet-stream"); response.end(fs.readFileSync(prior)); return; }
    assert(!path.extname(decoded), "Unknown static artifact rejected"); response.setHeader("content-type", "text/html;charset=utf-8"); response.end(originalHtml);
  } catch { response.statusCode = 404; response.end("Not found"); }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${server.address().port}`, draftKey = `nivasafe-draft:v1:rula:${session.user.id}:${session.organizations[0].id}`;
const policyVersion = fs.readFileSync(`${candidate}/frontend/src/features/account/imageProcessingPolicy.ts`, "utf8").match(/ACCOUNT_IMAGE_CONSENT_VERSION = "([^"]+)"/u)?.[1]; assert(policyVersion);
const fonts = ["arabic", "latin"].map(subset => `@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;src:url('/qa/font-${subset}.woff2') format('woff2');unicode-range:${subset === "arabic" ? "U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200F,U+FB50-FDFF,U+FE70-FEFF" : "U+0000-00FF,U+2000-206F"}}`).join("\n");
function bindings() { return { candidateManifestSha256: sha(manifestFile), buildValidationSha256: sha(buildFile), frontendPlanSha256: sha(planFile), runtimeBeforeSha256: sha(runtimeFile), hybridIndexSha256: plan.htmlSha256, helperSha256: fixedInputs[0].sha256, fixturesSha256: fixedInputs[1].sha256, inheritedFixturesSha256: fixedInputs[2].sha256, domainFixtureInputs: domainInputs, parserFixtureInputs: parserInputs, fixtureInputs, baselineIndexSha256: runtime.indexSha256, liveIndexSha256: sha(`${live}/index.html`), ...(deployed ? { deploymentSha256: sha(deploymentFile) } : {}), liveStaticInputs: [...liveInputs].map(([path, sha256]) => ({ path, sha256 })), candidateStaticInputs: [...candidateInputs].map(([path, sha256]) => ({ path, sha256 })), productionNetworkRequests: 0, productionMutations: 0, realImageBytesTransferred: 0, generatedPhotos: photos.map(({ name, sha256, size }) => ({ name, sha256, size })), blockedExternalRequests, unexpectedApiRequests, rejectedApiMutations: rejectedMutations, allowedSyntheticMutations, pageErrors }; }
function save(status, extra = {}) { fs.writeFileSync(output, JSON.stringify({ status, task, at: new Date().toISOString(), ...bindings(), total: checks.length, passed: checks.filter(check => check.status === "PASS").length, failed: checks.filter(check => check.status === "FAIL").length, checks, screenshots, ledgers, ...extra }, null, 2)); }
async function check(name, run) { const record = { name, status: "RUNNING" }, started = performance.now(); checks.push(record); save("RUNNING"); try { record.details = await run(); record.status = "PASS"; } catch (error) { record.status = "FAIL"; record.error = error.stack; } record.elapsedMs = Math.round(performance.now() - started); save("RUNNING"); console.log(JSON.stringify({ name, status: record.status, error: record.status === "FAIL" ? record.error : undefined })); }
async function settled(page) { await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation => animation.finished.catch(() => undefined))); }); }
function multipart(request) { const boundary = request.headers()["content-type"]?.match(/boundary=(?:"([^"]+)"|([^;]+))/u); assert(boundary); const text = request.postDataBuffer().toString("latin1"), fields = {}, files = []; for (const part of text.split("--" + (boundary[1] ?? boundary[2])).slice(1)) { const at = part.indexOf("\r\n\r\n"); if (at < 0) continue; const header = part.slice(0, at), name = header.match(/name="([^"]+)"/u)?.[1]; if (!name) continue; const bytes = Buffer.from(part.slice(at + 4).replace(/\r\n$/u, ""), "latin1"), filename = header.match(/filename="([^"]+)"/u)?.[1]; if (filename) files.push({ name, filename, bytes }); else fields[name] = bytes.toString("utf8"); } return { fields, files }; }
async function contextPage({ width = 1440, locale = "en", theme = "white", bodySide = "BOTH", scenario = "partial-both", holdFirst = false, photoCount = 4 } = {}) {
  const options = { width, locale, theme, bodySide, scenario, holdFirst, photoCount }, context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "fa" ? "fa-IR" : "en-US", timezoneId: "Asia/Tehran", reducedMotion: "reduce", serviceWorkers: "block" }), page = await context.newPage();
  const state = { options, calls: [], inferenceResponses: [], observations: [], mutations: [], reads: [], releases: [], holdFirst }; ledgers.push(state); page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(({ session, locale, theme, draftKey, draft }) => { localStorage.setItem("nivasafe-session", JSON.stringify(session)); localStorage.setItem("nivasafe-org", session.organizations[0].id); localStorage.setItem("nivasafe-locale", locale); localStorage.setItem("nivasafe-theme", theme); localStorage.setItem(draftKey, JSON.stringify(draft)); }, { session, locale, theme, draftKey, draft: initialDraft(bodySide) });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === "fonts.googleapis.com") { await route.fulfill({ status: 200, contentType: "text/css", body: fonts }); return; }
    if (url.origin !== origin) { blockedExternalRequests.push({ origin: url.origin, pathname: url.pathname }); await route.abort("blockedbyclient"); return; }
    if (!url.pathname.startsWith("/api/v1/")) { await route.continue(); return; }
    const api = url.pathname.slice("/api/v1".length), method = request.method(), respond = (data, meta) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data, ...(meta ? { meta } : {}) }) });
    try {
      if (method === "POST" && api === "/rula/posture-image-analysis") {
        const { fields, files } = multipart(request); assert.equal(files.length, 1); const photo = photos.slice(0, photoCount).find(photo => photo.sha256 === digest(files[0].bytes)); assert(photo, "Only generated fixture bytes allowed"); assert.equal(files[0].filename, photo.name); assert.equal(fields.imageSubject, "SELF"); assert(["LEFT", "RIGHT"].includes(fields.bodySide));
        const call = { method, path: api, photo: photo.index, bodySide: fields.bodySide, syntheticSha256: photo.sha256, completed: false, requestNumber: state.calls.length + 1 }; state.calls.push(call); allowedSyntheticMutations.push({ ...call, loopbackOnly: true });
        if (state.holdFirst && call.requestNumber === 1) await new Promise(resolve => state.releases.push(resolve));
        const data = imageResponse(photo.index, fields.bodySide, scenario, call.requestNumber); state.inferenceResponses.push({ photo: photo.index, bodySide: fields.bodySide, rawModel: rawModelSide(photo.index, fields.bodySide, scenario), data }); call.completed = true; try { await respond(data); } catch { call.aborted = true; } return;
      }
      if (method !== "GET") { const rejected = { method, path: api }; rejectedMutations.push(rejected); state.mutations.push(rejected); await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_MUTATION_REJECTED", message: "Unexpected synthetic business mutation rejected" } }) }); return; }
      state.reads.push(api);
      if (api === "/rula") { await respond([]); return; }
      if (api === "/projects") { await respond([project]); return; }
      if (api === "/rula/image-analysis-policy") { await respond({ available: true, provider: "arvancloud", reasonCode: null, consentAccepted: true, consentVersion: policyVersion }); return; }
      if (api === "/files") { await respond(photos.slice(0, photoCount).map(({ buffer, sha256, index, name, ...photo }) => photo), { total: photoCount, page: 1, limit: 8 }); return; }
      const match = api.match(/^\/files\/([^/]+)\/download$/u); if (match) { const photo = photos.find(photo => photo.id === match[1]); assert(photo); await route.fulfill({ status: 200, contentType: "image/png", body: photo.buffer }); return; }
      const known = { "/fmea/job-catalog": [], "/actions": [], "/organizations/current": session.organizations[0], "/organizations": session.organizations, "/notifications/summary": { items: [], unreadCount: 0, total: 0 }, "/me/ai-quota": { tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, state: "HEALTHY", serverTimestamp: "2026-10-23T12:00:00.000Z" }, "/profile": session.user, "/profile/image-processing-consent": { accepted: true, policyVersion, acceptedAt: "2026-10-23T12:00:00.000Z" }, "/profile/posture-image-authorizations": { grants: [] } };
      if (Object.hasOwn(known, api)) { await respond(known[api]); return; }
      unexpectedApiRequests.push({ method, path: api }); await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_UNEXPECTED", message: "Unexpected synthetic API request rejected" } }) });
    } catch (error) { unexpectedApiRequests.push({ method, path: api, assertion: error.message }); try { await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_FIXTURE_ASSERTION", message: "Synthetic fixture assertion failed" } }) }); } catch { /* The isolated page may already be closed. */ } }
  });
  await page.goto(`${origin}/rula`, { waitUntil: "networkidle" }); await expect(page.locator("#rula-job-search")).toBeAttached(); await settled(page);
  return { page, state, async release() { state.holdFirst = false; state.releases.splice(0).forEach(release => release()); }, async close() { state.holdFirst = false; state.releases.splice(0).forEach(release => release()); await context.close(); } };
}
const step = page => page.locator(".rula-analysis-step:visible"), activeField = page => page.locator("fieldset:not([hidden])"), switcher = page => page.locator(".rula-analysis-image-switcher");
const localized = (value, locale) => Number(value).toLocaleString(locale === "fa" ? "fa-IR" : "en-US");
async function upload(run) { await run.page.locator('input[type="file"][multiple]').setInputFiles(photos.slice(0, run.state.options.photoCount).map(photo => ({ name: photo.name, mimeType: "image/png", buffer: photo.buffer }))); await expect(activeField(run.page).locator(".rula-posture-image-card")).toHaveCount(run.state.options.photoCount); }
async function next(page) { await page.locator(".wizard-actions > button.primary").click(); await settled(page); }
async function ready(run) { await expect(switcher(run.page).locator('.rula-posture-image-card[data-analysis-state="ready"]')).toHaveCount(run.state.options.photoCount, { timeout: 20000 }); }
async function start(run) { await upload(run); await next(run.page); await expect(step(run.page)).toBeVisible(); await ready(run); }
async function selectPhoto(page, index) { await switcher(page).locator(".rula-posture-image-select").nth(index).click(); await expect(switcher(page).locator(".rula-posture-image-card").nth(index)).toHaveClass(/is-selected/u); await settled(page); }
async function selectSide(page, side) { const tabs = step(page).locator('.rula-side-tabs [role="tab"]'); if (await tabs.count()) { const tab = tabs.nth(side === "LEFT" ? 1 : 0); await tab.click(); await expect(tab).toHaveAttribute("aria-selected", "true"); await settled(page); } }
async function choose(page, name, value) { const control = page.locator(`.styled-select:has(select[name="${name}"])`).filter({ visible: true }); await control.getByRole("combobox").click(); const index = await control.locator("select option").evaluateAll((options, selected) => options.findIndex(option => option.value === selected), String(value)); assert(index >= 0); await control.getByRole("option").nth(index).click(); await expect(control.locator("select")).toHaveValue(String(value)); }
async function snapshot(run, photo, side, label) { const postureAnalysis = JSON.parse(await run.page.locator('input[name="postureAnalysis"]').inputValue()); run.state.observations.push({ photo, bodySide: run.state.options.bodySide, selectedSide: side, label, postureAnalysis }); return postureAnalysis; }
function imageSnapshot(analysis, photo) { const found = analysis.imageAssessments?.find(image => image.fileName === photos[photo].name); assert(found, "Per-photo persisted audit snapshot missing"); return found; }
function observationFor(image, side) { return image.analysis.sideAnalyses?.[side] ?? image.analysis; }
async function assertValues(run, photo, side, overrides = {}) {
  const { page } = run, { locale, scenario } = run.state.options, expected = expectedSummary(photo, side, scenario, overrides), angles = await step(page).locator(".rula-angle-value").allTextContents(), scores = await step(page).locator(".rula-suggested-score").allTextContents(), badges = await step(page).locator(".rula-detection-badge").allTextContents();
  assert.equal(scores.length, 7); for (const [index, part] of parts.entries()) { const value = overrides[part] ?? expected.proposals[part]; assert.equal(scores[index].trim(), value ? localized(value.score, locale) : "—", `${part} proposal score`); if (value?.angle !== null && value?.angle !== undefined) assert(angles[index].includes(localized(value.angle, locale)), `${part} original angle missing`); else assert.equal(angles[index].trim(), "—"); assert(!/Waiting for image analysis|در انتظار تحلیل تصویر/u.test(badges[index]), `${part} completed AI row incorrectly pending`); const expectedStatus = value ? part === "wristTwist" ? locale === "fa" ? "وجود دارد" : "Present" : locale === "fa" ? "تشخیص داده شد" : "Detected" : locale === "fa" ? "تشخیص داده نشد" : "Not detected"; assert.equal(badges[index].trim(), expectedStatus, `${part} completed detection status`); }
  await expect(step(page).locator(".rula-awaiting-badge")).toHaveCount(0); await expect(step(page).locator(".rula-source-badge.source-default")).toHaveCount(0); await expect(step(page).locator(".rula-summary-badge")).toHaveCount(0);
  const bands = expectedBands(photo, side, scenario, overrides), groups = (await step(page).locator(".rula-group-summary > div > strong").allTextContents()).map(value => value.trim()); assert.deepEqual(groups, bands.map(band => band.exact ? localized(band.min, locale) : `${localized(band.min, locale)}–${localized(band.max, locale)}`), "Group badges must equal independent exhaustive table bounds"); for (const [index, band] of bands.entries()) if (!band.exact) { const badge = step(page).locator(".rula-group-summary > div > strong").nth(index); await expect(badge).toHaveAttribute("dir", "ltr"); await expect(badge).toHaveAttribute("role", "note"); const label = await badge.getAttribute("aria-label"); assert(label && label.includes(groups[index])); assert.equal(await badge.getAttribute("title"), label); }
  const gauge = await step(page).locator(".rula-score-gauge").getAttribute("aria-valuenow"); assert.equal(gauge, expected.count === 7 ? String(expected.result.score) : null); const summaryText = (await step(page).locator(".rula-summary-score > strong").innerText()).trim(); if (expected.count === 7) assert.equal(summaryText, `RULA Score = ${localized(expected.result.score, locale)}`); else { assert(summaryText.includes(localized(expected.count, locale))); assert(!/not ready|هنوز نتیجه|Waiting for image analysis|در انتظار تحلیل تصویر/u.test(summaryText)); }
  const modifiers = { force: await activeField(page).locator('select[name="force"]').inputValue(), muscleUse: await activeField(page).locator('input[name="muscleUse"]').inputValue() }; assert.deepEqual(modifiers, { force: String(overrides.force ?? adjustment(photo, side).force), muscleUse: (overrides.muscleUse ?? adjustment(photo, side).muscleUse) ? "1" : "0" });
  const analysis = await snapshot(run, photo, side, "display"), persisted = observationFor(imageSnapshot(analysis, photo), side);
  const wire = responseSide(photo, side, scenario); for (const part of parts) if (!overrides[part]) { assert.deepEqual(persisted[part], { ...wire[part], source: "AI", confirmedByUser: false }, `${part} persisted audit must remain identical to normalized audited wire`); }
  return { photo, side, scores, angles, groups, gauge, modifiers, proposalCount: expected.count, bands, authoritativeAuditUnchanged: true };
}
async function hiddenCancel(page) { const selector = ".rula-image-cancel, .rula-ai-image-note.is-loading > button.secondary"; const count = await page.locator(selector).count(); assert(count > 0); const states = await page.locator(selector).evaluateAll(elements => elements.map(element => { element.focus(); return { display: getComputedStyle(element).display, focused: document.activeElement === element }; })); assert(states.every(state => state.display === "none" && !state.focused)); return states; }
async function capture(page, name) { const file = `${evidence}/${deployed ? "deployed-" : ""}${name}.png`; await page.locator("#main-content").screenshot({ path: file }); screenshots.push({ path: file, sha256: sha(file) }); }
async function badgeMetrics(page) {
  const badges = await step(page).locator('.rula-group-summary > div > strong').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element), box = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect(), range = document.createRange();
    range.selectNodeContents(element);
    const lines = [...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top * 2) / 2);
    return { text: element.textContent, cssFont: style.fontSize, direction: style.direction, width: box.width, height: box.height, left: box.left, right: box.right, parentLeft: parent.left, parentRight: parent.right, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, lines: new Set(lines).size };
  }));
  for (const badge of badges) { assert.equal(badge.lines, 1, 'Group score/range must stay on one text line'); assert(badge.scrollWidth <= badge.clientWidth + 1, 'Badge text clipping'); assert(badge.left >= badge.parentLeft - 1 && badge.right <= badge.parentRight + 1, 'Badge escapes card'); }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  return badges;
}
async function matrix() {
  const run = await contextPage();
  try {
    await start(run); const values = [];
    for (let photo = 0; photo < 4; photo++) { await selectPhoto(run.page, photo); for (const side of ['RIGHT', 'LEFT']) { await selectSide(run.page, side); values.push(await assertValues(run, photo, side)); } }
    assert.equal(run.state.calls.length, 8); for (const photo of photos) for (const side of ['RIGHT', 'LEFT']) assert.equal(run.state.calls.filter(call => call.photo === photo.index && call.bodySide === side).length, 1);
    await capture(run.page, 'partial-four-photo-bands'); return { values, exactEightSyntheticRequests: true, rawAuditPreserved: true, globalScoreAndApprovalUnchanged: true };
  } finally { await run.close(); }
}
async function exact() {
  const run = await contextPage({ scenario: 'full', photoCount: 1 });
  try { await start(run); const values = []; for (const side of ['RIGHT', 'LEFT']) { await selectSide(run.page, side); values.push(await assertValues(run, 0, side)); } assert(values.every(value => value.bands.every(band => band.exact))); return { values, completeGroupsRetainExactScores: true }; }
  finally { await run.close(); }
}
async function responsive(options) {
  const run = await contextPage({ ...options, scenario: 'invariant', photoCount: 1, bodySide: 'RIGHT' });
  try { await start(run); await choose(run.page, 'force', '3'); await choose(run.page, 'muscleUseOption', '1'); const values = await assertValues(run, 0, 'RIGHT', { force: 3, muscleUse: true }), badges = await badgeMetrics(run.page); assert.equal(values.groups[0], options.locale === 'fa' ? '۱۳–۱۳' : '13–13'); await capture(run.page, `bands-${options.width}-${options.locale}-${options.theme}`); return { options, values, badges }; }
  finally { await run.close(); }
}
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  await check('four-photo-both-side-partial-bands-independent', () => matrix());
  await check('complete-proposals-retain-exact-group-scores', () => exact());
  if (!deployed) {
    await check('pending-dashes-completed-unknown-and-invariant-bands', async () => {
      const results = [], run = await contextPage({ scenario: 'unknown', photoCount: 1, bodySide: 'RIGHT', holdFirst: true });
      try { await upload(run); await expect.poll(() => run.state.calls.length).toBe(1); await next(run.page); assert.deepEqual((await step(run.page).locator('.rula-group-summary strong').allTextContents()).map(value => value.trim()), ['—', '—']); assert.equal(await step(run.page).locator('.rula-score-gauge').getAttribute('aria-valuenow'), null); await hiddenCancel(run.page); await run.release(); await ready(run); results.push(await assertValues(run, 0, 'RIGHT')); }
      finally { await run.close(); }
      const invariant = await contextPage({ scenario: 'invariant', photoCount: 1, bodySide: 'RIGHT' });
      try { await start(invariant); const value = await assertValues(invariant, 0, 'RIGHT'); assert.equal(value.groups[0], '9–9'); assert.equal(value.bands[0].exact, false); results.push(value); }
      finally { await invariant.close(); }
      return { results, pendingNotMeasured: true, unknownsEnumeratedNotNormalOne: true, invariantMissingMemberStillRange: true };
    });
    await check('manual-cancel-save-modifiers-recompute-only-selected-photo-side', async () => {
      const run = await contextPage();
      try {
        await start(run); await selectPhoto(run.page, 1); await selectSide(run.page, 'LEFT'); const before = await snapshot(run, 1, 'LEFT', 'before-edit');
        await step(run.page).locator('.rula-edit-button').nth(4).click(); const dialog = run.page.locator('.rula-edit-dialog'), inputs = dialog.locator('input[type="number"]');
        await expect(inputs.first()).toHaveValue(''); await expect(inputs.nth(1)).toHaveValue('1'); await inputs.first().fill('30'); await inputs.nth(1).fill('3'); await dialog.locator('.rula-detection-toggle input').check(); await dialog.locator('.rula-edit-actions > .ghost').click(); assert.deepEqual(await snapshot(run, 1, 'LEFT', 'after-cancel'), before);
        await step(run.page).locator('.rula-edit-button').nth(4).click(); await inputs.first().fill('30'); await dialog.locator('.rula-detection-toggle input').check(); await inputs.nth(1).fill('3'); await dialog.locator('.rula-edit-actions > .primary').click(); await expect(dialog).toHaveCount(0); await choose(run.page, 'force', '0'); await choose(run.page, 'muscleUseOption', '0');
        const override = { neck: { angle: 30, score: 3 }, force: 0, muscleUse: false }, edited = await assertValues(run, 1, 'LEFT', override); assert(edited.bands[1].exact && !edited.bands[0].exact);
        const changed = await snapshot(run, 1, 'LEFT', 'after-edit'), row = observationFor(imageSnapshot(changed, 1), 'LEFT').neck; assert.equal(row.source, 'USER'); assert.equal(row.confirmedByUser, true); assert.deepEqual(row.measurement, observationFor(imageSnapshot(before, 1), 'LEFT').neck.measurement);
        for (const photo of [0, 2, 3]) { await selectPhoto(run.page, photo); for (const side of ['RIGHT', 'LEFT']) { await selectSide(run.page, side); await assertValues(run, photo, side); } }
        await selectPhoto(run.page, 1); await selectSide(run.page, 'RIGHT'); await assertValues(run, 1, 'RIGHT'); await selectSide(run.page, 'LEFT'); await assertValues(run, 1, 'LEFT', override); assert.equal(run.state.mutations.length, 0); assert.equal(run.state.calls.length, 8);
        return { cancelExactSnapshotPreserved: true, manualGroupBNowExact: true, missingGroupARemainsRange: true, modifiersAndPhotoSideIsolationPreserved: true };
      } finally { await run.close(); }
    });
    await check('persian-mobile-range-badges-no-overflow', async () => { const results = []; for (const options of [{ width: 320, locale: 'fa', theme: 'white' }, { width: 390, locale: 'fa', theme: 'blue' }]) results.push(await responsive(options)); return { results }; });
    await check('english-tablet-desktop-range-badges-no-overflow', async () => { const results = []; for (const options of [{ width: 768, locale: 'en', theme: 'white' }, { width: 1440, locale: 'en', theme: 'blue' }]) results.push(await responsive(options)); return { results }; });
  } else await check('published-persian-mobile-range-badges', () => responsive({ width: 320, locale: 'fa', theme: 'white' }));
  assert.deepEqual(pageErrors, []); assert.deepEqual(unexpectedApiRequests, []); assert.deepEqual(blockedExternalRequests, []); assert.deepEqual(rejectedMutations, []);
  for (const file of fixedInputs) assert.equal(sha(file.path), file.sha256, `QA input changed: ${file.path}`); assert.equal(sha(`${live}/index.html`), expectedLiveIndex); for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256); for (const [relative, hash] of liveInputs) assert.equal(sha(`${live}/${relative}`), hash); for (const [relative, hash] of candidateInputs) assert.equal(sha(`${candidateRoot}/${relative}`), hash); for (const file of fixtureInputs) assert.equal(sha(file.path), file.sha256); for (const file of domainInputs) { assert.equal(sha(`${root}/${file.path}`), file.sha256); assert.equal(sha(`${candidate}/${file.path}`), file.sha256); }
} catch (error) { fatal = error.stack; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = !fatal && checks.length === (deployed ? 3 : 6) && checks.every(check => check.status === "PASS") ? "PASS" : "FAIL";
fs.writeFileSync(schemaLedgerFile, JSON.stringify({ status, task, ...bindings(), ledgers }, null, 2), { flag: "wx" });
save(status, { fatal, schemaLedger: { path: schemaLedgerFile, sha256: sha(schemaLedgerFile) }, cleanup: { browserClosed, ownedServerClosed: serverClosed }, sourceBundle: deployed ? "Published JS graph and nineteen unchanged styles on isolated loopback" : "Candidate production JS graph with nineteen unchanged published styles", noApplicationSourceOrProductionDataChanged: true });
console.log(JSON.stringify({ status, total: checks.length, passed: checks.filter(check => check.status === "PASS").length, failed: checks.filter(check => check.status === "FAIL").length, fatal })); if (status !== "PASS") process.exitCode = 1;
