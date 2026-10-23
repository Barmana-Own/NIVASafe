import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { root, task, work, evidence, live, sha, read } from "./prepare.mjs";

// Exercise the already deployed bundle with only the proposed global admin directory presentation
// supplement added. All account data and API responses are synthetic.
const require = createRequire(`${root}/frontend/package.json`);
const { chromium, expect } = require("@playwright/test");
const helper = fileURLToPath(import.meta.url);
const manifestFile = `${evidence}/candidate.json`;
assert(fs.existsSync(manifestFile), "Freeze the candidate before browser validation");
const manifestSha256 = sha(manifestFile);
const manifest = read(manifestFile);
const cssFile = manifest.cssSupplement ?? `${work}/admin-cards.css`;
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
    if (url.pathname === "/qa/admin-directory-cards.css") { response.setHeader("content-type", "text/css"); response.end(css); return; }
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
  // Compare equivalent resting pointer states after UI expansion has settled.
  await page.mouse.move(0, 0);
  await settled(page);
  return page.locator(selector).evaluateAll(elements => elements.map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { tag: e.tagName, class: e.className, text: e.textContent, type: e.getAttribute("type"), width: r.width, height: r.height, display: s.display, columns: s.gridTemplateColumns, gap: s.gap, padding: s.padding, border: s.border, radius: s.borderRadius, font: s.font, color: s.color, background: s.backgroundColor }; }));
}

const adminUsers = makeMembers(9).map((member, index) => ({ ...member.user, id: member.user.id, active: member.active, lastLoginAt: "2026-10-22T12:00:00.000Z", createdAt: "2026-10-20T12:00:00.000Z", memberships: [{ id: member.id, role: member.role, active: member.active, organization: { ...session.organizations[0], active: true } }] }));
const overview = { users: { total: 2, active: 1, inactive: 1, superAdmins: 1 }, organizations: { total: 1, active: 1, inactive: 0 }, activeMemberships: 1, pendingInvitations: 1, pendingMemberRequests: 1, recentUsers: [adminUsers[0]] };
const aiUsage = { users: adminUsers.map(user => ({ userId: user.id, displayName: user.displayName, username: user.username, email: user.email, active: user.active, requestCount: 2, inputTokens: 100, outputTokens: 50, totalTokens: 150, aiEnabled: true, aiTokenLimit: 1000000, aiTokensUsed: 150 })), totals: { requestCount: 4, inputTokens: 200, outputTokens: 100, totalTokens: 300 } };
const adminRequests = makeRequests(9).map(request => ({ ...request, organization: { ...session.organizations[0], active: true }, requestedBy: { id: session.user.id, displayName: session.user.displayName, username: session.user.username, email: session.user.email } }));

adminUsers[0].protectedSystemAdmin = true;
adminUsers[0].memberships[0].organization.nameFa = "سازمان آزمایشی با نام کامل طولانی برای حفظ نام سازمان در کارت مدیریت کاربران";
adminUsers[0].memberships[0].organization.nameEn = "Synthetic organization with a longer full legal name for preserving all card metadata";
adminUsers[0].memberships.push({ ...adminUsers[0].memberships[0], id: "qa-second-membership", organization: { ...adminUsers[0].memberships[0].organization, id: "qa-second-organization", nameFa: "سازمان دوم آزمایشی", nameEn: "Second synthetic organization" } });
adminRequests[0].organization = structuredClone(adminUsers[0].memberships[0].organization);
adminRequests[0].requestedBy.displayName = "درخواست‌کننده با نام کامل طولانی — Synthetic request author full name";
adminRequests[1].email = null;
async function contextPage(options = {}) {
  const { width = 1440, locale = "fa", theme = "white", pathname = "/admin", baseline = false, role = "super", count = 9 } = options;
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
      if (request.method() !== "GET") { mutations.push({ method: request.method(), path: api }); await fail(); return; }
      state.reads.push({ path: api, query: Object.fromEntries(url.searchParams) });
      const dataByPath = {
        "/admin/overview": overview, "/admin/users": adminUsers.slice(0, count), "/admin/member-requests": adminRequests.slice(0, count), "/admin/ai-usage": aiUsage,
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
  if (pathname === "/admin") { await expect(page.locator(".admin-panel-page")).toBeVisible(); await expect(page.locator(role === "super" ? "#global-admin-panel-users .admin-user-card" : "#organization-admin-panel-members .organization-member-card")).toHaveCount(role === "super" ? count : 9); }
  else if (pathname === "/members") await expect(page.locator(".organization-member-card")).toHaveCount(9);
  else if (pathname === "/files") await expect(page.locator(".registered-report-card")).toHaveCount(14);
  else if (pathname === "/checklists") await expect(page.locator(".checklist-item-draft")).toHaveCount(1);
  else await expect(page.locator(role === "super" ? ".support-inbox-card" : ".support-request-card")).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready); await settled(page); return { page, context, state };
}

async function supplement(page) { await page.addStyleTag({ url: origin + "/qa/admin-directory-cards.css" }); await page.evaluate(() => document.fonts.ready); await settled(page); }
async function listLayout(list, cardSelector) {
  return list.evaluate((root, selector) => {
    const cards = [...root.querySelectorAll(selector)], rows = new Map(); for (const card of cards) { const y = Math.round(card.getBoundingClientRect().top); rows.set(y, (rows.get(y) ?? 0) + 1); }
    const text = cards.flatMap(card => [...card.querySelectorAll(".admin-user-card-identity > *,.admin-user-card-badges > *, .admin-user-card-meta > span,.admin-membership-chip,.admin-request-copy strong,.admin-request-identifiers > *, .admin-request-job-title,.admin-request-badges > *, .admin-request-meta-item > *")]);
    return { width: root.getBoundingClientRect().width, columns: getComputedStyle(root).gridTemplateColumns, rows: [...rows.values()], cardWidths: cards.map(card => card.getBoundingClientRect().width), count: cards.length, texts: cards.map(card => card.textContent), pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      textOverflow: text.filter(e => e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2).map(e => ({ class: e.className, text: e.textContent, width: e.clientWidth, scrollWidth: e.scrollWidth, height: e.clientHeight, scrollHeight: e.scrollHeight })),
      hiddenText: text.filter(e => { const s = getComputedStyle(e); return s.display === "none" || s.visibility !== "visible" || s.webkitLineClamp !== "none"; }).map(e => e.textContent),
      actions: cards.map(card => [...card.querySelectorAll("button")].map(button => ({ text: button.textContent, height: button.getBoundingClientRect().height, type: button.type, disabled: button.disabled }))),
    };
  }, cardSelector);
}
let fatal;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  for (const options of [
    { width: 1440, locale: "fa", theme: "white" }, { width: 1280, locale: "fa", theme: "white" }, { width: 1024, locale: "fa", theme: "white" }, { width: 768, locale: "fa", theme: "white" }, { width: 390, locale: "fa", theme: "white" }, { width: 320, locale: "fa", theme: "white" }, { width: 1440, locale: "en", theme: "blue" }, { width: 390, locale: "en", theme: "blue" },
    { width: 1440, locale: "fa", theme: "white", count: 2 }, { width: 1440, locale: "en", theme: "blue", count: 1 },
  ]) await check("admin-cards-" + options.width + "-" + options.locale + "-" + (options.count ?? 9), async () => {
    const { page, context, state } = await contextPage(options);
    try {
      const users = page.locator("#global-admin-panel-users .admin-user-list"), requests = page.locator("#global-admin-panel-requests .admin-request-list");
      const beforeUsers = await users.textContent(), beforeRequests = await requests.textContent(); await supplement(page); assert.equal(await users.textContent(), beforeUsers); assert.equal(await requests.textContent(), beforeRequests);
      await expect(page.locator('.admin-panel-page [role="tab"]')).toHaveCount(4); await expect(page.locator("#global-admin-tab-support,#global-admin-panel-support")).toHaveCount(0);
      const user = await listLayout(users, ".admin-user-card"); await page.locator("#global-admin-tab-requests").click(); const request = await listLayout(requests, ".admin-request-card");
      for (const layout of [user, request]) {
        assert(!layout.pageOverflow, "Admin directory overflows horizontally"); assert.deepEqual(layout.textOverflow, [], "Full admin card metadata clips or overflows"); assert.deepEqual(layout.hiddenText, []);
        const tracks = layout.columns.trim().split(/\s+/u).length; assert(tracks >= 1 && tracks <= 3, "Directory exceeds the three-column cap"); if (options.width >= 1280) { assert.equal(tracks, 3); if (!options.count) assert.deepEqual(layout.rows, [3, 3, 3]); } if (options.width <= 390) assert.equal(tracks, 1);
      }
      assert(user.texts[0].includes(adminUsers[0].email) && user.texts[0].includes("@" + adminUsers[0].username) && user.texts[0].includes(adminUsers[0].jobTitle));
      const organizationName = options.locale === "fa" ? adminUsers[0].memberships[0].organization.nameFa : adminUsers[0].memberships[0].organization.nameEn; assert(user.texts[0].includes(organizationName)); assert(request.texts[0].includes(organizationName) && request.texts[0].includes(adminRequests[0].requestedBy.displayName));
      await expect(requests.locator("time").first()).toHaveAttribute("datetime", adminRequests[0].createdAt);
      const requestScreenshot = evidence + "/admin-requests-" + options.width + "-" + options.locale + "-" + (options.count ?? 9) + ".png"; await requests.screenshot({ path: requestScreenshot });
      await page.locator("#global-admin-tab-users").click(); const screenshot = evidence + "/admin-users-" + options.width + "-" + options.locale + "-" + (options.count ?? 9) + ".png"; await users.screenshot({ path: screenshot });
      assert.equal(state.reads.filter(read => read.path.startsWith("/admin/support-requests") || read.path === "/admin/support-staff").length, 0);
      return { options, user, request, allMetadataAndBadgesAndActionsPreserved: true, noDuplicateSupportInbox: true, screenshot, screenshotSha256: sha(screenshot), requestScreenshot, requestScreenshotSha256: sha(requestScreenshot) };
    } finally { await context.close(); }
  });
  for (const options of [{ width: 1440, locale: "en", theme: "blue" }, { width: 390, locale: "fa", theme: "white" }]) await check("admin-card-editor-and-request-controls-" + options.width, async () => {
    const { page, context } = await contextPage(options);
    try {
      const preservedPanels = {};
      for (const id of ["ai", "overview"]) { await page.locator("#global-admin-tab-" + id).click(); await settled(page); preservedPanels[id] = await fingerprint(page, "#global-admin-panel-" + id + ",#global-admin-panel-" + id + " *"); }
      await page.locator("#global-admin-tab-users").click();
      const edit = page.locator("#global-admin-panel-users .admin-user-card").nth(1).getByRole("button"), modal = page.locator(".admin-user-editor[role=dialog]");
      await edit.click(); await expect(modal).toBeVisible(); await expect(modal.locator(".admin-user-editor-heading > button")).toBeFocused(); await page.mouse.move(0, 0); await modal.locator(".admin-user-editor-heading > button").focus(); await settled(page); const beforeModal = await fingerprint(page, ".admin-user-editor,.admin-user-editor *"); await page.keyboard.press("Escape"); await expect(modal).toHaveCount(0); await expect(edit).toBeFocused();
      await supplement(page);
      for (const id of ["ai", "overview"]) { await page.locator("#global-admin-tab-" + id).click(); await settled(page); assert.deepEqual(await fingerprint(page, "#global-admin-panel-" + id + ",#global-admin-panel-" + id + " *"), preservedPanels[id], "AI or Overview panel changed"); }
      await page.locator("#global-admin-tab-users").click(); await edit.click(); await expect(modal).toBeVisible(); await expect(modal.locator(".admin-user-editor-heading > button")).toBeFocused(); await page.mouse.move(0, 0); await modal.locator(".admin-user-editor-heading > button").focus(); await settled(page); assert.deepEqual(await fingerprint(page, ".admin-user-editor,.admin-user-editor *"), beforeModal, "Global user modal changed");
      const close = modal.locator(".admin-user-editor-heading > button"); await expect(close).toBeFocused(); const last = modal.locator(".admin-password-link button"); await last.focus(); await page.keyboard.press("Tab"); await expect(close).toBeFocused(); await page.keyboard.press("Shift+Tab"); await expect(last).toBeFocused(); await page.keyboard.press("Escape"); await expect(modal).toHaveCount(0); await expect(edit).toBeFocused();
      await page.locator("#global-admin-tab-requests").click(); const first = page.locator(".admin-request-card").first(); await first.locator(".admin-request-actions > button.primary").click(); const form = first.locator("form.admin-request-approval"); await expect(form).toBeVisible(); await expect(form.locator('input[type="password"]')).toHaveCount(2);
      const approvalLayout = await form.evaluate(e => { const s = getComputedStyle(e); return { width: e.getBoundingClientRect().width, columns: s.gridTemplateColumns, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, formOverflow: e.scrollWidth > e.clientWidth + 2 }; });
      assert(!approvalLayout.pageOverflow && !approvalLayout.formOverflow, "Approval form overflows its card"); assert.equal(approvalLayout.columns.trim().split(/\s+/u).length, 1, "Approval fields should stack inside the compact card");
      const screenshot = evidence + "/admin-request-approval-" + options.width + ".png"; await first.screenshot({ path: screenshot });
      await form.locator(".admin-request-form-actions button.ghost").click(); await expect(form).toHaveCount(0);
      const withoutEmail = page.locator(".admin-request-card").nth(1); await withoutEmail.locator(".admin-request-actions > button.primary").click(); const emailForm = withoutEmail.locator("form.admin-request-approval"); await expect(emailForm).toBeVisible(); await expect(emailForm.locator('input[type="email"]')).toHaveCount(1); await expect(emailForm.locator('input[type="email"]')).toHaveAttribute("required", ""); await expect(emailForm.locator('input[type="password"]')).toHaveCount(2); await emailForm.locator(".admin-request-form-actions button.ghost").click(); await expect(emailForm).toHaveCount(0);
      const reject = first.locator(".admin-request-actions > button.danger-link"); await reject.click(); const dialog = page.locator(".app-dialog"); await expect(dialog).toBeVisible(); await dialog.locator(".dialog-actions > button.ghost").click(); await expect(dialog).toHaveCount(0); await expect(first).toBeVisible();
      return { options, modalFingerprintUnchanged: true, aiAndOverviewFingerprintsUnchanged: true, editorKeyboardFocusAndCancelPreserved: true, approvalLayout, approvalCancelPreserved: true, missingEmailApprovalInputPreserved: true, rejectConfirmationCancelled: true, noCredentialsEntered: true, screenshot, screenshotSha256: sha(screenshot) };
    } finally { await context.close(); }
  });
  for (const target of [{ pathname: "/admin", role: "organization" }, { pathname: "/members" }, { pathname: "/files" }, { pathname: "/checklists" }, { pathname: "/support" }]) for (const options of [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "en", theme: "blue" }]) await check("preserved-" + (target.pathname === "/admin" ? "organization-admin" : target.pathname.slice(1)) + "-" + options.width, async () => {
    const { page, context } = await contextPage({ ...target, ...options });
    try {
      if (target.pathname === "/support") { await page.locator(".support-thread-toggle").click(); await expect(page.locator(".support-thread-panel")).toBeVisible(); }
      const className = target.pathname === "/admin" ? ".admin-panel-page" : target.pathname === "/members" ? ".members-workspace" : target.pathname === "/files" ? ".files-page" : target.pathname === "/checklists" ? ".checklists-page" : ".support-page", selector = className + "," + className + " *";
      const before = await fingerprint(page, selector); await supplement(page); assert.deepEqual(await fingerprint(page, selector), before, "Unrelated page or organizational admin changed");
      return { target, options, comparedElements: before.length, completeFingerprintsEqual: true, standaloneSupportThreadPreserved: target.pathname === "/support" || undefined };
    } finally { await context.close(); }
  });
  assert.deepEqual(pageErrors, []); assert.deepEqual(mutations, []); assert.deepEqual(unexpectedApiRequests, []); assert.deepEqual(blockedExternalRequests, []); assert.equal(sha(live + "/index.html"), liveIndexSha256); assert.equal(sha(manifestFile), manifestSha256); assert.equal(sha(cssFile), manifest.cssSupplementSha256); for (const [relative, digest] of accessed) assert.equal(sha(live + "/" + relative), digest);
} catch (error) { fatal = error.message; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = !fatal && checks.length === 22 && checks.every(c => c.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: "Actual deployed JavaScript and eleven existing CSS links, with only candidate admin-directory CSS applied at runtime", unexpectedApiRequests, allowedSyntheticMutations: allowedMutations, noApplicationSourceOrBuildChangedByBrowserValidation: true });
console.log(JSON.stringify({ status, task, total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, fatal })); if (status !== "PASS") process.exitCode = 1;
