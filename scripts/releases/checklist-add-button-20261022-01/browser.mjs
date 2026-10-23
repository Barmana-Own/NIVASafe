import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { root, task, work, evidence, live, sha, read } from "./prepare.mjs";

// Exercise the already deployed bundle with only the proposed checklist control presentation
// supplement added. All account data and API responses are synthetic.
const require = createRequire(`${root}/frontend/package.json`);
const { chromium, expect } = require("@playwright/test");
const helper = fileURLToPath(import.meta.url);
const manifestFile = `${evidence}/candidate.json`;
assert(fs.existsSync(manifestFile), "Freeze the candidate before browser validation");
const manifestSha256 = sha(manifestFile);
const manifest = read(manifestFile);
const cssFile = manifest.cssSupplement ?? `${work}/add-button.css`;
assert.equal(sha(cssFile), manifest.cssSupplementSha256, "CSS supplement differs from candidate");
const css = fs.readFileSync(cssFile);
const originalHtml = fs.readFileSync(`${live}/index.html`, "utf8");
const liveIndexSha256 = sha(`${live}/index.html`);
const output = `${evidence}/e2e-validation.json`;
assert(!fs.existsSync(output), "Preserve prior browser evidence before rerunning");
fs.mkdirSync(evidence, { recursive: true });
const accessed = new Map([["index.html", liveIndexSha256]]);
const staticRoot = path.resolve(live);
const fontRoot = `${root}/frontend/tests/e2e/assets`;
const mimeTypes = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".json": "application/json" };
const session = {
  accessToken: "synthetic-browser-validation-token",
  refreshToken: "synthetic-browser-validation-refresh",
  user: { id: "qa-report-cards-user", email: "report-cards@nivasafe.test", username: "report_cards_qa", displayName: "کاربر آزمون کارت گزارش", locale: "fa", globalRole: "SUPER_ADMIN" },
  organizations: [{ id: "qa-report-cards-org", nameFa: "سازمان آزمایشی کارت گزارش", nameEn: "Synthetic Report Card Organization", role: "ORG_ADMIN", active: true, subscriptionPlan: "ENTERPRISE", subscriptionStatus: "ACTIVE" }],
};
const reports = Array.from({ length: 14 }, (_, i) => ({
  id: `qa-report-${i + 1}`,
  type: i % 2 ? "FMEA" : "RULA",
  title: i === 11 ? "عنوان بسیار طولانی گزارش نهایی ارزیابی وضعیت اپراتور در فرایند مونتاژ و بسته‌بندی تجهیزات کنترل صنعتی — Long mixed direction assessment report title" : `${i % 2 ? "ارزیابی ریسک" : "ارزیابی پوسچر"} اپراتور ${i + 1}`,
  code: `${i % 2 ? "FMEA" : "RULA"}-QA-${i + 1}`,
  projectName: i === 11 ? "پروژه آزمایشی سازمان با نام بسیار طولانی برای حفظ تمامی اطلاعات و جلوگیری از حذف محتوا" : "پروژه آزمایشی NIVASafe",
  projectCode: i === 11 ? `PROJECT-CODE-${"1234567890".repeat(6)}` : `PRJ-QA-${i + 1}`,
  finalizedAt: `2026-10-${String(22 - i).padStart(2, "0")}T12:30:45.000Z`,
}));
const files = [
  { id: "qa-file-image", originalName: "تصویر سازمان آزمایشی.png", mimeType: "image/png", size: 1024, kind: "IMAGE", createdAt: "2026-10-22T12:00:00.000Z", reference: { type: "RULA", title: "ارزیابی اصلی", code: "RULA-QA" } },
  { id: "qa-file-document", originalName: "Synthetic organization report.pdf", mimeType: "application/pdf", size: 2048, kind: "DOCUMENT", createdAt: "2026-10-21T12:00:00.000Z" },
];
const checks = [];
const blockedExternalRequests = [];
const mutations = [];
const pageErrors = [];
let browser;
let serverClosed = false;
let browserClosed = false;
const server = http.createServer((request, response) => {
  try {
    assert.equal(request.method, "GET");
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    response.setHeader("cache-control", "no-store");
    if (url.pathname === "/qa/report-cards.css") { response.setHeader("content-type", "text/css"); response.end(css); return; }
    if (url.pathname === "/qa/font-arabic.woff2" || url.pathname === "/qa/font-latin.woff2") {
      const name = url.pathname.includes("arabic") ? "vazirmatn-arabic.woff2" : "vazirmatn-latin.woff2";
      response.setHeader("content-type", "font/woff2"); response.end(fs.readFileSync(`${fontRoot}/${name}`)); return;
    }
    const decoded = decodeURIComponent(url.pathname);
    assert(!decoded.includes("\0") && !decoded.includes("\\"));
    const target = path.resolve(staticRoot, `.${decoded}`);
    assert(target.startsWith(`${staticRoot}${path.sep}`), "Static traversal rejected");
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      const relative = path.relative(staticRoot, target).replaceAll("\\", "/");
      const digest = sha(target);
      if (accessed.has(relative)) assert.equal(accessed.get(relative), digest, "Live static input changed during QA");
      else accessed.set(relative, digest);
      response.setHeader("content-type", mimeTypes[path.extname(target)] ?? "application/octet-stream");
      response.end(fs.readFileSync(target)); return;
    }
    assert(!path.extname(decoded), "Unknown static artifact");
    response.setHeader("content-type", "text/html; charset=utf-8"); response.end(originalHtml);
  } catch { response.statusCode = 404; response.end("Not found"); }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
const stylesheet = [
  "@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;font-display:swap;src:url('/qa/font-arabic.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200F,U+FB50-FDFF,U+FE70-FEFF}",
  "@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;font-display:swap;src:url('/qa/font-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+2000-206F}",
].join("\n");
const bound = () => ({ candidateManifestSha256: manifestSha256, cssSupplementSha256: sha(cssFile), helperSha256: sha(helper), liveIndexSha256, liveStaticInputs: [...accessed].map(([relative, sha256]) => ({ path: relative, sha256 })), productionNetworkRequests: 0, blockedExternalRequests, productionMutations: 0, attemptedApiMutations: mutations, pageErrors });
function save(status, extra = {}) {
  fs.writeFileSync(output, JSON.stringify({ status, task, at: new Date().toISOString(), ...bound(), total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, pending: 0, checks, ...extra }, null, 2));
}
async function check(name, fn) {
  const started = performance.now();
  const record = { name, status: "RUNNING" }; checks.push(record); save("RUNNING");
  try { Object.assign(record, { status: "PASS", details: await fn() }); }
  catch (error) { Object.assign(record, { status: "FAIL", error: error.message }); }
  record.elapsedMs = Math.round(performance.now() - started); save("RUNNING");
  console.log(JSON.stringify({ name, status: record.status }));
}

const addSelector = ".checklists-page .checklist-item-editor > button.secondary";
const templates = [
  { id: "qa-template-draft", familyId: "qa-family-draft", version: 1, title: "قالب پیش‌نویس آزمایشی", description: "محتوای مصنوعی برای حفظ دکمه‌های دیگر", status: "DRAFT", items: [{ id: "qa-draft-item", label: "بازرسی تجهیزات", required: true }] },
  { id: "qa-template-published", familyId: "qa-family-published", version: 2, title: "قالب منتشرشده آزمایشی", status: "PUBLISHED", publishedAt: "2026-10-22T12:00:00.000Z", items: [{ id: "qa-published-item", label: "بازرسی محیط کار", required: false }] },
];
async function contextPage({ width = 1440, locale = "fa", theme = "white", pathname = "/checklists" } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "fa" ? "fa-IR" : "en-US", timezoneId: "Asia/Tehran", serviceWorkers: "block", deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(({ value, locale, theme }) => {
    localStorage.setItem("nivasafe-session", JSON.stringify(value));
    localStorage.setItem("nivasafe-org", value.organizations[0].id);
    localStorage.setItem("nivasafe-locale", locale);
    localStorage.setItem("nivasafe-theme", theme);
  }, { value: session, locale, theme });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.includes("/api/v1")) {
      const api = url.pathname.split("/api/v1")[1];
      if (request.method() !== "GET") { mutations.push({ method: request.method(), path: api }); await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_MUTATION_REJECTED", message: "Synthetic browser validation is read-only" } }) }); return; }
      const data = api === "/checklists/templates" ? templates : api === "/checklists/inspections" ? []
        : api === "/reports/registered" ? reports : api === "/files" ? files
        : api === "/organizations/current" ? session.organizations[0]
        : api === "/notifications/summary" ? { items: [], unreadCount: 0, total: 0 }
        : api === "/me/ai-quota" ? { tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-22T12:00:00.000Z" }
        : [];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) }); return;
    }
    if (url.hostname === "fonts.googleapis.com") { await route.fulfill({ status: 200, contentType: "text/css", body: stylesheet }); return; }
    if (url.origin === origin) { await route.continue(); return; }
    blockedExternalRequests.push({ origin: url.origin, pathname: url.pathname }); await route.abort("blockedbyclient");
  });
  await page.goto(origin + pathname, { waitUntil: "networkidle" });
  if (pathname === "/checklists") {
    await expect(page.locator(addSelector)).toBeVisible();
    await expect(page.locator(".checklist-item-draft")).toHaveCount(1);
    await expect(page.locator(".workflow-record-card")).toHaveCount(2);
  } else {
    await expect(page.locator(".registered-report-card")).toHaveCount(14);
    await expect(page.locator(".file-card")).toHaveCount(2);
  }
  await page.evaluate(() => document.fonts.ready);
  return { page, context };
}
async function settled(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const finite = document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime));
    await Promise.all(finite.map(animation => animation.finished.catch(() => undefined)));
  });
}
async function supplement(page) { await page.addStyleTag({ url: origin + "/qa/report-cards.css" }); await page.evaluate(() => document.fonts.ready); await settled(page); }
async function controls(page, selector) {
  return page.locator(selector).evaluateAll(elements => elements.filter(e => !e.matches(".checklist-item-editor > button.secondary")).map(e => {
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return { tag: e.tagName, class: e.className, text: e.textContent, type: e.getAttribute("type"), width: r.width, height: r.height, display: s.display, columns: s.gridTemplateColumns, gap: s.gap, padding: s.padding, border: s.border, radius: s.borderRadius, font: s.font, color: s.color, background: s.backgroundColor };
  }));
}
async function buttonStyle(button) {
  return button.evaluate(e => {
    const s = getComputedStyle(e), parent = getComputedStyle(e.parentElement), r = e.getBoundingClientRect(), icon = e.querySelector("svg");
    return { width: r.width, height: r.height, appearance: s.appearance, display: s.display, font: s.font, family: s.fontFamily, parentFamily: parent.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, radius: s.borderRadius, border: s.border, borderWidth: s.borderWidth, background: s.backgroundColor, color: s.color, outline: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, focusVisible: e.matches(":focus-visible"), iconWidth: icon?.getBoundingClientRect().width, iconHeight: icon?.getBoundingClientRect().height, type: e.type, overflow: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 };
  });
}
let fatal;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  for (const options of [
    { width: 1440, locale: "fa", theme: "white" },
    { width: 390, locale: "fa", theme: "white" },
    { width: 1440, locale: "en", theme: "blue" },
    { width: 390, locale: "en", theme: "blue" },
  ]) await check("checklist-add-" + options.width + "-" + options.locale + "-" + options.theme, async () => {
    const { page, context } = await contextPage(options);
    try {
      const button = page.locator(addSelector), rows = page.locator(".checklist-item-draft");
      const before = await buttonStyle(button);
      const otherBefore = await controls(page, ".checklists-page :is(button,input)");
      await supplement(page);
      const after = await buttonStyle(button);
      assert.deepEqual(await controls(page, ".checklists-page :is(button,input)"), otherBefore, "Another button or input changed style");
      assert.equal(after.appearance, "none");
      // CSS Grid blockifies an inline-flex child to computed display:flex.
      assert(["inline-flex", "flex"].includes(after.display), "Add item must use flex alignment");
      assert(after.height >= 44 && after.width >= 140, "Add item target must be at least 44px high and 140px wide");
      assert.equal(after.family, after.parentFamily, "Add item must inherit the application font family");
      assert(parseFloat(after.radius) >= 6 && parseFloat(after.borderWidth) === 1, `Add item border or radius is incorrect: ${JSON.stringify(after)}`);
      assert.equal(after.iconWidth, 18); assert.equal(after.iconHeight, 18);
      assert.equal(after.type, "button"); assert(!after.overflow, "Add item label or icon overflows");
      assert.notEqual(after.background, before.background, "Default appearance was not replaced");
      await button.hover(); await settled(page); const hover = await buttonStyle(button);
      assert.notEqual(hover.background, after.background, "Hover feedback is missing");
      assert.notEqual(hover.border, after.border, "Hover border feedback is missing");
      await page.mouse.move(0, 0);
      await button.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
      await expect(button).toBeFocused(); await settled(page); const focus = await buttonStyle(button);
      assert(focus.focusVisible && focus.outline !== "none" && parseFloat(focus.outlineWidth) >= 2, "Keyboard focus must be visible");
      const form = page.locator(".checklists-page form.workflow-form");
      await form.locator(":scope > label input").nth(0).fill("قالب آزمایشی برای حفظ داده‌ها");
      await form.locator(":scope > label input").nth(1).fill("توضیح قالب Synthetic fixture");
      await rows.nth(0).locator('input:not([type="checkbox"])').fill("First preserved inspection item");
      await rows.nth(0).locator('input[type="checkbox"]').uncheck();
      await form.evaluate(e => { window.__checklistQaSubmitCount = 0; e.addEventListener("submit", () => { window.__checklistQaSubmitCount += 1; }); });
      await expect(rows.nth(0).locator("button.icon-button")).toBeDisabled();
      await button.click(); await expect(rows).toHaveCount(2);
      await expect(rows.nth(0).locator('input:not([type="checkbox"])')).toHaveValue("First preserved inspection item");
      await expect(rows.nth(0).locator('input[type="checkbox"]')).not.toBeChecked();
      await expect(rows.nth(1).locator('input[type="checkbox"]')).toBeChecked();
      await rows.nth(1).locator('input:not([type="checkbox"])').fill("Second preserved inspection item");
      await button.focus(); await page.keyboard.press("Enter"); await expect(rows).toHaveCount(3);
      await rows.nth(2).locator('input:not([type="checkbox"])').fill("Third preserved inspection item");
      await expect(rows.nth(1).locator('input:not([type="checkbox"])')).toHaveValue("Second preserved inspection item");
      await expect(form.locator(":scope > label input").nth(0)).toHaveValue("قالب آزمایشی برای حفظ داده‌ها");
      await expect(form.locator(":scope > label input").nth(1)).toHaveValue("توضیح قالب Synthetic fixture");
      await rows.nth(1).locator("button.icon-button").click(); await expect(rows).toHaveCount(2);
      await expect(rows.nth(1).locator('input:not([type="checkbox"])')).toHaveValue("Third preserved inspection item");
      await rows.nth(1).locator("button.icon-button").click(); await expect(rows).toHaveCount(1);
      await expect(rows.nth(0).locator("button.icon-button")).toBeDisabled();
      await expect(rows.nth(0).locator('input:not([type="checkbox"])')).toHaveValue("First preserved inspection item");
      await expect(rows.nth(0).locator('input[type="checkbox"]')).not.toBeChecked();
      const submitCount = await page.evaluate(() => window.__checklistQaSubmitCount);
      assert.equal(submitCount, 0, "Adding an item submitted the form");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert(!overflow, "Checklist editor overflows horizontally");
      assert.equal(await page.locator(".app").getAttribute("dir"), options.locale === "fa" ? "rtl" : "ltr");
      assert.equal(await page.locator(".app").getAttribute("data-theme"), options.theme);
      const screenshot = evidence + "/checklist-add-" + options.width + "-" + options.locale + "-" + options.theme + ".png";
      await page.locator(".checklist-item-editor").screenshot({ path: screenshot });
      return { options, before, after, hover, focus, submitCount, addClicksAndEnter: 2, rowsAfterAdding: 3, rowsAfterRemoving: 1, originalInputValuesAndRequiredTogglePreserved: true, otherControlStylesUnchanged: true, screenshot, screenshotSha256: sha(screenshot) };
    } finally { await context.close(); }
  });
  for (const options of [{ width: 1440, locale: "fa", theme: "white", pathname: "/files" }, { width: 390, locale: "en", theme: "blue", pathname: "/files" }]) await check("files-and-report-presentation-preserved-" + options.width, async () => {
    const { page, context } = await contextPage(options);
    try {
      const selector = ".files-page :is(.upload-form,.files-upload-picker,.files-upload-picker-actions,.file-grid,.file-card,.registered-report-list,.registered-report-card,.registered-report-icon,.registered-report-copy,.registered-report-copy>*,.registered-report-open,button,input)";
      const before = await controls(page, selector);
      await supplement(page);
      const after = await controls(page, selector);
      assert.deepEqual(after, before, "Uploader, file library, or final report cards changed");
      assert.equal(await page.locator(".registered-report-card").count(), 14);
      assert.equal(await page.locator(".file-card").count(), 2);
      return { options, fingerprintElements: before.length, fingerprintsEqual: true, reportCount: 14, fileCount: 2 };
    } finally { await context.close(); }
  });
  assert.deepEqual(pageErrors, [], "Browser runtime errors occurred");
  assert.deepEqual(mutations, [], "Read-only UI validation attempted an API mutation");
  assert.deepEqual(blockedExternalRequests, [], "An unexpected external dependency was requested");
  assert.equal(sha(live + "/index.html"), liveIndexSha256);
  assert.equal(sha(manifestFile), manifestSha256);
  assert.equal(sha(cssFile), manifest.cssSupplementSha256);
  for (const [relative, digest] of accessed) assert.equal(sha(live + "/" + relative), digest);
} catch (error) { fatal = error.message; }
finally {
  if (browser) { await browser.close(); browserClosed = true; }
  await new Promise(resolve => server.close(resolve)); serverClosed = true;
}
const status = !fatal && checks.length === 6 && checks.every(c => c.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: "Current deployed index/assets, with only candidate checklist add-button CSS applied at runtime", fixtureReports: reports.length, fixtureFiles: files.length, noApplicationSourceOrBuildChanged: true });
console.log(JSON.stringify({ status, task, total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, fatal }));
if (status !== "PASS") process.exitCode = 1;
