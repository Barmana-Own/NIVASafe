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
const listSelector = ".simple-list:has(> .simple-list-row > .organization-row-actions)";
const cardSelector = ":scope > .simple-list-row";
const checks = [], pageErrors = [], blockedExternalRequests = [], unexpectedApiRequests = [], rejectedMutations = [], allowedSyntheticMutations = [];
const screenshots = [];
let browser, serverClosed = false, browserClosed = false, fatal;
const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".json": "application/json" };
const server = http.createServer((request, response) => {
  try {
    assert.equal(request.method, "GET");
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    response.setHeader("cache-control", "no-store");
    if (url.pathname === "/qa/company-directory-cards.css") { response.setHeader("content-type", "text/css"); response.end(css); return; }
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
const fixtureOrganizations = count => Array.from({ length: count }, (_, i) => ({
  id: `qa-company-${i + 1}`,
  nameFa: i === 0 ? "شرکت آزمایشی با نام فارسی بسیار طولانی برای اطمینان از نمایش کامل تمام اطلاعات و رعایت راست‌به‌چپ" : i === 1 ? "فضای کاری ترکیبی — Synthetic quality company 2026" : `شرکت مصنوعی ${i + 1}`,
  nameEn: i === 0 ? "Synthetic RULA live smoke company with a deliberately long organization name for wrapping" : i === 1 ? `UnbrokenOrganizationIdentifier${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(3)}` : `Synthetic company ${i + 1}`,
  industry: i % 3 === 0 ? "ایمنی و بهداشت حرفه‌ای — Occupational safety and industrial engineering" : i % 3 === 1 ? null : "تجهیزات صنعتی",
  employeeCount: i % 3 === 0 ? 123456 : i % 3 === 1 ? null : 42,
  active: i % 3 !== 1, role: "ORG_ADMIN", subscriptionPlan: "ENTERPRISE",
  subscriptionStatus: ["ACTIVE", "PENDING_PAYMENT", "EXPIRED", "CANCELED"][i % 4],
  subscriptionExpiresAt: null, subscriptionProvider: "legacy", timezone: "Asia/Tehran", defaultLocale: "fa",
}));
const currentOrganization = { ...fixtureOrganizations(1)[0], id: "qa-current-company", nameFa: "شرکت جاری مصنوعی", nameEn: "Synthetic current company", industry: "ایمنی", employeeCount: 12, active: true, subscriptionStatus: "ACTIVE" };
const baseSession = {
  accessToken: "synthetic-company-browser-validation-token", refreshToken: "synthetic-company-browser-validation-refresh",
  user: { id: "qa-company-cards-user", email: "company-cards@nivasafe.test", username: "company_cards_qa", displayName: "مدیر مصنوعی شرکت‌ها", globalRole: "SUPER_ADMIN" },
};
const dashboard = { counters: { projects: 3, fmeas: 2, rulas: 4, openActions: 1 }, riskDistribution: [], actionDistribution: [], recent: { fmeas: [], rulas: [] } };
function bindings() { return { candidateManifestSha256: manifestSha256, cssSupplementSha256: sha(cssFile), helperSha256, runtimeBeforeSha256: runtimeSha256, baselineIndexSha256: runtime.indexSha256, liveIndexSha256: sha(`${live}/index.html`), ...(deployed ? { deploymentSha256: sha(deploymentFile), deployedCssAsset: deployment.cssAsset } : {}), liveStaticInputs: [...accessed].map(([relative, sha256]) => ({ path: relative, sha256 })), productionNetworkRequests: 0, productionMutations: 0, blockedExternalRequests, rejectedApiMutations: rejectedMutations, unexpectedApiRequests, allowedSyntheticMutations, pageErrors }; }
function save(status, extra = {}) { fs.writeFileSync(output, JSON.stringify({ status, task, at: new Date().toISOString(), ...bindings(), total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, pending: 0, checks, screenshots, ...extra }, null, 2)); }
async function check(name, run) {
  const record = { name, status: "RUNNING" }, started = performance.now(); checks.push(record); save("RUNNING");
  try { record.details = await run(); record.status = "PASS"; }
  catch (error) { record.status = "FAIL"; record.error = error.message; }
  record.elapsedMs = Math.round(performance.now() - started); save("RUNNING"); console.log(JSON.stringify({ name, status: record.status, error: record.error }));
}
async function settled(page) { await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => undefined))); }); }
async function supplement(page) { if (!deployed) await page.addStyleTag({ url: `${origin}/qa/company-directory-cards.css` }); await settled(page); }
async function contextPage({ width = 1440, locale = "fa", theme = "white", count = 23, workflow = false } = {}) {
  const organizations = fixtureOrganizations(count), state = { organizations, reads: [], mutations: [], navigation: [] };
  const session = { ...baseSession, user: { ...baseSession.user, locale }, organizations: [currentOrganization, ...organizations] };
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "fa" ? "fa-IR" : "en-US", timezoneId: "Asia/Tehran", serviceWorkers: "block", deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage(); page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(({ value, locale, theme }) => {
    if (!localStorage.getItem("nivasafe-session")) { localStorage.setItem("nivasafe-session", JSON.stringify(value)); localStorage.setItem("nivasafe-org", value.organizations[0].id); }
    localStorage.setItem("nivasafe-locale", locale); localStorage.setItem("nivasafe-theme", theme); sessionStorage.setItem("nivasafe-path-selected", "safety");
  }, { value: session, locale, theme });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    // No network request outside the owned loopback origin can be continued.
    if (url.hostname === "fonts.googleapis.com") { await route.fulfill({ status: 200, contentType: "text/css", body: stylesheet }); return; }
    if (url.origin !== origin) { blockedExternalRequests.push({ origin: url.origin, pathname: url.pathname }); await route.abort("blockedbyclient"); return; }
    if (url.pathname.startsWith("/api/v1")) {
      const api = url.pathname.slice("/api/v1".length);
      const respond = data => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });
      const fail = (status, message) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_REJECTED", message } }) });
      if (request.method() !== "GET") {
        if (workflow && request.method() === "PATCH" && api === "/organizations/qa-company-2/status") {
          const body = JSON.parse(request.postData() ?? "{}"); assert.deepEqual(body, { active: true, confirmation: "ACTIVATE" });
          const record = { method: "PATCH", path: api, body, loopbackOnly: true }; state.mutations.push(record); allowedSyntheticMutations.push(record); organizations[1].active = true; await respond(organizations[1]); return;
        }
        rejectedMutations.push({ method: request.method(), path: api }); await fail(405, "Unanticipated synthetic mutation rejected"); return;
      }
      state.reads.push({ path: api });
      if (api === "/organizations") { await respond(organizations); return; }
      if (api === "/organizations/current") { const selected = request.headers()["x-organization-id"]; await respond(session.organizations.find(item => item.id === selected) ?? currentOrganization); return; }
      if (api === "/dashboard") { await respond(dashboard); return; }
      if (api === "/notifications/summary") { await respond({ items: [], unreadCount: 0, total: 0 }); return; }
      if (api === "/me/ai-quota") { await respond({ tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-23T12:00:00.000Z" }); return; }
      unexpectedApiRequests.push({ method: request.method(), path: api }); await fail(404, "Unanticipated synthetic request rejected"); return;
    }
    if (workflow && request.isNavigationRequest() && request.resourceType() === "document" && url.pathname === "/") {
      state.navigation.push("/"); await route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><html><head><title>Synthetic local organization entry destination</title></head><body>Local entry destination</body></html>" }); return;
    }
    await route.continue();
  });
  await page.goto(`${origin}/organizations`, { waitUntil: "networkidle" });
  await expect(page.locator(".organization-row-actions")).toHaveCount(count); await expect(page.locator(".subscription-panel")).toBeVisible();
  await settled(page); return { page, context, state };
}
async function layout(page) {
  return page.locator(listSelector).evaluate(element => {
    const cards = [...element.children], groups = new Map(), rect = element.getBoundingClientRect();
    for (const card of cards) { const top = Math.round(card.getBoundingClientRect().top); groups.set(top, (groups.get(top) ?? 0) + 1); }
    const text = cards.flatMap(card => [...card.querySelectorAll("strong, small, .status-badge, .organization-status, button")]);
    const buttons = cards.flatMap(card => [...card.querySelectorAll("button")]);
    const overflow = text.filter(item => item.scrollWidth > item.clientWidth + 2 || item.scrollHeight > item.clientHeight + 2).map(item => ({ text: item.textContent, class: item.className, width: item.clientWidth, scrollWidth: item.scrollWidth, height: item.clientHeight, scrollHeight: item.scrollHeight }));
    const hidden = text.filter(item => { const style = getComputedStyle(item); return style.display === "none" || style.visibility !== "visible" || style.opacity === "0" || !item.getClientRects().length || Number.parseFloat(style.webkitLineClamp) > 0; }).map(item => item.textContent);
    const targets = buttons.map(item => { const r = item.getBoundingClientRect(); return { width: r.width, height: r.height, text: item.textContent }; });
    return { count: cards.length, columns: getComputedStyle(element).gridTemplateColumns, rows: [...groups.values()], width: rect.width, cardWidths: cards.map(card => card.getBoundingClientRect().width), pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, overflow, hidden, targets };
  });
}
async function fingerprint(page, selector) {
  return page.locator(selector).evaluateAll(items => items.map(item => { const s = getComputedStyle(item), r = item.getBoundingClientRect(); return { html: item.outerHTML, display: s.display, columns: s.gridTemplateColumns, gap: s.gap, padding: s.padding, border: s.border, radius: s.borderRadius, font: s.font, color: s.color, background: s.backgroundColor, width: r.width, height: r.height }; }));
}
async function keyboardFocus(page) {
  const button = page.locator(`${listSelector} > .simple-list-row`).first().locator("button").first();
  await button.focus(); await page.keyboard.press("Tab");
  const focused = await page.locator(":focus").evaluate(element => { const style = getComputedStyle(element); return { class: element.parentElement.className, visible: element.matches(":focus-visible"), outline: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow }; });
  assert.equal(focused.class, "organization-row-actions"); assert(focused.visible, "Company action not keyboard-focus-visible"); assert((focused.outline !== "none" && Number.parseFloat(focused.outlineWidth) > 0) || focused.boxShadow !== "none", "Visible focus treatment absent"); return focused;
}
async function screenshot(page, name) { const file = `${evidence}/${deployed ? "deployed-" : ""}${name}.png`; await page.locator(listSelector).screenshot({ path: file }); screenshots.push({ path: file, sha256: sha(file) }); }
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  const variants = deployed ? [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "fa", theme: "white" }, { width: 1600, locale: "en", theme: "blue" }] : [...[320, 390, 560, 768, 1024, 1280, 1440, 1600].map(width => ({ width, locale: "fa", theme: "white" })), { width: 390, locale: "en", theme: "blue" }, { width: 1600, locale: "en", theme: "blue" }];
  for (const options of variants) await check(`company-grid-${options.width}-${options.locale}-${options.theme}`, async () => {
    const { page, context, state } = await contextPage(options);
    try {
      const list = page.locator(listSelector), before = await list.evaluate(element => element.outerHTML), companies = state.organizations;
      await supplement(page); assert.equal(await list.evaluate(element => element.outerHTML), before, "Company content or controls changed after presentation supplement");
      const result = await layout(page), expected = options.width >= 1280 ? 5 : options.width >= 1024 ? 4 : options.width >= 768 ? 3 : options.width >= 560 ? 2 : 1;
      assert.equal(result.count, 23); assert.equal(result.rows[0], expected); assert(result.rows.every((count, index) => index === result.rows.length - 1 ? count <= expected : count === expected), "Cards do not wrap in requested column count");
      assert.equal(result.pageOverflow, false); assert.deepEqual(result.overflow, []); assert.deepEqual(result.hidden, []); assert(result.targets.every(target => target.width >= 44 && target.height >= 44), "Company button touch target below44px");
      const cards = list.locator(cardSelector); await expect(cards.locator(".status-badge")).toHaveCount(23); await expect(cards.locator(".organization-status")).toHaveCount(23); await expect(cards.locator("button")).toHaveCount(46);
      assert.deepEqual(await cards.locator("strong").allTextContents(), companies.map(item => options.locale === "en" ? item.nameEn : item.nameFa));
      const focus = await keyboardFocus(page); if (options.width === 1440 || options.width === 390) await screenshot(page, `companies-${options.width}-${options.locale}-${options.theme}`);
      return { ...result, expectedColumns: expected, contentAndControlsPreserved: true, keyboardFocus: focus, apiReadPaths: [...new Set(state.reads.map(item => item.path))] };
    } finally { await context.close(); }
  });
  if (!deployed) {
  for (const count of [0, 1]) await check(`company-${count === 0 ? "empty" : "single"}-state`, async () => {
    const { page, context } = await contextPage({ count, width: 1440, locale: "en" });
    try {
      const body = await page.locator(".page-shell").evaluate(element => element.outerHTML); await supplement(page); assert.equal(await page.locator(".page-shell").evaluate(element => element.outerHTML), body);
      if (!count) { await expect(page.getByText("No other company has been registered.", { exact: true })).toBeVisible(); await expect(page.locator(listSelector)).toHaveCount(0); }
      else { const result = await layout(page); assert.equal(result.count, 1); assert.deepEqual(result.hidden, []); assert.deepEqual(result.overflow, []); assert.equal(result.pageOverflow, false); }
      return { count, originalStatePreserved: true };
    } finally { await context.close(); }
  });
  await check("unrelated-organization-sections-and-simple-list-preserved", async () => {
    const { page, context } = await contextPage();
    try {
      await page.locator(".page-shell").evaluate(element => { const fixture = document.createElement("div"); fixture.className = "simple-list qa-unrelated-list"; fixture.innerHTML = '<div class="simple-list-row"><div><strong>Synthetic unrelated list title</strong><small>Unrelated details</small></div><button class="text-button" type="button">Unrelated action</button></div>'; element.appendChild(fixture); });
      await settled(page);
      const selector = ".page-header, .crm-kpis, .subscription-panel, .form-panels, .qa-unrelated-list, .qa-unrelated-list *", before = await fingerprint(page, selector);
      assert(before.length >= 6); await supplement(page); assert.deepEqual(await fingerprint(page, selector), before, "Unrelated content or computed presentation changed");
      return { comparedElements: before.length, fingerprintsEqual: true };
    } finally { await context.close(); }
  });
  for (const active of [true, false]) await check(`existing-enter-${active ? "operational" : "inactive"}-company`, async () => {
    const { page, context, state } = await contextPage({ workflow: true, locale: "en" });
    try {
      await supplement(page); const index = active ? 12 : 1, target = state.organizations[index];
      assert.equal(target.active, active); if (active) assert.equal(target.subscriptionStatus, "ACTIVE");
      const button = page.locator(`${listSelector} > .simple-list-row`).nth(index).locator("button").first();
      await Promise.all([page.waitForNavigation({ waitUntil: "networkidle" }), button.click()]);
      assert.equal(new URL(page.url()).pathname, active ? "/" : "/organizations"); assert.equal(await page.evaluate(() => localStorage.getItem("nivasafe-org")), target.id); assert.deepEqual(state.mutations, []);
      return { destination: new URL(page.url()).pathname, selectedCompanyId: target.id, mutationCount: 0, actualBundleEnterHandlerExercised: true };
    } finally { await context.close(); }
  });
  await check("existing-activation-dialogs-cancel-confirm-and-local-state", async () => {
    const { page, context, state } = await contextPage({ workflow: true, locale: "en" });
    try {
      await supplement(page); const card = page.locator(`${listSelector} > .simple-list-row`).nth(1), button = card.locator("button").nth(1), dialog = page.getByRole("dialog");
      await button.click(); await expect(dialog).toBeVisible(); await expect(dialog).toContainText("Confirm activation"); await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); await expect(dialog).toHaveCount(0); assert.deepEqual(state.mutations, []);
      await button.click(); await dialog.getByRole("button", { name: "Confirm", exact: true }).click(); await expect(dialog).toBeVisible(); await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); await expect(dialog).toHaveCount(0); assert.deepEqual(state.mutations, []);
      await button.click(); await dialog.getByRole("button", { name: "Confirm", exact: true }).click(); await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
      await expect(card.locator(".organization-status")).toHaveText("Active"); await expect(card.locator("button").nth(1)).toHaveText("Deactivate"); assert.equal(state.mutations.length, 1);
      return { canceledFirstDialog: true, canceledSecondDialog: true, bothConfirmationsRequired: true, localMutations: state.mutations, productionMutations: 0 };
    } finally { await context.close(); }
  });
  }
  assert.deepEqual(pageErrors, []); assert.deepEqual(rejectedMutations, []); assert.deepEqual(unexpectedApiRequests, []); assert.deepEqual(blockedExternalRequests, []);
  assert.equal(sha(manifestFile), manifestSha256); assert.equal(sha(runtimeFile), runtimeSha256); assert.equal(sha(cssFile), manifest.cssSupplementSha256); assert.equal(sha(helper), helperSha256); assert.equal(sha(capturedIndex), runtime.indexSha256); assert.equal(sha(`${live}/index.html`), expectedIndexSha256);
  for (const file of manifest.files) assert.equal(sha(`${work}/candidate/${file.path}`), file.sha256, `Candidate source changed ${file.path}`);
  for (const [relative, digest] of accessed) assert.equal(sha(`${live}/${relative}`), digest);
} catch (error) { fatal = error.message; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = !fatal && checks.length === (deployed ? 3 : 16) && checks.every(check => check.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: deployed ? "Exact deployed index and linked immutable assets including the published company-card CSS; synthetic loopback APIs only" : "Captured deployed index and unchanged live static assets; only the candidate company-card CSS added to the browser", noApplicationSourceOrBuildChanged: true });
console.log(JSON.stringify({ status, task, total: checks.length, passed: checks.filter(check => check.status === "PASS").length, failed: checks.filter(check => check.status === "FAIL").length, fatal }));
if (status !== "PASS") process.exitCode = 1;
