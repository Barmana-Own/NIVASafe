import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { root, task, work, evidence, live, sha, read } from "./prepare.mjs";

// Exercise the already deployed bundle with only the proposed member-directory presentation
// supplement added. All account data and API responses are synthetic.
const require = createRequire(`${root}/frontend/package.json`);
const { chromium, expect } = require("@playwright/test");
const helper = fileURLToPath(import.meta.url);
const manifestFile = `${evidence}/candidate.json`;
assert(fs.existsSync(manifestFile), "Freeze the candidate before browser validation");
const manifestSha256 = sha(manifestFile);
const manifest = read(manifestFile);
const cssFile = manifest.cssSupplement ?? `${work}/member-directory-cards.css`;
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
    if (url.pathname === "/qa/member-directory-cards.css") { response.setHeader("content-type", "text/css"); response.end(css); return; }
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
async function supplement(page) { await page.addStyleTag({ url: origin + "/qa/member-directory-cards.css" }); await page.evaluate(() => document.fonts.ready); await settled(page); }
async function contextPage(options = {}) {
  const { width = 1440, locale = "fa", theme = "white", pathname = "/members", count = 9, workflow = false } = options;
  const state = { members: makeMembers(count), requests: makeRequests(count), reads: [], mutations: [], patchAttempts: 0 };
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "fa" ? "fa-IR" : "en-US", timezoneId: "Asia/Tehran", serviceWorkers: "block", deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage(); page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(({ value, locale, theme }) => { localStorage.setItem("nivasafe-session", JSON.stringify(value)); localStorage.setItem("nivasafe-org", value.organizations[0].id); localStorage.setItem("nivasafe-locale", locale); localStorage.setItem("nivasafe-theme", theme); }, { value: session, locale, theme });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.includes("/api/v1")) {
      const api = url.pathname.split("/api/v1")[1];
      const respond = (data, status = 200, meta) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data, ...(meta ? { meta } : {}) }) });
      const fail = (code, message, status) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: { code, message } }) });
      if (request.method() !== "GET") {
        if (workflow && request.method() === "PATCH" && api === "/members/qa-organization-member-2") {
          const body = JSON.parse(request.postData() ?? "{}"), current = state.members[1];
          assert.equal(body.role, current.role, "Profile edit must preserve organization permissions"); assert.equal(body.active, current.active, "Profile edit must preserve active state"); if (body.globalRole !== undefined) assert.equal(body.globalRole, current.user.globalRole, "Profile edit must preserve account permissions");
          const record = { method: request.method(), path: api, body }; allowedMutations.push(record); state.mutations.push(record); state.patchAttempts++;
          if (state.patchAttempts === 1) { await fail("QA_SAVE_TEMPORARY", "Synthetic member save failure", 503); return; }
          for (const key of ["displayName", "username", "email", "phone", "jobTitle"]) current.user[key] = body[key]; await respond(current); return;
        }
        mutations.push({ method: request.method(), path: api }); await fail("QA_MUTATION_REJECTED", "Unanticipated synthetic mutation rejected", 405); return;
      }
      state.reads.push({ path: api, query: Object.fromEntries(url.searchParams) });
      if (api === "/members") { await respond(state.members); return; }
      if (api === "/member-requests") { assert.equal(url.searchParams.get("status"), "PENDING"); await respond(state.requests); return; }
      if (api === "/admin/support-requests") { await respond(supportTickets, 200, { page: 1, limit: 20, total: supportTickets.length }); return; }
      if (api === "/admin/support-staff") { await respond([]); return; }
      if (api === "/admin/support-requests/" + supportTicketId) { await respond({ ...supportTickets[0], replies: [{ id: "qa-internal-note", message: "یادداشت داخلی مصنوعی", visibility: "INTERNAL", createdAt: "2026-10-22T12:01:00.000Z", author: { id: "qa-support-staff", displayName: "Support administrator", globalRole: "SUPER_ADMIN" } }] }); return; }
      const known = ["/reports/registered", "/files", "/organizations/current", "/notifications/summary", "/me/ai-quota", "/checklists/templates", "/checklists/inspections"];
      if (!known.includes(api)) { unexpectedApiRequests.push({ method: request.method(), path: api }); await fail("QA_UNKNOWN_REQUEST", "Unanticipated synthetic request rejected", 404); return; }
      const data = api === "/reports/registered" ? reports : api === "/files" ? files : api === "/checklists/templates" ? checklistTemplates : api === "/checklists/inspections" ? [] : api === "/organizations/current" ? session.organizations[0] : api === "/notifications/summary" ? { items: [], unreadCount: 0, total: 0 } : { tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-22T12:00:00.000Z" };
      await respond(data); return;
    }
    if (url.hostname === "fonts.googleapis.com") { await route.fulfill({ status: 200, contentType: "text/css", body: stylesheet }); return; }
    if (url.origin === origin) { await route.continue(); return; } blockedExternalRequests.push({ origin: url.origin, pathname: url.pathname }); await route.abort("blockedbyclient");
  });
  await page.goto(origin + pathname + (pathname === "/support" ? "?ticket=" + supportTicketId : ""), { waitUntil: "networkidle" });
  if (pathname === "/members") { await expect(page.locator(".organization-member-card")).toHaveCount(count); await expect(page.locator(".member-request-card")).toHaveCount(count); }
  else if (pathname === "/files") { await expect(page.locator(".registered-report-card")).toHaveCount(14); await expect(page.locator(".file-card")).toHaveCount(2); }
  else if (pathname === "/checklists") await expect(page.locator(".checklist-item-draft")).toHaveCount(1);
  else { await expect(page.locator(".support-inbox-card")).toHaveCount(1); await expect(page.locator(".support-thread-panel")).toBeVisible(); }
  await page.evaluate(() => document.fonts.ready); await settled(page); return { page, context, state };
}
async function fingerprint(page, selector) {
  return page.locator(selector).evaluateAll(elements => elements.map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { tag: e.tagName, class: e.className, text: e.textContent, type: e.getAttribute("type"), width: r.width, height: r.height, display: s.display, columns: s.gridTemplateColumns, gap: s.gap, padding: s.padding, border: s.border, radius: s.borderRadius, font: s.font, color: s.color, background: s.backgroundColor }; }));
}
async function panelState(page, active) {
  const state = await page.locator('.members-workspace > [role="tabpanel"]').evaluateAll(elements => elements.map(e => ({ id: e.id, hidden: e.hidden, display: getComputedStyle(e).display })));
  assert.equal(state.filter(item => !item.hidden).length, 1); assert(state.every(item => item.id === "members-panel-" + active ? !item.hidden && item.display !== "none" : item.hidden && item.display === "none"), "Hidden tab panels became visible"); return state;
}
async function listLayout(list, cardSelector) {
  return list.evaluate((root, selector) => {
    const cards = [...root.querySelectorAll(selector)], rows = new Map(); for (const card of cards) { const y = Math.round(card.getBoundingClientRect().top); rows.set(y, (rows.get(y) ?? 0) + 1); }
    const text = cards.flatMap(card => [...card.querySelectorAll(".admin-user-card-identity > *, .admin-user-card-badges > *, .member-request-copy strong, .member-request-identifiers > *, .member-request-role, .member-request-date, .member-request-status")]);
    return { width: root.getBoundingClientRect().width, columns: getComputedStyle(root).gridTemplateColumns, rows: [...rows.values()], cardWidths: cards.map(card => card.getBoundingClientRect().width), count: cards.length, texts: cards.map(card => card.textContent), pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      textOverflow: text.filter(e => e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2).map(e => ({ class: e.className, text: e.textContent, width: e.clientWidth, scrollWidth: e.scrollWidth, height: e.clientHeight, scrollHeight: e.scrollHeight })),
      hiddenText: text.filter(e => { const s = getComputedStyle(e); return s.display === "none" || s.visibility !== "visible" || s.webkitLineClamp !== "none"; }).map(e => e.textContent),
    };
  }, cardSelector);
}
let fatal;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  for (const options of [
    { width: 1440, locale: "fa", theme: "white" }, { width: 1280, locale: "fa", theme: "white" }, { width: 1024, locale: "fa", theme: "white" }, { width: 390, locale: "fa", theme: "white" }, { width: 320, locale: "fa", theme: "white" }, { width: 1440, locale: "en", theme: "blue" }, { width: 390, locale: "en", theme: "blue" },
    { width: 1440, locale: "fa", theme: "white", count: 3 }, { width: 1440, locale: "en", theme: "blue", count: 1 },
  ]) await check("member-cards-" + options.width + "-" + options.locale + "-" + options.theme + "-" + (options.count ?? 9), async () => {
    const { page, context, state } = await contextPage(options);
    try {
      const members = page.locator("#members-panel-members .admin-user-list"), pending = page.locator("#members-panel-requests .member-request-list"), beforeMembers = await members.textContent(), beforePending = await pending.textContent();
      await supplement(page); assert.equal(await members.textContent(), beforeMembers); assert.equal(await pending.textContent(), beforePending);
      const hiddenMembers = await panelState(page, "members"), member = await listLayout(members, ".organization-member-card");
      await page.locator("#members-tab-requests").click(); const hiddenRequests = await panelState(page, "requests"), request = await listLayout(pending, ".member-request-card");
      for (const layout of [member, request]) {
        assert(!layout.pageOverflow, "Member directory overflows horizontally"); assert.deepEqual(layout.textOverflow, [], "Card content overflows or clips"); assert.deepEqual(layout.hiddenText, [], "Existing card fields are hidden");
        const tracks = layout.columns.trim().split(/\s+/u).length; assert(tracks >= 1 && tracks <= 4, "Directory exceeds the four-column cap");
        if (options.width >= 1280) { assert.equal(tracks, 4, "Wide desktop must retain four tracks even with fewer cards"); if (!options.count) assert.deepEqual(layout.rows, [4, 4, 1]); }
        if (options.width <= 390) assert.equal(tracks, 1);
      }
      await expect(page.locator(".member-request-card").first().locator(".member-request-date")).toHaveAttribute("datetime", state.requests[0].createdAt);
      assert(request.texts[0].includes(state.requests[0].email) && request.texts[0].includes("@" + state.requests[0].username));
      const requestScreenshot = evidence + "/member-requests-" + options.width + "-" + options.locale + "-" + (options.count ?? 9) + ".png"; await pending.screenshot({ path: requestScreenshot });
      await page.locator("#members-tab-members").click();
      assert(member.texts[0].includes(state.members[0].user.email) && member.texts[0].includes("@" + state.members[0].user.username) && member.texts[0].includes(state.members[0].user.jobTitle));
      const screenshot = evidence + "/organization-members-" + options.width + "-" + options.locale + "-" + (options.count ?? 9) + ".png"; await members.screenshot({ path: screenshot });
      return { options, member, request, hiddenMembers, hiddenRequests, allExistingContentPreserved: true, screenshot, screenshotSha256: sha(screenshot), requestScreenshot, requestScreenshotSha256: sha(requestScreenshot) };
    } finally { await context.close(); }
  });
  await check("member-tabs-forms-edit-modal-and-profile-save", async () => {
    const { page, context, state } = await contextPage({ width: 1440, locale: "en", theme: "white", workflow: true });
    try {
      const opener = page.locator(".organization-member-card").first().getByRole("button"), modal = page.locator(".admin-user-editor[role=dialog]");
      await opener.click(); await expect(modal).toBeVisible(); await settled(page); const modalBefore = await fingerprint(page, ".admin-user-editor,.admin-user-editor *");
      await page.keyboard.press("Escape"); await expect(modal).toHaveCount(0); await expect(opener).toBeFocused();
      await page.locator("#members-tab-requests").click(); const requestBefore = await fingerprint(page, "#members-panel-requests form,#members-panel-requests form *");
      await page.locator("#members-tab-invitations").click(); const inviteBefore = await fingerprint(page, "#members-panel-invitations form,#members-panel-invitations form *");
      await page.locator("#members-tab-members").click(); await supplement(page);
      const memberTab = page.locator("#members-tab-members"); await memberTab.focus(); await page.keyboard.press("ArrowRight"); await expect(page.locator("#members-tab-requests")).toBeFocused(); await panelState(page, "requests");
      assert.deepEqual(await fingerprint(page, "#members-panel-requests form,#members-panel-requests form *"), requestBefore, "Membership request form changed");
      await page.keyboard.press("End"); await expect(page.locator("#members-tab-invitations")).toBeFocused(); await panelState(page, "invitations"); assert.deepEqual(await fingerprint(page, "#members-panel-invitations form,#members-panel-invitations form *"), inviteBefore, "Invitation form changed");
      await page.keyboard.press("Home"); await expect(memberTab).toBeFocused(); await opener.click(); await expect(modal).toBeVisible(); await settled(page); assert.deepEqual(await fingerprint(page, ".admin-user-editor,.admin-user-editor *"), modalBefore, "Member modal presentation changed");
      const close = modal.locator(".admin-user-editor-heading > button"); await expect(close).toBeFocused(); const last = modal.locator(".admin-edit-actions button").last(); await last.focus(); await page.keyboard.press("Tab"); await expect(close).toBeFocused(); await page.keyboard.press("Shift+Tab"); await expect(last).toBeFocused(); await page.keyboard.press("Escape"); await expect(modal).toHaveCount(0); await expect(opener).toBeFocused();
      await page.locator(".organization-member-card").nth(1).getByRole("button").click(); await expect(modal).toBeVisible(); const form = modal.locator("form.member-edit-form");
      await expect(form.locator('[name="displayName"]')).toHaveValue(state.members[1].user.displayName); await expect(form.locator('[name="email"]')).toHaveValue(state.members[1].user.email); await expect(form.locator('[name="username"]')).toHaveValue(state.members[1].user.username);
      await form.locator('[name="jobTitle"]').fill("Updated synthetic safety job title"); await form.locator("button.primary").click(); await expect(modal.locator(".alert.error")).toContainText("Synthetic member save failure"); await expect(form.locator('[name="jobTitle"]')).toHaveValue("Updated synthetic safety job title");
      await form.locator("button.primary").click(); await expect(modal).toHaveCount(0); await expect(page.locator(".organization-member-card").nth(1)).toContainText("Updated synthetic safety job title"); assert.equal(state.patchAttempts, 2); assert.equal(state.mutations.length, 2);
      return { modalPresentationUnchanged: true, requestAndInvitationFormsUnchanged: true, keyboardTabsAndModalFocusTrapPreserved: true, editorValuesRetainedOnFailure: true, allowedSyntheticMutations: state.mutations, roleAndActiveAndGlobalRoleUnchanged: true };
    } finally { await context.close(); }
  });
  for (const pathname of ["/support", "/files", "/checklists"]) for (const variant of [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "en", theme: "blue" }]) await check("preserved-" + pathname.slice(1) + "-" + variant.width, async () => {
    const { page, context } = await contextPage({ ...variant, pathname });
    try { const className = pathname === "/support" ? ".support-page" : pathname === "/files" ? ".files-page" : ".checklists-page", selector = className + "," + className + " *"; const before = await fingerprint(page, selector); await supplement(page); const after = await fingerprint(page, selector); assert.deepEqual(after, before, "Unrelated page presentation changed"); return { pathname, variant, comparedElements: before.length, fingerprintsEqual: true }; }
    finally { await context.close(); }
  });
  assert.deepEqual(pageErrors, []); assert.deepEqual(mutations, []); assert.deepEqual(unexpectedApiRequests, []); assert.deepEqual(blockedExternalRequests, []); assert.equal(sha(live + "/index.html"), liveIndexSha256); assert.equal(sha(manifestFile), manifestSha256); assert.equal(sha(cssFile), manifest.cssSupplementSha256); for (const [relative, digest] of accessed) assert.equal(sha(live + "/" + relative), digest);
} catch (error) { fatal = error.message; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = !fatal && checks.length === 16 && checks.every(c => c.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: "Current deployed index/assets, with only candidate member directory CSS applied at runtime", unexpectedApiRequests, allowedSyntheticMutations: allowedMutations, noApplicationSourceOrBuildChanged: true });
console.log(JSON.stringify({ status, task, total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, fatal })); if (status !== "PASS") process.exitCode = 1;
