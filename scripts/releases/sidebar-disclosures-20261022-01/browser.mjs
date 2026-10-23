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
const oldStyleLinks = stylesheetLinks(baselineHtml), newStyleLinks = stylesheetLinks(originalHtml);
const addedStyleLinks = newStyleLinks.filter(link => !oldStyleLinks.includes(link));
assert.deepEqual(newStyleLinks.filter(link => oldStyleLinks.includes(link)), oldStyleLinks, "Existing presentation styles must be retained");
assert.equal(addedStyleLinks.length, 1, "Exactly the reviewed disclosure CSS supplement must be added");
const cssFile = manifest.cssSupplement, css = fs.readFileSync(cssFile);
assert.equal(sha(cssFile), manifest.cssSupplementSha256);
const cssAsset = addedStyleLinks[0].match(/href="([^"]+)"/u)?.[1]; assert(cssAsset?.startsWith("/assets/") && cssAsset.endsWith(".css"));
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
    if (url.pathname === cssAsset) { response.setHeader("content-type", "text/css"); response.end(css); return; }
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
const bound = () => ({ candidateManifestSha256: manifestSha256, hybridIndexSha256, cssSupplementSha256: sha(cssFile), reviewedSupplementAsset: cssAsset, candidateStaticInputs: [...candidateAccessed].map(([relative, sha256]) => ({ path: relative, sha256 })), helperSha256: sha(helper), liveIndexSha256, liveStaticInputs: [...accessed].map(([relative, sha256]) => ({ path: relative, sha256 })), productionNetworkRequests: 0, blockedExternalRequests, productionMutations: 0, attemptedApiMutations: mutations, pageErrors });
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
  const { width = 1440, locale = "fa", theme = "white", pathname = "/profile", baseline = false, role = "super", count = 9, accepted = true, emptyGrants = false, collapsed = false, motion = "reduce" } = options;
  const state = { grants: emptyGrants ? [] : existingGrants(), reads: [], replies: [{ id: "qa-public-reply", message: "Public synthetic support reply", visibility: "PUBLIC", createdAt: "2026-10-22T12:01:00.000Z", author: { id: "qa-support", displayName: "Synthetic support administrator", globalRole: "SUPER_ADMIN" } }], mutations: [] };
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "fa" ? "fa-IR" : "en-US", timezoneId: "Asia/Tehran", serviceWorkers: "block", deviceScaleFactor: 1, reducedMotion: motion });
  const page = await context.newPage(); page.on("pageerror", error => pageErrors.push(error.message));
  const value = structuredClone(session); if (role !== "super") { value.user.globalRole = "USER"; value.organizations[0].role = role === "organization" ? "ORG_ADMIN" : role; }
  await page.addInitScript(({ value, locale, theme, collapsed }) => { localStorage.setItem("nivasafe-sidebar-collapsed", String(collapsed)); localStorage.setItem("nivasafe-session", JSON.stringify(value)); localStorage.setItem("nivasafe-org", value.organizations[0].id); localStorage.setItem("nivasafe-locale", locale); localStorage.setItem("nivasafe-theme", theme); }, { value, locale, theme, collapsed });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.includes("/api/v1")) {
      const api = url.pathname.split("/api/v1")[1];
      const respond = (data, status = 200, meta) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data, ...(meta ? { meta } : {}) }) });
      const fail = () => route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_UNEXPECTED_REQUEST", message: "Unanticipated synthetic request rejected" } }) });
      if (request.method() !== "GET") { mutations.push({ method: request.method(), path: api }); await fail(); return; }
      state.reads.push({ path: api, query: Object.fromEntries(url.searchParams) });
      if (api === "/profile") { await respond({ ...session.user, locale, phone: "09123456789", jobTitle: "Synthetic safety specialist" }); return; }
      if (api === "/profile/image-processing-consent") { await respond({ accepted, policyVersion, acceptedAt: accepted ? "2026-10-22T12:00:00.000Z" : null, changedAt: "2026-10-22T12:00:00.000Z" }); return; }
      if (api === "/profile/posture-image-authorizations") { assert.equal(url.searchParams.get("direction"), "issued"); await respond({ grants: state.grants }); return; }
      if (/^\/(fmea|rula)\/[^/]+\/report$/u.test(api)) { await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: "NOT_FOUND", message: "Synthetic report does not exist" } }) }); return; }
      const dataByPath = { "/projects": [], "/fmea": [], "/rula": [], "/processes": [], "/activities": [],
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
  if (pathname === "/profile") { await expect(page.locator('#image-processing-consent input[name="imageProcessingConsent"]')).toBeVisible(); await expect(page.locator(".posture-authorization-list > li")).toHaveCount(emptyGrants ? 0 : 2); }
  else if (pathname === "/admin") { await expect(page.locator(".admin-panel-page")).toBeVisible(); await expect(page.locator(role === "super" ? "#global-admin-panel-users .admin-user-card" : "#organization-admin-panel-members .organization-member-card")).toHaveCount(role === "super" ? count : 9); }
  else if (pathname === "/members") await expect(page.locator(".organization-member-card")).toHaveCount(9);
  else if (pathname === "/files") await expect(page.locator(".registered-report-card")).toHaveCount(14);
  else if (pathname === "/checklists") await expect(page.locator(".checklist-item-draft")).toHaveCount(1);
  else if (pathname.startsWith("/choose-path") || pathname.startsWith("/fmea") || pathname.startsWith("/rula")) await expect(page.locator("#main-content")).toBeVisible();
  else await expect(page.locator(role === "super" ? ".support-inbox-card" : ".support-request-card")).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready); await settled(page); return { page, context, state };
}


const policySource = fs.readFileSync(manifest.candidate + "/frontend/src/features/account/imageProcessingPolicy.ts", "utf8");
const policyVersion = policySource.match(/ACCOUNT_IMAGE_CONSENT_VERSION = "([^"]+)"/u)?.[1]; assert(policyVersion, "Frozen account policy version missing");
const existingGrants = () => [
  { id: "6f65858a-b6d1-4a42-87cb-109039205601", ownerUserId: session.user.id, ownerName: session.user.displayName, recipientUserId: "qa-recipient-one", recipientName: "Existing synthetic image recipient", expiresAt: "2050-10-22T12:00:00.000Z", policyVersion, status: "ACTIVE" },
  { id: "6f65858a-b6d1-4a42-87cb-109039205602", ownerUserId: session.user.id, ownerName: session.user.displayName, recipientUserId: "qa-recipient-two", recipientName: "Revoked synthetic image recipient", expiresAt: "2050-10-22T12:00:00.000Z", policyVersion, status: "REVOKED" },
];

const branches = ["assessments-create", "assessments-saved", "exposure-measurements"];
const leafRoutes = [
  { id: "fmea-new", parent: "assessments-create", href: "/choose-path?category=safety&mode=new" },
  { id: "rula-new", parent: "assessments-create", href: "/choose-path?category=ergonomics&mode=new" },
  { id: "fmea-saved", parent: "assessments-saved", href: "/choose-path?category=safety&mode=saved" },
  { id: "rula-saved", parent: "assessments-saved", href: "/choose-path?category=ergonomics&mode=saved" },
];
const toggle = (page, id) => page.locator("#nav-toggle-" + id), panel = (page, id) => page.locator("#nav-panel-" + id);
async function expectBranch(page, id, expanded) {
  await expect(toggle(page, id)).toHaveAttribute("aria-expanded", String(expanded)); await expect(toggle(page, id)).toHaveAttribute("aria-controls", "nav-panel-" + id);
  assert.equal(await panel(page, id).evaluate(e => e.hidden), !expanded, "Disclosure hidden state disagrees with its button");
}
async function openDrawer(page) { await page.locator("button.mobile-menu").click(); await expect(page.locator("#app-sidebar")).toHaveClass(/\bopen\b/u); await expect(page.locator("#app-sidebar")).toHaveAttribute("aria-modal", "true"); }
async function navInventory(page) { return page.locator(".side-nav .side-nav-link,.side-nav .side-nav-pending").evaluateAll(elements => elements.map(e => ({ id: e.getAttribute("data-navigation-id"), href: e.getAttribute("href"), text: e.textContent, pending: e.classList.contains("side-nav-pending"), label: e.getAttribute("aria-label") }))); }
async function screenshotSidebar(page, name) { await page.locator(".side-nav").evaluate(e => { e.scrollTop = 0; }); await settled(page); const screenshot = evidence + "/" + name + ".png"; await page.locator("#app-sidebar").screenshot({ path: screenshot }); return { screenshot, screenshotSha256: sha(screenshot) }; }
let fatal;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  for (const options of [{ width: 1440, locale: "fa", theme: "white", motion: "reduce" }, { width: 1280, locale: "en", theme: "blue", motion: "reduce" }, { width: 1024, locale: "fa", theme: "blue", motion: "no-preference" }, { width: 960, locale: "en", theme: "white", motion: "no-preference" }]) await check("desktop-disclosures-" + options.width + "-" + options.locale, async () => {
    const { page, context } = await contextPage(options);
    try {
      const initialUrl = page.url(); for (const id of branches) { await expectBranch(page, id, false); await expect(toggle(page, id)).toBeVisible(); assert((await toggle(page, id).boundingBox()).height >= 44); }
      await toggle(page, branches[0]).click(); await expectBranch(page, branches[0], true);
      await toggle(page, branches[1]).focus(); await page.keyboard.press("Enter"); await expectBranch(page, branches[1], true); await expectBranch(page, branches[0], true);
      await toggle(page, branches[2]).focus(); await page.keyboard.press("Space"); await expectBranch(page, branches[2], true); await expectBranch(page, branches[1], true);
      await toggle(page, branches[0]).click(); await expectBranch(page, branches[0], false); await expectBranch(page, branches[1], true); await expectBranch(page, branches[2], true);
      await toggle(page, branches[0]).focus(); await page.keyboard.press("Tab"); await expect(toggle(page, branches[1])).toBeFocused();
      const hiddenControls = await panel(page, branches[0]).locator("a,button,input").evaluateAll(elements => elements.filter(e => e.getClientRects().length > 0).length); assert.equal(hiddenControls, 0); assert.equal(page.url(), initialUrl, "Parent toggle navigated instead of expanding");
      await toggle(page, branches[0]).click(); await toggle(page, branches[2]).click();
      await toggle(page, branches[0]).focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab"); await expect(toggle(page, branches[0])).toBeFocused();
      const focus = await toggle(page, branches[0]).evaluate(e => { const s = getComputedStyle(e); return { visible: e.matches(":focus-visible"), width: s.outlineWidth, style: s.outlineStyle, chevronTransition: getComputedStyle(e.querySelector(".nav-disclosure-chevron")).transitionDuration }; });
      assert(focus.visible && parseFloat(focus.width) >= 2 && focus.style !== "none");
      // Existing global reduced-motion rules use a tiny nonzero !important duration.
      if (options.motion === "reduce") assert(focus.chevronTransition.split(",").every(duration => Number.isFinite(parseFloat(duration)) && parseFloat(duration) <= 0.001), "Reduced-motion duration exceeds one millisecond");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      return { options, independentPanelsAndKeyboard: true, hiddenControls, noParentNavigation: true, focus, ...await screenshotSidebar(page, "sidebar-desktop-" + options.width + "-" + options.locale) };
    } finally { await context.close(); }
  });
  for (const options of [{ width: 390, locale: "fa", theme: "white", collapsed: false }, { width: 320, locale: "en", theme: "blue", collapsed: false }, { width: 390, locale: "en", theme: "white", collapsed: true }, { width: 320, locale: "fa", theme: "blue", collapsed: true }]) await check("mobile-drawer-disclosures-" + options.width + "-" + options.locale + "-" + options.collapsed, async () => {
    const { page, context } = await contextPage(options);
    try {
      const sidebar = page.locator("#app-sidebar"), menu = page.locator("button.mobile-menu"); await expect(sidebar).not.toHaveClass(/\bopen\b/u); await openDrawer(page);
      for (const id of branches) { await expect(toggle(page, id)).toBeVisible(); await expectBranch(page, id, false); }
      const initialUrl = page.url(); await toggle(page, branches[0]).click(); await expectBranch(page, branches[0], true); await expect(sidebar).toHaveClass(/\bopen\b/u);
      await toggle(page, branches[1]).focus(); await page.keyboard.press("Space"); await expectBranch(page, branches[1], true); await expect(sidebar).toHaveClass(/\bopen\b/u); assert.equal(page.url(), initialUrl);
      const screenshot = await screenshotSidebar(page, "sidebar-mobile-" + options.width + "-" + options.locale + "-" + options.collapsed);
      await page.locator('.side-nav-link[data-navigation-id="fmea-new"]').click(); await expect(page).toHaveURL(origin + leafRoutes[0].href); await expect(sidebar).not.toHaveClass(/\bopen\b/u); await expect(menu).toBeFocused();
      await openDrawer(page); await expectBranch(page, branches[0], true); await page.keyboard.press("Escape"); await expect(sidebar).not.toHaveClass(/\bopen\b/u); await expect(menu).toBeFocused();
      assert.equal(await page.evaluate(() => localStorage.getItem("nivasafe-sidebar-collapsed")), String(options.collapsed));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      return { options, storedDesktopPreferencePreserved: true, parentKeepsDrawerOpen: true, leafClosesDrawerAndRestoresFocus: true, escapeClosesAndRestoresFocus: true, ...screenshot };
    } finally { await context.close(); }
  });
  await check("assessment-leaf-routes-query-history-and-manual-close", async () => {
    const { page, context } = await contextPage({ width: 1440, locale: "en", theme: "white" });
    try {
      for (const leaf of leafRoutes) { if (await toggle(page, leaf.parent).getAttribute("aria-expanded") === "false") await toggle(page, leaf.parent).click(); await page.locator('.side-nav-link[data-navigation-id="' + leaf.id + '"]').click(); await expect(page).toHaveURL(origin + leaf.href); await expect(page.locator('.side-nav-link[data-navigation-id="' + leaf.id + '"]')).toHaveAttribute("aria-current", "page"); await expectBranch(page, leaf.parent, true); }
      await toggle(page, "assessments-saved").click(); await expectBranch(page, "assessments-saved", false); await settled(page); await expectBranch(page, "assessments-saved", false);
      await page.goBack(); await expect(page).toHaveURL(origin + leafRoutes[2].href); await expectBranch(page, "assessments-saved", true); await expect(page.locator('.side-nav-link[data-navigation-id="fmea-saved"]')).toHaveAttribute("aria-current", "page");
      await page.goBack(); await expect(page).toHaveURL(origin + leafRoutes[1].href); await expectBranch(page, "assessments-create", true);
      await page.goForward(); await expect(page).toHaveURL(origin + leafRoutes[2].href); await expectBranch(page, "assessments-saved", true);
      return { leafRoutes, activeBranchOpensOnQueryAndHistory: true, activeBranchMayBeClosedUntilNavigation: true };
    } finally { await context.close(); }
  });
  await check("direct-fmea-rula-and-report-navigation-classification", async () => {
    const { page, context } = await contextPage({ width: 1440, locale: "fa", theme: "white" });
    try {
      const cases = [
        ["/choose-path?category=safety&mode=new", "fmea-new", "assessments-create"], ["/choose-path?category=ergonomics&mode=saved", "rula-saved", "assessments-saved"],
        ["/fmea", "fmea-new", "assessments-create"], ["/fmea?view=registered", "fmea-saved", "assessments-saved"], ["/rula", "rula-new", "assessments-create"], ["/rula?view=results", "rula-saved", "assessments-saved"],
        ["/rula?edit=9bb7f310-4dec-4aa4-9f80-010203040506&step=2", "rula-saved", "assessments-saved"], ["/fmea/9bb7f310-4dec-4aa4-9f80-010203040506/report", "fmea-saved", "assessments-saved"],
      ];
      for (const [href, leaf, parent] of cases) { await page.goto(origin + href, { waitUntil: "networkidle" }); await expectBranch(page, parent, true); await expect(page.locator('.side-nav-link[data-navigation-id="' + leaf + '"]')).toHaveAttribute("aria-current", "page"); }
      return { cases, navigationStatePreservedDuringExpectedSyntheticReport404: true };
    } finally { await context.close(); }
  });
  await check("desktop-rail-expand-and-mobile-preference-resize", async () => {
    const { page, context } = await contextPage({ width: 1440, locale: "en", theme: "blue", collapsed: true });
    try {
      const rail = page.locator("button.sidebar-toggle"); for (const id of branches) { assert.equal(await panel(page, id).evaluate(e => e.hidden), false); await expect(toggle(page, id)).toBeHidden(); }
      for (const leaf of leafRoutes) await expect(page.locator('.side-nav-link[data-navigation-id="' + leaf.id + '"]')).toBeVisible();
      await page.locator('.side-nav-link[data-navigation-id="rula-saved"]').click(); await expect(page).toHaveURL(origin + leafRoutes[3].href); await rail.click(); await expectBranch(page, "assessments-saved", true); await expect(toggle(page, "assessments-saved")).toBeVisible();
      await rail.click(); await page.setViewportSize({ width: 390, height: 1000 }); await openDrawer(page); await expect(toggle(page, "assessments-saved")).toBeVisible(); await expectBranch(page, "assessments-saved", true); await expectBranch(page, "assessments-create", false);
      await page.setViewportSize({ width: 1440, height: 1000 }); await expect(page.locator("#app-sidebar")).not.toHaveClass(/\bopen\b/u); assert.equal(await panel(page, "assessments-create").evaluate(e => e.hidden), false);
      return { railDirectIconsAccessible: true, activeBranchRestoredOnExpansion: true, mobileOverridesRailVisibilityWithoutChangingPreference: true, desktopResizeClosesDrawer: true };
    } finally { await context.close(); }
  });
  for (const role of ["super", "organization", "HSE_MANAGER", "VIEWER"]) await check("navigation-tree-preserved-for-" + role, async () => {
    const before = await contextPage({ role, baseline: true }), after = await contextPage({ role });
    try { const original = await navInventory(before.page), next = await navInventory(after.page); assert.deepEqual(next, original, "A role link, pending label or route changed"); return { role, links: next.filter(item => !item.pending).length, pending: next.filter(item => item.pending).length, exactInventoryEqual: true }; }
    finally { await before.context.close(); await after.context.close(); }
  });
  await check("main-profile-hidden-grants-and-admin-three-column-preserved", async () => {
    const result = [];
    for (const pathname of ["/profile", "/admin"]) {
      const before = await contextPage({ pathname, baseline: true }), after = await contextPage({ pathname });
      try {
        const selector = pathname === "/profile" ? 'section.page-shell:has(#image-processing-consent),section.page-shell:has(#image-processing-consent) *' : ".admin-panel-page,.admin-panel-page *";
        assert.deepEqual(await fingerprint(after.page, selector), await fingerprint(before.page, selector), "Main page presentation changed with sidebar disclosure implementation");
        if (pathname === "/profile") { await expect(after.page.locator("#image-processing-consent .posture-image-authorizations")).toBeHidden(); await expect(after.page.locator('input[name="imageProcessingConsent"]')).toBeChecked(); }
        else assert.equal(await after.page.locator("#global-admin-panel-users .admin-user-list").evaluate(e => getComputedStyle(e).gridTemplateColumns.trim().split(/\s+/u).length), 3);
        result.push({ pathname, exactMainPageFingerprintEqual: true });
      } finally { await before.context.close(); await after.context.close(); }
    }
    return result;
  });
  assert.deepEqual(pageErrors, []); assert.deepEqual(mutations, []); assert.deepEqual(unexpectedApiRequests, []); assert.deepEqual(blockedExternalRequests, []); assert.equal(sha(live + "/index.html"), liveIndexSha256); assert.equal(sha(manifestFile), manifestSha256); assert.equal(sha(hybridFile), hybridIndexSha256); assert.equal(sha(cssFile), manifest.cssSupplementSha256); for (const [relative, digest] of accessed) assert.equal(sha(live + "/" + relative), digest); for (const [relative, digest] of candidateAccessed) assert.equal(sha(candidate + "/frontend/dist/" + relative), digest);
} catch (error) { fatal = error.message; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = !fatal && checks.length === 16 && checks.every(c => c.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: "Candidate JavaScript and reviewed disclosure CSS supplement, with all thirteen live stylesheets preserved", unexpectedApiRequests, allowedSyntheticMutations: allowedMutations, noApplicationSourceOrBuildChangedByBrowserValidation: true });
console.log(JSON.stringify({ status, task, total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, fatal })); if (status !== "PASS") process.exitCode = 1;
