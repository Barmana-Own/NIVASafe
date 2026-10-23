import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { root, task, work, evidence, live, sha, read } from "./prepare.mjs";

// Exercise the already deployed bundle with only the proposed presentation
// supplement added. All account data and API responses are synthetic.
const require = createRequire(`${root}/frontend/package.json`);
const { chromium, expect } = require("@playwright/test");
const helper = fileURLToPath(import.meta.url);
const manifestFile = `${evidence}/candidate.json`;
assert(fs.existsSync(manifestFile), "Freeze the candidate before browser validation");
const manifestSha256 = sha(manifestFile);
const manifest = read(manifestFile);
const cssFile = manifest.cssSupplement ?? `${work}/report-cards.css`;
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
async function contextPage({ width = 1440, locale = "fa", theme = "white" } = {}) {
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
      if (/^\/(fmea|rula)\/qa-report-\d+\/report$/u.test(api)) { await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: "NOT_FOUND", message: "Synthetic route navigation verified" } }) }); return; }
      const data = api === "/reports/registered" ? reports : api === "/files" ? files
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
  await page.goto(`${origin}/files`, { waitUntil: "networkidle" });
  await expect(page.locator(".registered-report-card")).toHaveCount(14);
  await expect(page.locator(".file-card")).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready);
  return { page, context };
}
async function unrelated(page) {
  return page.evaluate(() => [...document.querySelectorAll(".files-page :is(.upload-form,.files-upload-picker,.files-upload-picker-actions,.file-grid,.file-card,.file-icon,.file-copy,.file-actions)")].map(element => {
    const s = getComputedStyle(element), r = element.getBoundingClientRect();
    return { class: element.className, text: element.textContent, width: r.width, height: r.height, display: s.display, columns: s.gridTemplateColumns, rows: s.gridTemplateRows, gap: s.gap, padding: s.padding, margin: s.margin, font: s.font, color: s.color, background: s.backgroundColor, border: s.border, radius: s.borderRadius };
  }));
}
async function layout(page) {
  return page.locator(".registered-report-list").evaluate(list => {
    const cards = [...list.querySelectorAll(".registered-report-card")];
    const rows = new Map();
    for (const c of cards) { const y = Math.round(c.getBoundingClientRect().top); rows.set(y, (rows.get(y) ?? 0) + 1); }
    const textNodes = [...list.querySelectorAll(".registered-report-copy > *, .registered-report-open")];
    return { listWidth: list.getBoundingClientRect().width, columns: getComputedStyle(list).gridTemplateColumns, rowCounts: [...rows.values()], count: cards.length,
      pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      cardRects: cards.map(c => { const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }),
      textOverflow: textNodes.filter(e => e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2 || getComputedStyle(e).visibility !== "visible" || getComputedStyle(e).display === "none").map(e => ({ class: e.className, text: e.textContent, width: e.clientWidth, scrollWidth: e.scrollWidth, height: e.clientHeight, scrollHeight: e.scrollHeight })),
      titleStyles: cards.map(c => { const s = getComputedStyle(c.querySelector("strong")); return { whiteSpace: s.whiteSpace, overflow: s.overflow, lineClamp: s.webkitLineClamp }; }),
      texts: cards.map(c => c.textContent),
    };
  });
}
async function supplement(page) { await page.addStyleTag({ url: `${origin}/qa/report-cards.css` }); await page.evaluate(() => document.fonts.ready); }
let fatal;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  for (const options of [
    { width: 1920, locale: "fa", theme: "white", expected: 5 },
    { width: 1440, locale: "fa", theme: "white", expected: 4 },
    { width: 1280, locale: "fa", theme: "white", expected: 4 },
    { width: 1024, locale: "fa", theme: "white", expected: null },
    { width: 390, locale: "fa", theme: "white", expected: 1 },
    { width: 1440, locale: "en", theme: "blue", expected: 4 },
    { width: 390, locale: "en", theme: "blue", expected: 1 },
  ]) await check(`report-grid-${options.width}-${options.locale}-${options.theme}`, async () => {
    const { page, context } = await contextPage(options);
    try {
      const before = await layout(page), protectedBefore = await unrelated(page);
      assert(before.rowCounts.every(n => n === 1), "QA baseline must be the actual deployed row presentation");
      await supplement(page);
      const after = await layout(page), protectedAfter = await unrelated(page);
      assert.equal(after.count, 14);
      assert.deepEqual(after.texts, before.texts, "Existing report metadata and labels changed");
      assert.deepEqual(protectedAfter, protectedBefore, "Unrelated uploader/file library layout changed");
      assert(!after.pageOverflow, "Page overflows horizontally");
      assert.deepEqual(after.textOverflow, [], "Report content clips or becomes hidden");
      assert(after.rowCounts.every(n => n >= 1 && n <= 5), "Card grid exceeds five columns");
      if (options.expected) assert.equal(after.rowCounts[0], options.expected, "Unexpected first-row card count");
      else assert(after.rowCounts[0] >= 2 && after.rowCounts[0] <= 4, "Tablet should use available width");
      assert(after.titleStyles.every(s => s.whiteSpace !== "nowrap" && s.lineClamp === "none"), "Titles must remain fully readable");
      assert.equal(await page.locator(".app").getAttribute("dir"), options.locale === "fa" ? "rtl" : "ltr");
      assert.equal(await page.locator(".app").getAttribute("data-theme"), options.theme);
      const screenshot = `${evidence}/report-cards-${options.width}-${options.locale}-${options.theme}.png`;
      await page.locator(".registered-report-list").screenshot({ path: screenshot });
      return { viewport: options, beforeRows: before.rowCounts, after, unrelatedPresentationUnchanged: true, screenshot, screenshotSha256: sha(screenshot) };
    } finally { await context.close(); }
  });
  await check("keyboard-focus-and-both-report-routes", async () => {
    const { page, context } = await contextPage({ width: 1440, locale: "en", theme: "white" });
    try {
      await supplement(page);
      const first = page.locator(".registered-report-card").first();
      await first.focus(); await page.keyboard.press("Tab");
      await expect(page.locator(".registered-report-card").nth(1)).toBeFocused();
      const focused = await page.locator(".registered-report-card").nth(1).evaluate(e => { const s = getComputedStyle(e); return { visible: e.matches(":focus-visible"), style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor }; });
      assert(focused.visible && focused.style !== "none" && parseFloat(focused.width) >= 2, "Visible keyboard focus is missing");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(`${origin}/fmea/qa-report-2/report`);
      await page.goto(`${origin}/files`); await expect(page.locator(".registered-report-card")).toHaveCount(14); await supplement(page);
      await page.locator(".registered-report-card").first().click();
      await expect(page).toHaveURL(`${origin}/rula/qa-report-1/report`);
      return { focused, fmea: "/fmea/qa-report-2/report", rula: "/rula/qa-report-1/report", nativeWholeCardButtonPreserved: true };
    } finally { await context.close(); }
  });
  assert.deepEqual(pageErrors, [], "Browser runtime errors occurred");
  assert.deepEqual(mutations, [], "Read-only UI validation attempted an API mutation");
  assert.deepEqual(blockedExternalRequests, [], "An unexpected external dependency was requested");
  assert.equal(sha(`${live}/index.html`), liveIndexSha256);
  assert.equal(sha(manifestFile), manifestSha256);
  assert.equal(sha(cssFile), manifest.cssSupplementSha256);
  for (const [relative, digest] of accessed) assert.equal(sha(`${live}/${relative}`), digest);
} catch (error) { fatal = error.message; }
finally {
  if (browser) { await browser.close(); browserClosed = true; }
  await new Promise(resolve => server.close(resolve)); serverClosed = true;
}
const status = !fatal && checks.length === 8 && checks.every(c => c.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: "Current deployed index/assets, with only candidate CSS applied at runtime", fixtureReports: reports.length, fixtureFiles: files.length, noApplicationSourceOrBuildChanged: true });
console.log(JSON.stringify({ status, task, total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, fatal }));
if (status !== "PASS") process.exitCode = 1;
