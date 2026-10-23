import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { root, task, work, evidence, live, sha, read } from "./prepare.mjs";

// Exercise the already deployed bundle with only the proposed administrator support presentation
// supplement added. All account data and API responses are synthetic.
const require = createRequire(`${root}/frontend/package.json`);
const { chromium, expect } = require("@playwright/test");
const helper = fileURLToPath(import.meta.url);
const manifestFile = `${evidence}/candidate.json`;
assert(fs.existsSync(manifestFile), "Freeze the candidate before browser validation");
const manifestSha256 = sha(manifestFile);
const manifest = read(manifestFile);
const cssFile = manifest.cssSupplement ?? `${work}/support-management.css`;
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
    if (url.pathname === "/qa/support-management.css") { response.setHeader("content-type", "text/css"); response.end(css); return; }
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
const firstId = "d4b86c52-a8fa-4fc8-8c9b-010203040501";
const makeTickets = () => Array.from({ length: 21 }, (_, i) => ({
  id: i === 0 ? firstId : "d4b86c52-a8fa-4fc8-8c9b-" + String(10203040502 + i).padStart(12, "0"),
  category: ["AI_QUOTA", "PROFESSIONAL_PLAN", "TECHNICAL_SUPPORT", "OTHER"][i % 4],
  subject: i === 0 ? "Needle — درخواست پشتیبانی با عنوان طولانی برای بررسی تحلیل تصویر و امکان مشاهده کامل شناسه و محتوای درخواست" : "Synthetic support ticket " + (i + 1),
  message: i === 0 ? "شرح کامل درخواست مشتری برای بررسی پشتیبانی و پردازش تصویر باید قابل مشاهده و خواندن باشد.\n" + "متن فارسی همراه English برای بررسی پیام طولانی و حفظ کامل محتوا. ".repeat(5) + "LONG-REFERENCE-" + "1234567890".repeat(10) : "Synthetic support request description for ticket " + (i + 1),
  status: ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"][i % 5],
  priority: ["LOW", "NORMAL", "HIGH", "URGENT"][i % 4], assignedTo: null,
  createdAt: "2026-10-20T12:00:00.000Z", updatedAt: "2026-10-22T12:00:00.000Z",
  requester: { id: "qa-requester-" + i, displayName: i === 0 ? "کاربر سازمان آزمایشی با نام کامل و اطلاعات قابل خواندن" : "Synthetic requester " + (i + 1), email: "qa-support-" + i + "@nivasafe.test" },
  organization: { id: "qa-support-org", nameFa: "سازمان آزمایشی پشتیبانی NIVASafe", nameEn: "Synthetic Support Organization NIVASafe" },
}));
const staff = [
  { id: "01de9675-7ea4-4fda-8fb1-abc123456701", displayName: "پشتیبان ارشد آزمایشی — Senior Support Staff", email: "qa-staff-one@nivasafe.test" },
  { id: "01de9675-7ea4-4fda-8fb1-abc123456702", displayName: "Synthetic support administrator with a longer name", email: "qa-staff-two@nivasafe.test" },
];
const initialReplies = () => [
  { id: "qa-public-reply", message: "Public support reply — پاسخ عمومی به درخواست مشتری", visibility: "PUBLIC", createdAt: "2026-10-22T12:01:00.000Z", author: { id: "qa-support-staff", displayName: "Support administrator", globalRole: "SUPER_ADMIN" } },
  { id: "qa-internal-reply", message: "Internal diagnostic note — یادداشت داخلی برای تیم پشتیبانی", visibility: "INTERNAL", createdAt: "2026-10-22T12:02:00.000Z", author: { id: "qa-support-staff", displayName: "Support administrator", globalRole: "SUPER_ADMIN" } },
];
const checklistTemplates = [{ id: "qa-checklist-draft", familyId: "qa-checklist-family", version: 1, title: "قالب بازرسی آزمایشی", status: "DRAFT", items: [{ id: "qa-checklist-item", label: "بازرسی تجهیزات", required: true }] }];
async function settled(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const finite = document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime));
    await Promise.all(finite.map(animation => animation.finished.catch(() => undefined)));
  });
}
async function supplement(page) { await page.addStyleTag({ url: origin + "/qa/support-management.css" }); await page.evaluate(() => document.fonts.ready); await settled(page); }
async function contextPage(options = {}) {
  const { width = 1440, locale = "fa", theme = "white", pathname = "/support", customer = false, initiallyOpen = false, workflow = false } = options;
  const state = { tickets: makeTickets(), replies: initialReplies(), reads: [], mutations: [], replyAttempts: 0, patchAttempts: 0, repliesByKey: new Map() };
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "fa" ? "fa-IR" : "en-US", timezoneId: "Asia/Tehran", serviceWorkers: "block", deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(error.message));
  const value = structuredClone(session); if (customer) value.user.globalRole = "USER";
  await page.addInitScript(({ value, locale, theme }) => {
    localStorage.setItem("nivasafe-session", JSON.stringify(value)); localStorage.setItem("nivasafe-org", value.organizations[0].id); localStorage.setItem("nivasafe-locale", locale); localStorage.setItem("nivasafe-theme", theme);
  }, { value, locale, theme });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.includes("/api/v1")) {
      const api = url.pathname.split("/api/v1")[1];
      const respond = (data, status = 200, meta) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data, ...(meta ? { meta } : {}) }) });
      const fail = (code, message, status) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: { code, message } }) });
      if (request.method() !== "GET") {
        if (!workflow || customer) { mutations.push({ method: request.method(), path: api }); await fail("QA_MUTATION_REJECTED", "Unanticipated synthetic mutation rejected", 405); return; }
        const current = state.tickets.find(item => item.id === firstId), body = JSON.parse(request.postData() ?? "{}");
        if (api === "/admin/support-requests/" + firstId && request.method() === "PATCH") {
          const record = { method: "PATCH", path: api, body }; state.mutations.push(record); allowedMutations.push(record); state.patchAttempts++;
          if (state.patchAttempts === 1) { await fail("SUPPORT_TICKET_CONFLICT", "Synthetic conflict", 409); return; }
          assert.equal(body.expectedUpdatedAt, current.updatedAt);
          Object.assign(current, { status: body.status, priority: body.priority, assignedTo: staff.find(person => person.id === body.assignedToId) ?? null, updatedAt: "2026-10-22T12:10:00.000Z" });
          await respond(current); return;
        }
        if (request.method() === "POST" && ["/admin/support-requests/" + firstId + "/replies", "/admin/support-requests/" + firstId + "/internal-notes"].includes(api)) {
          const key = request.headers()["idempotency-key"], internal = api.endsWith("/internal-notes");
          assert(/^[0-9a-f-]{36}$/i.test(key ?? ""), "Synthetic reply requires the real client idempotency key");
          assert(typeof body.message === "string" && body.message.trim().length > 0);
          const record = { method: "POST", path: api, body, idempotencyKey: key }; state.mutations.push(record); allowedMutations.push(record);
          if (!internal && ++state.replyAttempts === 1) { await fail("QA_REPLY_TEMPORARY", "Synthetic reply failure", 503); return; }
          if (!state.repliesByKey.has(key)) {
            const reply = { id: "qa-added-reply-" + state.replies.length, message: body.message, visibility: internal ? "INTERNAL" : "PUBLIC", createdAt: "2026-10-22T12:15:00.000Z", author: { id: "qa-support-staff", displayName: "Support administrator", globalRole: "SUPER_ADMIN" } };
            state.repliesByKey.set(key, reply); state.replies.push(reply);
          }
          await respond(state.repliesByKey.get(key), 201); return;
        }
        mutations.push({ method: request.method(), path: api }); await fail("QA_MUTATION_REJECTED", "Unanticipated synthetic mutation rejected", 405); return;
      }
      state.reads.push({ path: api, query: Object.fromEntries(url.searchParams) });
      if (api === "/admin/support-requests") {
        let result = state.tickets;
        for (const key of ["category", "priority", "status"]) if (url.searchParams.get(key)) result = result.filter(ticket => ticket[key] === url.searchParams.get(key));
        if (url.searchParams.get("search")) result = result.filter(ticket => [ticket.subject, ticket.message, ticket.requester.displayName, ticket.organization.nameEn, ticket.organization.nameFa].join(" ").toLowerCase().includes(url.searchParams.get("search").toLowerCase()));
        const pageNumber = Number(url.searchParams.get("page") ?? 1), limit = Number(url.searchParams.get("limit") ?? 20);
        await respond(result.slice((pageNumber - 1) * limit, pageNumber * limit), 200, { page: pageNumber, limit, total: result.length }); return;
      }
      if (api === "/support/requests") { await respond(state.tickets.slice(0, 2), 200, { page: 1, limit: 20, total: 2 }); return; }
      if (api === "/admin/support-staff") { await respond(staff); return; }
      const detailMatch = api.match(/^\/(?:admin\/support-requests|support\/requests)\/([0-9a-f-]+)$/i);
      if (detailMatch) { const ticket = state.tickets.find(item => item.id === detailMatch[1]); await respond({ ...ticket, replies: state.replies }); return; }
      const known = ["/reports/registered", "/files", "/organizations/current", "/notifications/summary", "/me/ai-quota", "/checklists/templates", "/checklists/inspections"];
      if (!known.includes(api)) { unexpectedApiRequests.push({ method: request.method(), path: api }); await fail("QA_UNKNOWN_REQUEST", "Unanticipated synthetic request rejected", 404); return; }
      const data = api === "/reports/registered" ? reports : api === "/files" ? files : api === "/checklists/templates" ? checklistTemplates : api === "/checklists/inspections" ? []
        : api === "/organizations/current" ? value.organizations[0] : api === "/notifications/summary" ? { items: [], unreadCount: 0, total: 0 }
        : { tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-22T12:00:00.000Z" };
      await respond(data); return;
    }
    if (url.hostname === "fonts.googleapis.com") { await route.fulfill({ status: 200, contentType: "text/css", body: stylesheet }); return; }
    if (url.origin === origin) { await route.continue(); return; }
    blockedExternalRequests.push({ origin: url.origin, pathname: url.pathname }); await route.abort("blockedbyclient");
  });
  await page.goto(origin + pathname + (initiallyOpen ? "?ticket=" + firstId : ""), { waitUntil: "networkidle" });
  if (pathname === "/support") {
    await expect(page.locator(customer ? ".support-request-card" : ".support-inbox-card")).toHaveCount(customer ? 2 : 20);
    if (initiallyOpen) await expect(page.locator(".support-thread-panel").first()).toBeVisible();
  } else if (pathname === "/files") { await expect(page.locator(".registered-report-card")).toHaveCount(14); await expect(page.locator(".file-card")).toHaveCount(2); }
  else { await expect(page.locator(".checklist-item-draft")).toHaveCount(1); }
  await page.evaluate(() => document.fonts.ready); await settled(page);
  return { page, context, state };
}
async function fingerprint(page, selector) {
  return page.locator(selector).evaluateAll(elements => elements.map(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { tag: e.tagName, class: e.className, text: e.textContent, width: r.width, height: r.height, display: s.display, columns: s.gridTemplateColumns, gap: s.gap, padding: s.padding, border: s.border, radius: s.borderRadius, font: s.font, color: s.color, background: s.backgroundColor }; }));
}
async function selectValue(wrapper, value) {
  const text = await wrapper.locator("select option").evaluateAll((options, value) => options.find(option => option.value === value)?.textContent, value);
  assert(text, "Missing real select option " + value);
  await wrapper.locator(".styled-select-trigger").click();
  await wrapper.getByRole("option", { name: text, exact: true }).click();
}
async function menuProof(page, trigger) {
  await trigger.scrollIntoViewIfNeeded(); await trigger.click(); await settled(page);
  const menu = page.getByRole("listbox"); await expect(menu).toBeVisible();
  const result = await menu.evaluate(e => {
    const r = e.getBoundingClientRect(), first = e.querySelector('[role="option"]'), fr = first.getBoundingClientRect(), hit = document.elementFromPoint(fr.left + fr.width / 2, Math.min(fr.bottom - 2, fr.top + 10));
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, firstOptionHit: Boolean(hit && first.contains(hit)), pageOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  assert(result.x >= -1 && result.right <= result.viewportWidth + 1 && result.y >= -1 && result.bottom <= result.viewportHeight + 1, "Select menu overflows the viewport: " + JSON.stringify(result));
  assert(result.firstOptionHit && !result.pageOverflow, "Select menu is clipped or obscured");
  await page.keyboard.press("Escape"); await expect(trigger).toBeFocused(); return result;
}
let fatal;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  for (const options of [
    { width: 1440, locale: "fa", theme: "white" }, { width: 1280, locale: "fa", theme: "white" }, { width: 1024, locale: "fa", theme: "white" }, { width: 390, locale: "fa", theme: "white" }, { width: 320, locale: "fa", theme: "white" }, { width: 1440, locale: "en", theme: "blue" }, { width: 390, locale: "en", theme: "blue" },
  ]) await check("admin-support-layout-" + options.width + "-" + options.locale + "-" + options.theme, async () => {
    const { page, context, state } = await contextPage({ ...options, initiallyOpen: true });
    try {
      const pageRoot = page.locator(".support-administrator-page"), first = page.locator(".support-inbox-card").first();
      const contentBefore = await pageRoot.textContent(); await supplement(page); assert.equal(await pageRoot.textContent(), contentBefore, "Existing labels, ticket metadata, messages or actions changed");
      const layout = await pageRoot.evaluate(e => {
        const filter = e.querySelector(".support-inbox-controls"), card = e.querySelector(".support-inbox-card"), thread = card.querySelector(".support-thread-panel"), publicMessage = thread.querySelector(".from-support:not(.internal-note)"), internal = thread.querySelector(".internal-note");
        const styles = node => { const s = getComputedStyle(node), r = node.getBoundingClientRect(); return { width: r.width, height: r.height, columns: s.gridTemplateColumns, color: s.color, background: s.backgroundColor, border: s.borderInlineStartColor }; };
        const textElements = [...card.querySelectorAll("h3,.support-ticket-reference,.support-request-preview,.support-thread-message p")];
        return { filter: styles(filter), card: styles(card), thread: styles(thread), publicMessage: styles(publicMessage), internal: styles(internal), pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          textOverflow: textElements.filter(node => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2).map(node => ({ class: node.className, text: node.textContent, width: node.clientWidth, scrollWidth: node.scrollWidth })),
          hiddenText: textElements.filter(node => { const s = getComputedStyle(node); return s.display === "none" || s.visibility !== "visible" || s.webkitLineClamp !== "none"; }).map(node => node.className),
          secondary: [...e.querySelectorAll("button.secondary")].map(node => { const s = getComputedStyle(node); return { height: node.getBoundingClientRect().height, appearance: s.appearance, fontFamily: s.fontFamily }; }),
          managementLabels: [...card.querySelectorAll(":scope > label")].map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width }; }),
          noteForm: styles(thread.querySelector(".support-internal-note-form")), replyForm: styles(thread.querySelector("form:not(.support-internal-note-form)")),
        };
      });
      assert(!layout.pageOverflow, "Support page overflows horizontally"); assert.deepEqual(layout.textOverflow, []); assert.deepEqual(layout.hiddenText, []);
      const count = value => value.trim().split(/\s+/u).length;
      assert.equal(count(layout.filter.columns), options.width > 1100 ? 4 : options.width > 600 ? 2 : 1);
      assert.equal(count(layout.card.columns), options.width > 600 ? 3 : 1);
      assert.equal(count(layout.thread.columns), options.width > 1100 ? 2 : 1);
      assert(layout.secondary.every(button => button.height >= 44 && button.appearance === "none" && button.fontFamily.includes("Vazirmatn")), "A secondary control retains its default appearance or is too small");
      assert.notEqual(layout.internal.background, layout.publicMessage.background, "Internal notes must differ visibly from public replies");
      assert.notEqual(layout.noteForm.background, layout.replyForm.background, "Internal note form must differ visibly from public reply form");
      await expect(first.locator("bdi")).toHaveText(firstId); await expect(first.locator(":scope > .support-request-preview")).toHaveText(state.tickets[0].message);
      const menus = [await menuProof(page, page.locator(".support-inbox-controls .styled-select-trigger").last()), await menuProof(page, first.locator(":scope > label .styled-select-trigger").last())];
      const refresh = page.locator(".support-inbox-section > button.secondary"); await refresh.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab"); await expect(refresh).toBeFocused(); await settled(page);
      const focus = await refresh.evaluate(node => { const s = getComputedStyle(node); return { visible: node.matches(":focus-visible"), outline: s.outlineStyle, width: s.outlineWidth }; });
      assert(focus.visible && focus.outline !== "none" && parseFloat(focus.width) >= 2);
      const screenshot = evidence + "/support-admin-" + options.width + "-" + options.locale + "-" + options.theme + ".png";
      await first.screenshot({ path: screenshot });
      return { options, layout, menus, focus, fullUuidAndLongMessagePreserved: true, screenshot, screenshotSha256: sha(screenshot) };
    } finally { await context.close(); }
  });
  await check("administrator-support-filter-thread-and-mutation-contracts", async () => {
    const { page, context, state } = await contextPage({ width: 1440, locale: "en", theme: "white", workflow: true });
    try {
      await supplement(page);
      const filters = page.locator(".support-inbox-controls"), selects = filters.locator(".styled-select"), search = filters.locator('input[type="search"]');
      await selectValue(selects.nth(0), "TECHNICAL_SUPPORT"); await expect.poll(() => state.reads.at(-1)?.query?.category).toBe("TECHNICAL_SUPPORT");
      await selectValue(selects.nth(1), "HIGH"); await expect.poll(() => state.reads.at(-1)?.query?.priority).toBe("HIGH");
      await selectValue(selects.nth(2), "OPEN"); await expect.poll(() => state.reads.at(-1)?.query?.status).toBe("OPEN");
      await selectValue(selects.nth(0), ""); await selectValue(selects.nth(1), ""); await selectValue(selects.nth(2), "");
      await search.fill("Needle"); await expect(page.locator(".support-inbox-card")).toHaveCount(1); await expect.poll(() => state.reads.at(-1)?.query?.search).toBe("Needle");
      await search.clear(); await expect(page.locator(".support-inbox-card")).toHaveCount(20);
      const pagination = page.locator(".support-pagination"); await pagination.getByRole("button").last().click(); await expect(page.locator(".support-inbox-card")).toHaveCount(1); await expect.poll(() => state.reads.at(-1)?.query?.page).toBe("2");
      await pagination.getByRole("button").first().click(); await expect(page.locator(".support-inbox-card")).toHaveCount(20);
      const listReads = () => state.reads.filter(read => read.path === "/admin/support-requests").length, staffReads = () => state.reads.filter(read => read.path === "/admin/support-staff").length;
      const beforeRefresh = { list: listReads(), staff: staffReads() }; await page.locator(".support-inbox-section > button.secondary").click(); await expect.poll(listReads).toBeGreaterThan(beforeRefresh.list); await expect.poll(staffReads).toBeGreaterThan(beforeRefresh.staff);
      const first = page.locator(".support-inbox-card").first(), management = first.locator(":scope > label .styled-select");
      await selectValue(management.nth(0), "IN_PROGRESS"); await selectValue(management.nth(1), "URGENT"); await selectValue(management.nth(2), staff[0].id);
      const save = first.locator(":scope > button.primary"); await expect(save).toBeEnabled(); await save.click(); await expect(page.locator(".support-inbox-section > .alert.error")).toBeVisible();
      await expect(management.nth(0).locator("select")).toHaveValue("IN_PROGRESS"); await expect(management.nth(1).locator("select")).toHaveValue("URGENT"); await expect(management.nth(2).locator("select")).toHaveValue(staff[0].id);
      await save.click(); await expect(page.locator(".support-inbox-section > .alert.success")).toBeVisible(); await expect.poll(() => state.patchAttempts).toBe(2);
      await first.locator(".support-thread-toggle").click(); const panel = first.locator(".support-thread-panel"); await expect(panel).toBeVisible();
      const publicForm = panel.locator("form:not(.support-internal-note-form)"), publicInput = publicForm.locator("textarea"), internalForm = panel.locator("form.support-internal-note-form");
      await expect(publicForm.locator("button")).toBeDisabled(); await publicInput.fill("Public synthetic reply retained across retry"); await publicForm.locator("button").click(); await expect(panel.locator(".alert.error")).toContainText("Synthetic reply failure"); await expect(publicInput).toHaveValue("Public synthetic reply retained across retry");
      await publicForm.locator("button").click(); await expect(publicInput).toHaveValue(""); await expect(panel.locator(".support-thread-message:not(.internal-note)").last()).toContainText("Public synthetic reply retained across retry");
      const publicPosts = state.mutations.filter(record => record.path.endsWith("/replies")); assert.equal(publicPosts.length, 2); assert.equal(publicPosts[0].idempotencyKey, publicPosts[1].idempotencyKey); assert.equal(state.replies.filter(reply => reply.message === "Public synthetic reply retained across retry").length, 1);
      await expect(internalForm.locator("button")).toBeDisabled(); await internalForm.locator("textarea").fill("Internal synthetic diagnostic note"); await internalForm.locator("button").click(); await expect(internalForm.locator("textarea")).toHaveValue(""); await expect(panel.locator(".internal-note").last()).toContainText("Internal synthetic diagnostic note");
      const detailsReadCount = () => state.reads.filter(read => read.path === "/admin/support-requests/" + firstId).length; const beforeDetail = detailsReadCount(); await first.locator(".support-thread > .page-actions-inline button").last().click(); await expect.poll(detailsReadCount).toBeGreaterThan(beforeDetail);
      await first.locator(".support-thread-toggle").click(); await expect(panel).toHaveCount(0); await first.locator(".support-thread-toggle").click(); await expect(panel).toBeVisible();
      assert.equal(state.mutations.length, 5); return { beforeRefresh, reads: state.reads.length, allowedSyntheticMutations: state.mutations, publicReplyRetryKeyStable: true, publicReplyPersistedOnce: true, statusConflictRetainsDrafts: true, searchFiltersPaginationRefreshTogglesPreserved: true };
    } finally { await context.close(); }
  });
  for (const target of [{ pathname: "/support", customer: true, initiallyOpen: true }, { pathname: "/files" }, { pathname: "/checklists" }]) for (const variant of [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "en", theme: "blue" }]) await check("preserved-" + (target.customer ? "customer-support" : target.pathname.slice(1)) + "-" + variant.width, async () => {
    const { page, context } = await contextPage({ ...target, ...variant });
    try {
      const selector = target.pathname === "/support" ? ".support-page,.support-page *" : target.pathname === "/files" ? ".files-page,.files-page *" : ".checklists-page,.checklists-page *";
      const before = await fingerprint(page, selector); await supplement(page); const after = await fingerprint(page, selector); assert.deepEqual(after, before, "Unrelated customer/page presentation changed");
      if (target.customer) { await expect(page.locator(".support-administrator-page")).toHaveCount(0); await expect(page.locator(".internal-note,.support-internal-note-form")).toHaveCount(0); }
      return { target, variant, comparedElements: before.length, fingerprintsEqual: true, customerInternalNotesNotRendered: target.customer || undefined };
    } finally { await context.close(); }
  });
  assert.deepEqual(pageErrors, [], "Browser runtime errors occurred"); assert.deepEqual(mutations, [], "An unanticipated synthetic API mutation occurred"); assert.deepEqual(unexpectedApiRequests, [], "An unanticipated API read occurred"); assert.deepEqual(blockedExternalRequests, [], "An unexpected external dependency was requested");
  assert.equal(sha(live + "/index.html"), liveIndexSha256); assert.equal(sha(manifestFile), manifestSha256); assert.equal(sha(cssFile), manifest.cssSupplementSha256); for (const [relative, digest] of accessed) assert.equal(sha(live + "/" + relative), digest);
} catch (error) { fatal = error.message; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = !fatal && checks.length === 14 && checks.every(c => c.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: "Current deployed index/assets, with only candidate administrator-support CSS applied at runtime", unexpectedApiRequests, allowedSyntheticMutations: allowedMutations, fixtureTickets: 21, fixtureReports: reports.length, fixtureFiles: files.length, noApplicationSourceOrBuildChanged: true });
console.log(JSON.stringify({ status, task, total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, fatal })); if (status !== "PASS") process.exitCode = 1;
