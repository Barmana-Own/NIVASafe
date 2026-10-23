import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { root, task, work, evidence, candidate, live, sha, read } from "./prepare.mjs";

// Exercise the candidate JavaScript graph with the existing production stylesheet links.
// Both candidate and baseline run only against synthetic account/API fixtures.
const require = createRequire(`${root}/frontend/package.json`);
const { chromium, expect } = require("@playwright/test");
const helper = fileURLToPath(import.meta.url);
const manifestFile = `${evidence}/candidate.json`;
assert(fs.existsSync(manifestFile), "Freeze the candidate before browser validation");
const manifestSha256 = sha(manifestFile);
const manifest = read(manifestFile);
const hybridFile = `${work}/test-index.html`;
assert(fs.existsSync(hybridFile), "Build the hybrid candidate browser index first");
const originalHtml = fs.readFileSync(hybridFile, "utf8");
const baselineHtml = fs.readFileSync(`${live}/index.html`, "utf8");
const liveIndexSha256 = sha(`${live}/index.html`), hybridIndexSha256 = sha(hybridFile);
const stylesheetLinks = html => html.match(/<link\s+rel="stylesheet"[^>]*>/gu) ?? [];
assert.deepEqual(stylesheetLinks(originalHtml), stylesheetLinks(baselineHtml), "Existing presentation styles must be retained");
const output = `${evidence}/e2e-validation.json`;
assert(!fs.existsSync(output), "Preserve prior browser evidence before rerunning");
fs.mkdirSync(evidence, { recursive: true });
const candidateAccessed = new Map();
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
    if (url.pathname === "/qa/font-arabic.woff2" || url.pathname === "/qa/font-latin.woff2") {
      const name = url.pathname.includes("arabic") ? "vazirmatn-arabic.woff2" : "vazirmatn-latin.woff2";
      response.setHeader("content-type", "font/woff2"); response.end(fs.readFileSync(`${fontRoot}/${name}`)); return;
    }
    const decoded = decodeURIComponent(url.pathname);
    assert(!decoded.includes("\0") && !decoded.includes("\\"));
    const target = path.resolve(staticRoot, `.${decoded}`);
    assert(target.startsWith(`${staticRoot}${path.sep}`), "Static traversal rejected");
    const builtTarget = path.resolve(candidate, "frontend/dist", `.${decoded}`);
    if (decoded.startsWith("/assets/") && decoded.endsWith(".js") && fs.existsSync(builtTarget) && fs.statSync(builtTarget).isFile()) {
      const relative = path.relative(path.resolve(candidate, "frontend/dist"), builtTarget).replaceAll("\\", "/"), digest = sha(builtTarget);
      if (fs.existsSync(target)) assert.equal(digest, sha(target), "An existing immutable asset differs");
      if (candidateAccessed.has(relative)) assert.equal(candidateAccessed.get(relative), digest); else candidateAccessed.set(relative, digest);
      response.setHeader("content-type", mimeTypes[path.extname(builtTarget)] ?? "application/octet-stream"); response.end(fs.readFileSync(builtTarget)); return;
    }
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      const relative = path.relative(staticRoot, target).replaceAll("\\", "/");
      const digest = sha(target);
      if (accessed.has(relative)) assert.equal(accessed.get(relative), digest, "Live static input changed during QA");
      else accessed.set(relative, digest);
      response.setHeader("content-type", mimeTypes[path.extname(target)] ?? "application/octet-stream");
      response.end(fs.readFileSync(target)); return;
    }
    assert(!path.extname(decoded), "Unknown static artifact");
    response.setHeader("content-type", "text/html; charset=utf-8"); response.end(url.searchParams.get("qaBaseline") === "1" ? baselineHtml : originalHtml);
  } catch { response.statusCode = 404; response.end("Not found"); }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
const stylesheet = [
  "@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;font-display:swap;src:url('/qa/font-arabic.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200F,U+FB50-FDFF,U+FE70-FEFF}",
  "@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;font-display:swap;src:url('/qa/font-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+2000-206F}",
].join("\n");
const bound = () => ({ candidateManifestSha256: manifestSha256, hybridIndexSha256, candidateStaticInputs: [...candidateAccessed].map(([relative, sha256]) => ({ path: relative, sha256 })), helperSha256: sha(helper), liveIndexSha256, liveStaticInputs: [...accessed].map(([relative, sha256]) => ({ path: relative, sha256 })), productionNetworkRequests: 0, blockedExternalRequests, productionMutations: 0, attemptedApiMutations: mutations, pageErrors });
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



const allowedMutations = [], unexpectedApiRequests = [];
const makeMembers = count => Array.from({ length: count }, (_, i) => ({
  id: "qa-organization-member-" + (i + 1), role: ["HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "VIEWER"][i % 6], active: i % 3 !== 1,
  user: { id: "qa-member-user-" + i, displayName: i === 0 ? "نام کامل بسیار طولانی عضو سازمان برای بررسی نمایش کارت — Synthetic organization member full name" : "عضو آزمایشی سازمان " + (i + 1),
    username: i === 0 ? "quality_assurance_member_with_a_long_username" : "member_" + (i + 1), email: i === 0 ? "quality.assurance.specialist@long-department.organization.nivasafe.test" : "member" + (i + 1) + "@nivasafe.test", phone: "09123456789",
    jobTitle: i === 0 ? "کارشناس ارشد ایمنی و کنترل کیفیت تجهیزات صنعتی — Senior safety and quality assurance specialist" : "کارشناس ایمنی آزمایشی", globalRole: i === 0 ? "SUPER_ADMIN" : "USER" },
}));
const makeRequests = count => Array.from({ length: count }, (_, i) => ({
  id: "qa-member-request-" + (i + 1), username: i === 0 ? "pending_member_with_a_long_username" : "pending_member_" + (i + 1), email: i === 0 ? "pending.quality.assurance@organization.long-department.nivasafe.test" : "pending" + (i + 1) + "@nivasafe.test", displayName: i === 0 ? "درخواست عضویت با نام کامل طولانی — Synthetic pending member with a longer full name" : "درخواست عضویت آزمایشی " + (i + 1),
  phone: "09123456789", jobTitle: "کارشناس ایمنی", role: ["HSE_MANAGER", "HSE_SPECIALIST", "EXTERNAL_AUDITOR"][i % 3], status: "PENDING", rejectionReason: null, createdAt: "2026-10-22T12:00:00.000Z", reviewedAt: null,
}));
const supportTicketId = "e23c9d51-07fd-4f12-908d-001122334455";
const supportTickets = [{ id: supportTicketId, category: "TECHNICAL_SUPPORT", subject: "درخواست مصنوعی پشتیبانی", message: "محتوای مصنوعی درخواست پشتیبانی برای بررسی حفظ طراحی. Synthetic support content.", status: "OPEN", priority: "NORMAL", createdAt: "2026-10-22T12:00:00.000Z", updatedAt: "2026-10-22T12:00:00.000Z", requester: { id: "qa-support-user", displayName: "کاربر آزمایشی", email: "qa@nivasafe.test" }, organization: { id: "qa-support-org", nameFa: "سازمان آزمایشی", nameEn: "Synthetic organization" } }];
const checklistTemplates = [{ id: "qa-checklist-draft", familyId: "qa-checklist-family", version: 1, title: "قالب بازرسی آزمایشی", status: "DRAFT", items: [{ id: "qa-checklist-item", label: "بازرسی تجهیزات", required: true }] }];
async function settled(page) {
  await page.evaluate(async () => { await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); const finite = document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime)); await Promise.all(finite.map(animation => animation.finished.catch(() => undefined))); });
}
async function fingerprint(page, selector) {
  return page.locator(selector).evaluateAll(elements => elements.map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { tag: e.tagName, class: e.className, text: e.textContent, type: e.getAttribute("type"), width: r.width, height: r.height, display: s.display, columns: s.gridTemplateColumns, gap: s.gap, padding: s.padding, border: s.border, radius: s.borderRadius, font: s.font, color: s.color, background: s.backgroundColor }; }));
}

const adminUsers = makeMembers(2).map((member, index) => ({ ...member.user, id: member.user.id, active: member.active, lastLoginAt: "2026-10-22T12:00:00.000Z", createdAt: "2026-10-20T12:00:00.000Z", memberships: [{ id: member.id, role: member.role, active: member.active, organization: { ...session.organizations[0], active: true } }] }));
const overview = { users: { total: 2, active: 1, inactive: 1, superAdmins: 1 }, organizations: { total: 1, active: 1, inactive: 0 }, activeMemberships: 1, pendingInvitations: 1, pendingMemberRequests: 1, recentUsers: [adminUsers[0]] };
const aiUsage = { users: adminUsers.map(user => ({ userId: user.id, displayName: user.displayName, username: user.username, email: user.email, active: user.active, requestCount: 2, inputTokens: 100, outputTokens: 50, totalTokens: 150, aiEnabled: true, aiTokenLimit: 1000000, aiTokensUsed: 150 })), totals: { requestCount: 4, inputTokens: 200, outputTokens: 100, totalTokens: 300 } };
const adminRequests = makeRequests(1).map(request => ({ ...request, organization: { ...session.organizations[0], active: true }, requestedBy: { id: session.user.id, displayName: session.user.displayName, username: session.user.username, email: session.user.email } }));
async function contextPage(options = {}) {
  const { width = 1440, locale = "fa", theme = "white", pathname = "/admin", baseline = false, role = "super", workflow = false } = options;
  const state = { reads: [], replies: [{ id: "qa-public-reply", message: "Public synthetic support reply", visibility: "PUBLIC", createdAt: "2026-10-22T12:01:00.000Z", author: { id: "qa-support", displayName: "Synthetic support administrator", globalRole: "SUPER_ADMIN" } }], mutations: [] };
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "fa" ? "fa-IR" : "en-US", timezoneId: "Asia/Tehran", serviceWorkers: "block", deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage(); page.on("pageerror", error => pageErrors.push(error.message));
  const value = structuredClone(session); if (role !== "super") value.user.globalRole = "USER";
  await page.addInitScript(({ value, locale, theme }) => { localStorage.setItem("nivasafe-session", JSON.stringify(value)); localStorage.setItem("nivasafe-org", value.organizations[0].id); localStorage.setItem("nivasafe-locale", locale); localStorage.setItem("nivasafe-theme", theme); }, { value, locale, theme });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.includes("/api/v1")) {
      const api = url.pathname.split("/api/v1")[1];
      const respond = (data, status = 200, meta) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data, ...(meta ? { meta } : {}) }) });
      const fail = () => route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_UNEXPECTED_REQUEST", message: "Unanticipated synthetic request rejected" } }) });
      if (request.method() !== "GET") {
        if (workflow && request.method() === "POST" && api === "/admin/support-requests/" + supportTicketId + "/replies") {
          const body = JSON.parse(request.postData() ?? "{}"), key = request.headers()["idempotency-key"]; assert(/^[0-9a-f-]{36}$/i.test(key ?? "")); assert(body.message?.trim());
          const record = { method: request.method(), path: api, body, idempotencyKey: key }; state.mutations.push(record); allowedMutations.push(record);
          const reply = { id: "qa-created-support-reply", message: body.message, visibility: "PUBLIC", createdAt: "2026-10-22T12:02:00.000Z", author: { id: "qa-support", displayName: "Synthetic support administrator", globalRole: "SUPER_ADMIN" } }; state.replies.push(reply); await respond(reply, 201); return;
        }
        mutations.push({ method: request.method(), path: api }); await fail(); return;
      }
      state.reads.push({ path: api, query: Object.fromEntries(url.searchParams) });
      const dataByPath = {
        "/admin/overview": overview, "/admin/users": adminUsers, "/admin/member-requests": adminRequests, "/admin/ai-usage": aiUsage,
        "/members": makeMembers(9), "/member-requests": makeRequests(9), "/reports/registered": reports, "/files": files, "/organizations/current": value.organizations[0], "/notifications/summary": { items: [], unreadCount: 0, total: 0 }, "/me/ai-quota": { tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-22T12:00:00.000Z" }, "/checklists/templates": checklistTemplates, "/checklists/inspections": [], "/admin/support-staff": [],
      };
      if (api === "/admin/support-requests" || api === "/support/requests") { await respond(supportTickets, 200, { page: 1, limit: 20, total: 1 }); return; }
      if (api === "/admin/support-requests/" + supportTicketId || api === "/support/requests/" + supportTicketId) { await respond({ ...supportTickets[0], replies: state.replies }); return; }
      if (Object.hasOwn(dataByPath, api)) { await respond(dataByPath[api]); return; }
      unexpectedApiRequests.push({ method: request.method(), path: api }); await fail(); return;
    }
    if (url.hostname === "fonts.googleapis.com") { await route.fulfill({ status: 200, contentType: "text/css", body: stylesheet }); return; }
    if (url.origin === origin) { await route.continue(); return; } blockedExternalRequests.push({ origin: url.origin, pathname: url.pathname }); await route.abort("blockedbyclient");
  });
  await page.goto(origin + pathname + (baseline ? "?qaBaseline=1" : ""), { waitUntil: "networkidle" });
  if (pathname === "/admin") { await expect(page.locator(".admin-panel-page")).toBeVisible(); await expect(page.locator(role === "super" ? "#global-admin-panel-users .admin-user-card" : "#organization-admin-panel-members .organization-member-card")).toHaveCount(role === "super" ? 2 : 9); }
  else if (pathname === "/members") await expect(page.locator(".organization-member-card")).toHaveCount(9);
  else if (pathname === "/files") await expect(page.locator(".registered-report-card")).toHaveCount(14);
  else if (pathname === "/checklists") await expect(page.locator(".checklist-item-draft")).toHaveCount(1);
  else await expect(page.locator(role === "super" ? ".support-inbox-card" : ".support-request-card")).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready); await settled(page); return { page, context, state };
}
async function assertAdminPanel(page, id, prefix = "global-admin") {
  const panels = page.locator('[id^="' + prefix + '-panel-"]');
  await expect(page.locator("#" + prefix + "-panel-" + id)).toBeVisible();
  const states = await panels.evaluateAll(elements => elements.map(e => ({ id: e.id, hidden: e.hidden, display: getComputedStyle(e).display })));
  assert(states.every(item => item.id.endsWith("-" + id) ? !item.hidden && item.display !== "none" : item.hidden && item.display === "none")); return states;
}
async function supportFromSidebar(page) {
  const mobile = page.locator("button.mobile-menu"); if (await mobile.isVisible()) await mobile.click();
  const link = page.locator('.app-sidebar a[href="/support"]'); await expect(link).toBeVisible(); await link.click(); await expect(page).toHaveURL(origin + "/support");
}
let fatal;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  for (const options of [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "fa", theme: "white" }, { width: 1440, locale: "en", theme: "blue" }, { width: 390, locale: "en", theme: "blue" }]) await check("global-admin-four-tabs-" + options.width + "-" + options.locale, async () => {
    const workflow = options.width === 1440 && options.locale === "en";
    const { page, context, state } = await contextPage({ ...options, workflow });
    try {
      const tabs = page.locator('.admin-panel-page [role="tab"]'); await expect(tabs).toHaveCount(4);
      assert.deepEqual(await tabs.evaluateAll(elements => elements.map(e => e.id)), ["global-admin-tab-users", "global-admin-tab-requests", "global-admin-tab-ai", "global-admin-tab-overview"]);
      await expect(page.locator("#global-admin-tab-support,#global-admin-panel-support,.admin-panel-page .support-inbox-section")).toHaveCount(0);
      const forward = options.locale === "fa" ? "ArrowLeft" : "ArrowRight", panels = [];
      await page.locator("#global-admin-tab-users").focus();
      for (const id of ["users", "requests", "ai", "overview"]) {
        await expect(page.locator("#global-admin-tab-" + id)).toBeFocused(); panels.push(await assertAdminPanel(page, id));
        if (id === "requests") await expect(page.locator("#global-admin-panel-requests .admin-request-card")).toHaveCount(1);
        if (id === "ai") await expect(page.locator("#global-admin-panel-ai tbody tr")).toHaveCount(2);
        if (id === "overview") await expect(page.locator("#global-admin-panel-overview .admin-stat-card")).toHaveCount(4);
        await page.keyboard.press(forward);
      }
      await expect(page.locator("#global-admin-tab-users")).toBeFocused();
      const supportReadsBeforeSidebar = state.reads.filter(read => read.path.startsWith("/admin/support-requests") || read.path === "/admin/support-staff"); assert.deepEqual(supportReadsBeforeSidebar, [], "Admin page still mounts the redundant support inbox");
      const screenshot = evidence + "/global-admin-four-tabs-" + options.width + "-" + options.locale + ".png"; await page.locator(".admin-panel-page").screenshot({ path: screenshot });
      await supportFromSidebar(page); await expect(page.locator(".support-administrator-page .support-inbox-controls")).toBeVisible(); await expect(page.locator(".support-inbox-card")).toHaveCount(1); await page.locator(".support-thread-toggle").click(); await expect(page.locator(".support-thread-panel")).toBeVisible(); await expect(page.locator(".support-thread-message")).toHaveCount(2);
      if (workflow) { const form = page.locator(".support-thread-panel form:not(.support-internal-note-form)"); await form.locator("textarea").fill("Synthetic standalone support reply remains functional"); await form.locator("button.primary").click(); await expect(form.locator("textarea")).toHaveValue(""); await expect(page.locator(".support-thread-message").last()).toContainText("Synthetic standalone support reply remains functional"); assert.equal(state.mutations.length, 1); }
      return { options, panels, supportReadsBeforeSidebar, standaloneSupportViaSidebar: true, standaloneTicketFiltersAndThreadPreserved: true, allowedSyntheticMutations: state.mutations, screenshot, screenshotSha256: sha(screenshot) };
    } finally { await context.close(); }
  });
  for (const options of [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "en", theme: "blue" }]) await check("organization-admin-two-tabs-preserved-" + options.width, async () => {
    const before = await contextPage({ ...options, role: "organization", baseline: true }), after = await contextPage({ ...options, role: "organization" });
    try {
      for (const id of ["members", "ai"]) {
        await before.page.locator("#organization-admin-tab-" + id).click(); await after.page.locator("#organization-admin-tab-" + id).click(); await settled(before.page); await settled(after.page);
        await expect(after.page.locator('.admin-panel-page [role="tab"]')).toHaveCount(2); await assertAdminPanel(after.page, id, "organization-admin");
        assert.deepEqual(await fingerprint(after.page, ".admin-panel-page,.admin-panel-page *"), await fingerprint(before.page, ".admin-panel-page,.admin-panel-page *"), "Organization admin content or presentation changed");
      }
      return { options, tabs: ["members", "ai"], completePageFingerprintsEqual: true };
    } finally { await before.context.close(); await after.context.close(); }
  });
  for (const options of [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "en", theme: "blue" }]) await check("customer-support-preserved-" + options.width, async () => {
    const { page, context } = await contextPage({ ...options, pathname: "/support", role: "organization" });
    try { await expect(page.locator(".support-administrator-page")).toHaveCount(0); await expect(page.locator(".support-request-form")).toBeVisible(); await page.locator(".support-thread-toggle").click(); await expect(page.locator(".support-thread-panel")).toBeVisible(); await expect(page.locator(".support-internal-note-form")).toHaveCount(0); return { options, customerRequestFormAndThreadAccessible: true }; }
    finally { await context.close(); }
  });
  for (const pathname of ["/members", "/files", "/checklists"]) for (const options of [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "en", theme: "blue" }]) await check("preserved-" + pathname.slice(1) + "-" + options.width, async () => {
    const before = await contextPage({ ...options, pathname, baseline: true }), after = await contextPage({ ...options, pathname });
    try {
      const className = pathname === "/members" ? ".members-workspace" : pathname === "/files" ? ".files-page" : ".checklists-page", selector = className + "," + className + " *";
      assert.deepEqual(await fingerprint(after.page, selector), await fingerprint(before.page, selector), "Unrelated page changed with the new JavaScript bundle");
      return { pathname, options, comparedElements: (await fingerprint(after.page, selector)).length, productionStylesAndPresentationEqual: true };
    } finally { await before.context.close(); await after.context.close(); }
  });
  assert.deepEqual(pageErrors, []); assert.deepEqual(mutations, []); assert.deepEqual(unexpectedApiRequests, []); assert.deepEqual(blockedExternalRequests, []); assert.equal(sha(live + "/index.html"), liveIndexSha256); assert.equal(sha(manifestFile), manifestSha256); assert.equal(sha(hybridFile), hybridIndexSha256); for (const [relative, digest] of accessed) assert.equal(sha(live + "/" + relative), digest); for (const [relative, digest] of candidateAccessed) assert.equal(sha(candidate + "/frontend/dist/" + relative), digest);
} catch (error) { fatal = error.message; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = !fatal && checks.length === 14 && checks.every(c => c.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: "Candidate JavaScript graph with actual production stylesheet links; baseline comparison uses deployed JavaScript", unexpectedApiRequests, allowedSyntheticMutations: allowedMutations, noApplicationSourceOrBuildChangedByBrowserValidation: true });
console.log(JSON.stringify({ status, task, total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, fatal })); if (status !== "PASS") process.exitCode = 1;
