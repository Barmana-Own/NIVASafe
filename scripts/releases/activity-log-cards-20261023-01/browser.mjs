import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { root, task, work, evidence, live, sha, read } from "./prepare.mjs";

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
const listSelector = ".activity-log-table > table > tbody";
const cardSelector = ":scope > tr:not(.activity-log-detail-row)";
const checks = [], pageErrors = [], blockedExternalRequests = [], unexpectedApiRequests = [], rejectedMutations = [], allowedSyntheticMutations = [];
const screenshots = [];
let browser, serverClosed = false, browserClosed = false, fatal;
const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".json": "application/json" };
const server = http.createServer((request, response) => {
  try {
    assert.equal(request.method, "GET");
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    response.setHeader("cache-control", "no-store");
    if (url.pathname === "/qa/activity-log-cards.css") { response.setHeader("content-type", "text/css"); response.end(css); return; }
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
const fixtureActivities = count => Array.from({ length: count }, (_, i) => {
  const category = ["AI", "AUTH", "ASSESSMENT", "OTHER"][i % 4];
  const action = i === 0 ? `RULA_IMAGE_ANALYSIS_COMPLETED_${"LONG_EVENT_IDENTIFIER_".repeat(5)}` : category === "AI" ? "AI_REQUEST_RETRY" : category === "AUTH" ? "LOGIN" : category === "ASSESSMENT" ? i % 2 ? "FMEA_CREATE" : "RULA_UPDATE" : "SYSTEM_CONFIGURATION_READ";
  return {
    id: `qa-activity-${i + 1}`, category, action, createdAt: `2026-10-${String(23 - i).padStart(2, "0")}T12:30:45.000Z`,
    entityType: i === 0 ? "Rula" : i % 3 === 1 ? "User" : i % 3 === 2 ? "Fmea" : null,
    entityId: i % 3 === 0 ? `qa-related-entity-${i}-${"Identifier".repeat(6)}` : i % 3 === 1 ? `qa-user-${i}` : null,
    user: i % 4 === 1 ? null : { id: `qa-user-${i}`, displayName: i === 0 ? "کاربر مصنوعی با نام کامل بسیار طولانی — Synthetic quality analyst needle-activity" : `کاربر آزمون فعالیت ${i + 1}`, email: i === 0 ? `long.${"department".repeat(6)}@synthetic.nivasafe.test` : i % 3 === 0 ? null : `activity${i}@nivasafe.test` },
    assessment: i % 3 === 0 ? { type: i % 2 ? "FMEA" : "RULA", id: `qa-assessment-${i}`, title: i === 0 ? "ارزیابی آزمایشی اپراتور تجهیزات صنعتی با عنوان طولانی برای بررسی کامل نمایش محتوا — Long mixed direction synthetic assessment title" : `ارزیابی مصنوعی ${i + 1}`, code: i === 0 ? `RULA-${"UNBROKEN-CODE".repeat(6)}` : `QA-${i + 1}` } : null,
    tokenUsage: category === "AI" ? { useCase: "RULA_IMAGE", provider: "synthetic-local-provider", model: i === 0 ? "synthetic-vision-model-with-long-name" : null, inputTokens: 123456, outputTokens: 34567, totalTokens: 158023, sourceType: "IMAGE", createdAt: "2026-10-23T12:30:45.000Z" } : null,
    requestId: i % 3 === 0 ? `qa-request-${i}-${"requestIdentifier".repeat(6)}` : null,
    ipAddress: i % 2 ? null : "2001:db8:1234:5678:90ab:cdef:1234:5678",
    userAgent: i === 0 ? `SyntheticBrowser/1.0 (${"QA long device description ".repeat(25)}) QA_USER_AGENT_END` : i % 2 ? null : "Synthetic browser for isolated local validation",
    metadata: i === 0 ? { description: "داده مصنوعی آزمون جزئیات — Synthetic event metadata", unsafeLookingText: '<img src="invalid" onerror="window.qaUnexpectedExecution=true">', rows: Array.from({ length: 40 }, (_, index) => ({ index, note: `Complete metadata line ${index} — داده کامل رویداد` })), finalSentinel: "QA_METADATA_END" } : i % 2 ? null : { synthetic: true, index: i },
  };
});
const organization = { id: "qa-activity-org", nameFa: "سازمان مصنوعی آزمون فعالیت", nameEn: "Synthetic activity organization", role: "ORG_ADMIN", active: true, subscriptionPlan: "ENTERPRISE", subscriptionStatus: "ACTIVE" };
const baseSession = { accessToken: "synthetic-activity-browser-validation-token", refreshToken: "synthetic-activity-browser-validation-refresh", user: { id: "qa-activity-user", email: "activity-cards@nivasafe.test", username: "activity_cards_qa", displayName: "مدیر آزمون فعالیت", globalRole: "SUPER_ADMIN" }, organizations: [organization] };
function bindings() { return { candidateManifestSha256: manifestSha256, cssSupplementSha256: sha(cssFile), helperSha256, runtimeBeforeSha256: runtimeSha256, baselineIndexSha256: runtime.indexSha256, liveIndexSha256: sha(`${live}/index.html`), ...(deployed ? { deploymentSha256: sha(deploymentFile), deployedCssAsset: deployment.cssAsset } : {}), liveStaticInputs: [...accessed].map(([relative, sha256]) => ({ path: relative, sha256 })), productionNetworkRequests: 0, productionMutations: 0, blockedExternalRequests, rejectedApiMutations: rejectedMutations, unexpectedApiRequests, allowedSyntheticMutations, pageErrors }; }
function save(status, extra = {}) { fs.writeFileSync(output, JSON.stringify({ status, task, at: new Date().toISOString(), ...bindings(), total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, pending: 0, checks, screenshots, ...extra }, null, 2)); }
async function check(name, run) {
  const record = { name, status: "RUNNING" }, started = performance.now(); checks.push(record); save("RUNNING");
  try { record.details = await run(); record.status = "PASS"; }
  catch (error) { record.status = "FAIL"; record.error = error.message; }
  record.elapsedMs = Math.round(performance.now() - started); save("RUNNING"); console.log(JSON.stringify({ name, status: record.status, error: record.error }));
}
async function settled(page) { await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => undefined))); }); }
async function supplement(page) { if (!deployed) await page.addStyleTag({ url: `${origin}/qa/activity-log-cards.css` }); await settled(page); }
async function contextPage({ width = 1440, locale = "fa", theme = "white", count = 17, failFirst = false } = {}) {
  const activities = fixtureActivities(count), state = { activities, reads: [], failNext: failFirst, failedReads: 0 };
  const session = { ...baseSession, user: { ...baseSession.user, locale } };
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "fa" ? "fa-IR" : "en-US", timezoneId: "Asia/Tehran", serviceWorkers: "block", deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage(); page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(({ value, locale, theme }) => { localStorage.setItem("nivasafe-session", JSON.stringify(value)); localStorage.setItem("nivasafe-org", value.organizations[0].id); localStorage.setItem("nivasafe-locale", locale); localStorage.setItem("nivasafe-theme", theme); sessionStorage.setItem("nivasafe-path-selected", "safety"); }, { value: session, locale, theme });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === "fonts.googleapis.com") { await route.fulfill({ status: 200, contentType: "text/css", body: stylesheet }); return; }
    if (url.origin !== origin) { blockedExternalRequests.push({ origin: url.origin, pathname: url.pathname }); await route.abort("blockedbyclient"); return; }
    if (url.pathname.startsWith("/api/v1")) {
      const api = url.pathname.slice("/api/v1".length), query = Object.fromEntries(url.searchParams);
      const respond = data => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });
      const fail = (status, message) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_REJECTED", message } }) });
      if (request.method() !== "GET") { rejectedMutations.push({ method: request.method(), path: api }); await fail(405, "All API mutations rejected by isolated read-only QA"); return; }
      state.reads.push({ path: api, query });
      if (api === "/activity-log") {
        assert.equal(query.limit, "100", "Existing activity record limit changed"); assert(Object.keys(query).every(key => ["limit", "search", "action", "entityType"].includes(key)), "Unexpected activity filter contract");
        if (state.failNext) { state.failNext = false; state.failedReads++; await fail(503, "Synthetic temporary activity load failure"); return; }
        const filtered = activities.filter(item => (!query.search || JSON.stringify(item).toLowerCase().includes(query.search.toLowerCase())) && (!query.action || item.action.includes(query.action)) && (!query.entityType || item.entityType === query.entityType));
        await respond(filtered); return;
      }
      if (api === "/organizations/current") { await respond(organization); return; }
      if (api === "/notifications/summary") { await respond({ items: [], unreadCount: 0, total: 0 }); return; }
      if (api === "/me/ai-quota") { await respond({ tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-23T12:00:00.000Z" }); return; }
      unexpectedApiRequests.push({ method: request.method(), path: api }); await fail(404, "Unanticipated synthetic request rejected"); return;
    }
    await route.continue();
  });
  await page.goto(`${origin}/activity-log`, { waitUntil: "networkidle" });
  if (failFirst) await expect(page.locator(".error-state")).toBeVisible();
  else await expect(page.locator(`${listSelector} > tr:not(.activity-log-detail-row)`)).toHaveCount(count);
  await expect(page.locator(".activity-log-filters")).toBeVisible(); await settled(page); return { page, context, state };
}
async function layout(page) {
  return page.locator(listSelector).evaluate(element => {
    const cards = [...element.querySelectorAll(":scope > tr:not(.activity-log-detail-row)")], rows = new Map();
    for (const card of cards) { const top = Math.round(card.getBoundingClientRect().top); rows.set(top, (rows.get(top) ?? 0) + 1); }
    const texts = cards.flatMap(card => [...card.querySelectorAll("td, strong, small, code, span, button")]);
    const overflow = texts.filter(item => item.scrollWidth > item.clientWidth + 2 || item.scrollHeight > item.clientHeight + 2).map(item => ({ text: item.textContent, class: item.className, tag: item.tagName, width: item.clientWidth, scrollWidth: item.scrollWidth, height: item.clientHeight, scrollHeight: item.scrollHeight }));
    const hidden = texts.filter(item => { const s = getComputedStyle(item); return s.display === "none" || s.visibility !== "visible" || s.opacity === "0" || !item.getClientRects().length || Number.parseFloat(s.webkitLineClamp) > 0; }).map(item => item.textContent);
    const targets = cards.flatMap(card => [...card.querySelectorAll("button")]).map(item => { const r = item.getBoundingClientRect(); return { width: r.width, height: r.height, text: item.textContent }; });
    const labels = cards.map(card => [...card.querySelectorAll("td")].map(cell => { const pseudo = getComputedStyle(cell, "::before"); return { data: cell.dataset.label, content: pseudo.content, display: pseudo.display }; }));
    const region = element.closest(".activity-log-table"), table = element.closest("table");
    return { count: cards.length, columns: getComputedStyle(element).gridTemplateColumns, rows: [...rows.values()], cardWidths: cards.map(card => card.getBoundingClientRect().width), width: element.getBoundingClientRect().width, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, regionOverflow: region.scrollWidth > region.clientWidth + 1, regionScrollable: region.getAttribute("data-scrollable"), regionTabIndex: region.getAttribute("tabindex"), regionHint: region.querySelector(":scope > .sr-only")?.textContent ?? null, tableMinWidth: getComputedStyle(table).minWidth, overflow, hidden, targets, labels };
  });
}
async function fingerprint(page, selector) { return page.locator(selector).evaluateAll(items => items.map(item => { const s = getComputedStyle(item), r = item.getBoundingClientRect(); return { html: item.outerHTML, display: s.display, columns: s.gridTemplateColumns, gap: s.gap, padding: s.padding, border: s.border, radius: s.borderRadius, font: s.font, color: s.color, background: s.backgroundColor, width: r.width, height: r.height }; })); }
async function keyboardFocus(page) {
  const buttons = page.locator(`${listSelector} > tr:not(.activity-log-detail-row) button`); await buttons.first().focus(); await page.keyboard.press("Tab");
  const focused = await page.locator(":focus").evaluate(element => { const s = getComputedStyle(element); return { insideActivity: Boolean(element.closest(".activity-log-table")), visible: element.matches(":focus-visible"), outline: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow }; });
  assert(focused.insideActivity && focused.visible); assert(focused.outline !== "none" && Number.parseFloat(focused.outlineWidth) > 0 || focused.boxShadow !== "none", "Keyboard focus has no visible treatment"); return focused;
}
async function screenshot(page, name, selector = ".activity-log-table") { const file = `${evidence}/${deployed ? "deployed-" : ""}${name}.png`; await page.locator(selector).screenshot({ path: file }); screenshots.push({ path: file, sha256: sha(file) }); }
async function expandedDetails(page, index, item) {
  const row = page.locator(`${listSelector} > tr:not(.activity-log-detail-row)`).nth(index); await row.locator("button").click();
  const detail = page.locator(".activity-log-detail-row"); await expect(detail).toHaveCount(1); await expect(detail).toBeVisible();
  const result = await detail.evaluate(element => { const r = element.getBoundingClientRect(), list = element.parentElement.getBoundingClientRect(); return { width: r.width, listWidth: list.width, left: r.left, listLeft: list.left, gridColumn: getComputedStyle(element).gridColumn, followingMainRow: element.previousElementSibling?.classList.contains("activity-log-detail-row") === false }; });
  assert(Math.abs(result.width - result.listWidth) <= 2, "Expanded detail does not span full card grid"); assert(Math.abs(result.left - result.listLeft) <= 2); assert(result.followingMainRow);
  await expect(detail.locator(".activity-log-detail-summary code").first()).toHaveText(item.action);
  if (item.metadata) await expect(detail.locator("pre").first()).toHaveText(JSON.stringify(item.metadata, null, 2));
  if (item.userAgent) await expect(detail.locator("pre").nth(1)).toHaveText(item.userAgent);
  const pre = await detail.locator("pre").evaluateAll(items => items.map(item => { const s = getComputedStyle(item), rect = item.getBoundingClientRect(); const before = { clientWidth: item.clientWidth, scrollWidth: item.scrollWidth, clientHeight: item.clientHeight, scrollHeight: item.scrollHeight, overflowY: s.overflowY, left: rect.left, right: rect.right, text: item.textContent }; item.scrollTop = item.scrollHeight; return { ...before, bottomReachable: item.scrollTop + item.clientHeight >= item.scrollHeight - 2 }; }));
  assert(pre.every(item => item.left >= -1 && item.right <= Number(page.viewportSize().width) + 1 && item.scrollWidth <= item.clientWidth + 2 && item.bottomReachable), "Expanded metadata or user agent is clipped or inaccessible");
  assert(pre.some(item => item.scrollHeight > item.clientHeight), "Long metadata scrolling fixture not exercised");
  assert.equal(await page.evaluate(() => Boolean(window.qaUnexpectedExecution)), false); await expect(detail.locator("pre img, pre script")).toHaveCount(0);
  return { ...result, pre: pre.map(({ text, ...rest }) => rest), escapedMetadataPreserved: true };
}
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  const variants = deployed ? [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "fa", theme: "white" }, { width: 1600, locale: "en", theme: "blue" }] : [...[320, 390, 640, 768, 1024, 1280, 1440, 1600].map(width => ({ width, locale: "fa", theme: "white" })), { width: 390, locale: "en", theme: "blue" }, { width: 1600, locale: "en", theme: "blue" }];
  for (const options of variants) await check(`activity-grid-${options.width}-${options.locale}-${options.theme}`, async () => {
    const { page, context, state } = await contextPage(options);
    try {
      const table = page.locator(".activity-log-table > table"), before = await table.evaluate(element => element.outerHTML); await supplement(page);
      assert.equal(await table.evaluate(element => element.outerHTML), before, "Activity cells, labels or controls changed after CSS supplement");
      const result = await layout(page), expected = options.width >= 1280 ? 4 : options.width >= 1024 ? 3 : options.width >= 640 ? 2 : 1;
      assert.equal(result.count, 17); assert.equal(result.rows[0], expected); assert(result.rows.every((count, index) => index === result.rows.length - 1 ? count <= expected : count === expected)); assert.equal(result.pageOverflow, false); assert.equal(result.regionOverflow, false); assert.equal(result.regionScrollable, null); assert.equal(result.regionTabIndex, null); assert.equal(result.regionHint, null); assert.equal(result.tableMinWidth, "0px"); assert.deepEqual(result.overflow, []); assert.deepEqual(result.hidden, []); assert(result.targets.every(target => target.width >= 44 && target.height >= 44));
      const headings = await table.locator("thead th").allTextContents(); assert.equal(headings.length, 6); await expect(table.locator('thead th[scope="col"]')).toHaveCount(6); await expect(page.getByRole("table")).toHaveCount(1); await expect(page.getByRole("columnheader")).toHaveCount(6);
      const headerState = await table.locator("thead").evaluate(element => ({ display: getComputedStyle(element).display, ariaHidden: element.getAttribute("aria-hidden"), hidden: element.hidden })); assert.notEqual(headerState.display, "none"); assert.notEqual(headerState.ariaHidden, "true"); assert.equal(headerState.hidden, false);
      for (const labels of result.labels) { assert.deepEqual(labels.map(item => item.data), headings); assert(labels.every(item => item.display !== "none" && JSON.parse(item.content) === item.data), "Card field labels missing"); }
      assert.deepEqual(await table.locator("tbody > tr:not(.activity-log-detail-row) .event-code").allTextContents(), state.activities.map(item => item.action));
      const focus = await keyboardFocus(page); if ([1440, 390].includes(options.width)) await screenshot(page, `activities-${options.width}-${options.locale}-${options.theme}`);
      return { ...result, expectedColumns: expected, originalSixFieldsPreserved: true, accessibleColumnHeaders: headerState, keyboardFocus: focus };
    } finally { await context.close(); }
  });
  if (!deployed) {
    for (const count of [0, 1]) await check(`activity-${count ? "single" : "empty"}-state`, async () => {
      const { page, context } = await contextPage({ count, locale: "en" });
      try { const before = await page.locator(".page-shell").innerHTML(); await supplement(page); assert.equal(await page.locator(".page-shell").innerHTML(), before); if (!count) await expect(page.getByText("No activity has been recorded.", { exact: true })).toBeVisible(); else { const result = await layout(page); assert.equal(result.count, 1); assert.deepEqual(result.hidden, []); assert.deepEqual(result.overflow, []); } return { count, existingStatePreserved: true }; }
      finally { await context.close(); }
    });
    await check("activity-unrelated-sections-and-table-preserved", async () => {
      const { page, context } = await contextPage();
      try {
        await page.locator(".page-shell").evaluate(element => { const fixture = document.createElement("div"); fixture.className = "qa-unrelated-surface"; fixture.innerHTML = '<div class="simple-list"><div class="simple-list-row"><div><strong>Unrelated synthetic content</strong><small>Existing presentation retained</small></div><button class="text-button" type="button">Unrelated action</button></div></div><div class="table-wrap"><table><thead><tr><th>Unrelated table heading</th></tr></thead><tbody><tr><td>Unrelated table value</td></tr></tbody></table></div>'; element.appendChild(fixture); });
        await settled(page); const selector = ".page-header, .activity-log-filters, .activity-log-filters *, .qa-unrelated-surface, .qa-unrelated-surface *", before = await fingerprint(page, selector); await supplement(page); assert.deepEqual(await fingerprint(page, selector), before); return { comparedElements: before.length, fingerprintsEqual: true };
      } finally { await context.close(); }
    });
    await check("activity-existing-filters-search-reset-readonly-contract", async () => {
      const { page, context, state } = await contextPage({ locale: "en" });
      try {
        await supplement(page); await page.locator(`${listSelector} > tr`).first().locator("button").click(); await expect(page.locator(".activity-log-detail-row")).toHaveCount(1);
        const inputs = page.locator(".activity-log-filters input"), beforeTyping = state.reads.filter(item => item.path === "/activity-log").length;
        await inputs.nth(0).fill(" needle-activity "); await inputs.nth(1).fill(" RULA_IMAGE_ANALYSIS "); await inputs.nth(2).fill(" Rula "); assert.equal(state.reads.filter(item => item.path === "/activity-log").length, beforeTyping, "Typing unexpectedly submitted filters");
        await page.locator(".activity-log-filters button[type=submit]").click(); await expect(page.locator(`${listSelector} > tr:not(.activity-log-detail-row)`)).toHaveCount(1); await expect(page.locator(".activity-log-detail-row")).toHaveCount(0);
        const filtered = state.reads.filter(item => item.path === "/activity-log").at(-1); assert.deepEqual(filtered.query, { limit: "100", search: "needle-activity", action: "RULA_IMAGE_ANALYSIS", entityType: "Rula" });
        await page.locator(".activity-log-filters").getByRole("button", { name: "Clear", exact: true }).click(); await expect(page.locator(`${listSelector} > tr:not(.activity-log-detail-row)`)).toHaveCount(17); assert.deepEqual(await inputs.evaluateAll(items => items.map(item => item.value)), ["", "", ""]); assert.deepEqual(state.reads.filter(item => item.path === "/activity-log").at(-1).query, { limit: "100" }); return { typingDoesNotSubmit: true, filterQuery: filtered.query, resetRestoredOriginalQuery: true, mutations: 0 };
      } finally { await context.close(); }
    });
    await check("activity-existing-load-error-retry-and-toolbar-refresh", async () => {
      const { page, context, state } = await contextPage({ failFirst: true, locale: "en" });
      try {
        await supplement(page); await expect(page.locator(".error-state")).toContainText("Synthetic temporary activity load failure"); await page.locator(".error-state").getByRole("button", { name: "Try again", exact: true }).click(); await expect(page.locator(`${listSelector} > tr:not(.activity-log-detail-row)`)).toHaveCount(17);
        const before = state.reads.filter(item => item.path === "/activity-log").length; await page.locator(".page-header").getByRole("button", { name: "Try again", exact: true }).click(); await expect.poll(() => state.reads.filter(item => item.path === "/activity-log").length).toBe(before + 1); await expect(page.locator(`${listSelector} > tr:not(.activity-log-detail-row)`)).toHaveCount(17); assert.equal(state.failedReads, 1); return { failedReads: state.failedReads, loadRecovered: true, toolbarRefreshReadCount: 1, mutationCount: 0 };
      } finally { await context.close(); }
    });
    for (const width of [1440, 390]) await check(`activity-expanded-details-${width}`, async () => {
      const { page, context, state } = await contextPage({ width, locale: "en", theme: width === 390 ? "blue" : "white" });
      try {
        await supplement(page); const result = await expandedDetails(page, 0, state.activities[0]); await screenshot(page, `activity-details-${width}`, ".activity-log-detail-row");
        await page.locator(`${listSelector} > tr:not(.activity-log-detail-row)`).nth(4).locator("button").click(); await expect(page.locator(".activity-log-detail-row")).toHaveCount(1); await expect(page.locator(".activity-log-detail-summary code").first()).toHaveText(state.activities[4].action);
        await page.locator(`${listSelector} > tr:not(.activity-log-detail-row)`).nth(4).locator("button").click(); await expect(page.locator(".activity-log-detail-row")).toHaveCount(0); const closed = await layout(page); assert.equal(closed.count, 17); assert.equal(closed.rows[0], width >= 1280 ? 4 : 1); return { ...result, exactlyOneDetailAtATime: true, collapseRestoredCardGrid: true };
      } finally { await context.close(); }
    });
  }
  assert.deepEqual(pageErrors, []); assert.deepEqual(rejectedMutations, []); assert.deepEqual(unexpectedApiRequests, []); assert.deepEqual(blockedExternalRequests, []); assert.deepEqual(allowedSyntheticMutations, []);
  assert.equal(sha(manifestFile), manifestSha256); assert.equal(sha(runtimeFile), runtimeSha256); assert.equal(sha(cssFile), manifest.cssSupplementSha256); assert.equal(sha(helper), helperSha256); assert.equal(sha(capturedIndex), runtime.indexSha256); assert.equal(sha(`${live}/index.html`), expectedIndexSha256);
  for (const file of manifest.files) assert.equal(sha(`${work}/candidate/${file.path}`), file.sha256, `Candidate source changed ${file.path}`);
  for (const [relative, digest] of accessed) assert.equal(sha(`${live}/${relative}`), digest);
} catch (error) { fatal = error.message; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = !fatal && checks.length === (deployed ? 3 : 17) && checks.every(check => check.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: deployed ? "Exact published index and immutable linked assets; synthetic loopback GET APIs only" : "Captured deployed index and unchanged live assets; candidate activity-card CSS added in browser", noApplicationSourceOrBuildChanged: true, existingPagination: "No pagination controls exist; the existing limit=100 request contract was retained and verified" });
console.log(JSON.stringify({ status, task, total: checks.length, passed: checks.filter(check => check.status === "PASS").length, failed: checks.filter(check => check.status === "FAIL").length, fatal })); if (status !== "PASS") process.exitCode = 1;
