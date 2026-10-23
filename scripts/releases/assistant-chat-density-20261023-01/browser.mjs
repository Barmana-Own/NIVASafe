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
const planFile = `${evidence}/frontend-plan.json`, plan = read(planFile), planSha256 = sha(planFile);
assert.equal(sha(`${work}/test-index.html`), plan.htmlSha256);
const candidateRoot = path.resolve(`${work}/candidate/frontend/dist`), planned = new Map(plan.assets.map(asset => [asset.url, asset.sha256])), candidateInputs = new Map();
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
const css = fs.readFileSync(cssFile), baselineHtml = fs.readFileSync(capturedIndex), originalHtml = fs.readFileSync(deployed ? `${live}/index.html` : `${work}/test-index.html`);
const output = `${evidence}/${deployed ? "live-ui" : "e2e-validation"}.json`;
assert(!fs.existsSync(output), "Preserve previous browser evidence before rerunning");
const accessed = new Map();
const protectedStatic = new Map(runtime.staticFiles.map(file => [file.path, file.sha256]));
const staticRoot = path.resolve(live), fontRoot = `${root}/frontend/tests/e2e/assets`;
const textareaSelector = '.assistant-redesign textarea[name="content"]';

const checks = [], pageErrors = [], blockedExternalRequests = [], unexpectedApiRequests = [], rejectedMutations = [], allowedSyntheticMutations = [];
const screenshots = [];
let browser, serverClosed = false, browserClosed = false, fatal;
const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".json": "application/json" };
const server = http.createServer((request, response) => {
  try {
    assert.equal(request.method, "GET");
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    response.setHeader("cache-control", "no-store");
    if (url.pathname === "/qa/assistant-chat-density.css") { response.setHeader("content-type", "text/css"); response.end(css); return; }
    if (!deployed && url.pathname === plan.cssAsset) { response.setHeader("content-type", "text/css"); response.end(css); return; }
    if (url.pathname === "/qa/font-arabic.woff2" || url.pathname === "/qa/font-latin.woff2") {
      response.setHeader("content-type", "font/woff2");
      response.end(fs.readFileSync(`${fontRoot}/${url.pathname.includes("arabic") ? "vazirmatn-arabic.woff2" : "vazirmatn-latin.woff2"}`)); return;
    }
    const decoded = decodeURIComponent(url.pathname);
    assert(!decoded.includes("\\") && !decoded.includes("\0"));
    const target = path.resolve(staticRoot, `.${decoded}`);
    assert(target.startsWith(`${staticRoot}${path.sep}`), "Static traversal rejected");
    if (!deployed && planned.has(decoded)) {
      const built = path.resolve(candidateRoot, `.${decoded}`); assert(built.startsWith(`${candidateRoot}${path.sep}`)); assert.equal(sha(built), planned.get(decoded)); candidateInputs.set(path.relative(candidateRoot, built).replaceAll("\\", "/"), sha(built)); response.setHeader("content-type", mime[path.extname(built)] ?? "application/octet-stream"); response.end(fs.readFileSync(built)); return;
    }
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      const relative = path.relative(staticRoot, target).replaceAll("\\", "/"), digest = sha(target);
      const expected = relative === "index.html" ? expectedIndexSha256 : protectedStatic.get(relative) ?? planned.get(decoded) ?? (deployed && `/${relative}` === deployment.cssAsset ? manifest.cssSupplementSha256 : null);
      assert(expected, "Static artifact not in captured baseline or explicit release"); assert.equal(digest, expected, "Static artifact differs from frozen release input");
      if (accessed.has(relative)) assert.equal(accessed.get(relative), digest, "Static input changed during QA");
      else accessed.set(relative, digest);
      response.setHeader("content-type", mime[path.extname(target)] ?? "application/octet-stream"); response.end(fs.readFileSync(target)); return;
    }
    assert(!path.extname(decoded), "Unlisted static artifact rejected");
    response.setHeader("content-type", "text/html;charset=utf-8"); response.end(url.searchParams.has("qa-baseline") ? baselineHtml : originalHtml);
  } catch { response.statusCode = 404; response.end("Not found"); }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
const stylesheet = [
  "@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;font-display:swap;src:url('/qa/font-arabic.woff2') format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200F,U+FB50-FDFF,U+FE70-FEFF}",
  "@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;font-display:swap;src:url('/qa/font-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+2000-206F}",
].join("\n");
const organization = { id: "qa-chat-org", nameFa: "سازمان مصنوعی گفتگو", nameEn: "Synthetic chat organization", role: "ORG_ADMIN", active: true, subscriptionPlan: "ENTERPRISE", subscriptionStatus: "ACTIVE" };
const baseSession = { accessToken: "synthetic-chat-browser-validation-token", refreshToken: "synthetic-chat-browser-validation-refresh", user: { id: "qa-chat-user", email: "chat-density@nivasafe.test", username: "chat_density_qa", displayName: "کاربر آزمون گفتگو", globalRole: "SUPER_ADMIN" }, organizations: [organization] };
const initialConversations = [{ id: "qa-chat-one", title: "Synthetic safety conversation A", updatedAt: "2026-10-23T12:00:00.000Z" }, { id: "qa-chat-two", title: "Synthetic second conversation B", updatedAt: "2026-10-22T12:00:00.000Z" }];
const shortUser = { id: "qa-message-short", role: "user", content: "سلام", createdAt: "2026-10-23T12:00:00.000Z" };
const assistantReply = { id: "qa-message-assistant", role: "assistant", content: "پاسخ مصنوعی ایمنی و بهداشت حرفه‌ای — Synthetic assistant reply with preserved layout and citations.\nSecond line of the existing assistant response.", createdAt: "2026-10-23T12:01:00.000Z", citations: [{ id: "qa-citation", title: "Synthetic knowledge source" }] };
const longUser = { id: "qa-message-long", role: "user", content: `${"پیام طولانی کاربر برای بررسی نمایش کامل و شکست خط صحیح — Long mixed direction user message. ".repeat(12)}${"UnbrokenIdentifier".repeat(10)}`, createdAt: "2026-10-23T12:02:00.000Z" };
function bindings() { return { candidateManifestSha256: manifestSha256, cssSupplementSha256: sha(cssFile), helperSha256, runtimeBeforeSha256: runtimeSha256, baselineIndexSha256: runtime.indexSha256, liveIndexSha256: sha(`${live}/index.html`), frontendPlanSha256: planSha256, hybridIndexSha256: plan.htmlSha256, ...(deployed ? { deploymentSha256: sha(deploymentFile), deployedCssAsset: deployment.cssAsset } : {}), liveStaticInputs: [...accessed].map(([relative, sha256]) => ({ path: relative, sha256 })), candidateStaticInputs: [...candidateInputs].map(([relative, sha256]) => ({ path: relative, sha256 })), productionNetworkRequests: 0, productionMutations: 0, blockedExternalRequests, rejectedApiMutations: rejectedMutations, unexpectedApiRequests, allowedSyntheticMutations, pageErrors }; }
function save(status, extra = {}) { fs.writeFileSync(output, JSON.stringify({ status, task, at: new Date().toISOString(), ...bindings(), total: checks.length, passed: checks.filter(c => c.status === "PASS").length, failed: checks.filter(c => c.status === "FAIL").length, pending: 0, checks, screenshots, ...extra }, null, 2)); }
async function check(name, run) { const record = { name, status: "RUNNING" }, started = performance.now(); checks.push(record); save("RUNNING"); try { record.details = await run(); record.status = "PASS"; } catch (error) { record.status = "FAIL"; record.error = error.message; } record.elapsedMs = Math.round(performance.now() - started); save("RUNNING"); console.log(JSON.stringify({ name, status: record.status, error: record.error })); }
async function settled(page) { await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => undefined))); }); }
async function contextPage({ width = 1440, locale = "fa", theme = "white", baseline = false } = {}) {
  const state = { conversations: structuredClone(initialConversations), messages: new Map([["qa-chat-one", [shortUser, assistantReply, longUser]], ["qa-chat-two", [{ ...shortUser, id: "qa-second-user", content: "Second conversation question" }, { ...assistantReply, id: "qa-second-reply", content: "Second conversation response" }]]]), reads: [], posts: [], releases: [], holdSend: false, failNextSend: false, failNextMessages: false };
  const session = { ...baseSession, user: { ...baseSession.user, locale } }, context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === "fa" ? "fa-IR" : "en-US", timezoneId: "Asia/Tehran", serviceWorkers: "block", deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage(); page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(({ value, locale, theme }) => { localStorage.setItem("nivasafe-session", JSON.stringify(value)); localStorage.setItem("nivasafe-org", value.organizations[0].id); localStorage.setItem("nivasafe-locale", locale); localStorage.setItem("nivasafe-theme", theme); sessionStorage.setItem("nivasafe-path-selected", "safety"); }, { value: session, locale, theme });
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === "fonts.googleapis.com") { await route.fulfill({ status: 200, contentType: "text/css", body: stylesheet }); return; }
    if (url.origin !== origin) { blockedExternalRequests.push({ origin: url.origin, pathname: url.pathname }); await route.abort("blockedbyclient"); return; }
    if (url.pathname.startsWith("/api/v1")) {
      const api = url.pathname.slice("/api/v1".length), respond = data => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) }), fail = (status, message) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: { code: "QA_SYNTHETIC_FAILURE", message } }) });
      if (request.method() === "POST" && api === "/chat/conversations") { const body = JSON.parse(request.postData()); assert.equal(typeof body.title, "string"); const conversation = { id: `qa-created-chat-${state.conversations.length + 1}`, title: body.title, updatedAt: "2026-10-23T12:05:00.000Z" }; state.conversations.unshift(conversation); state.messages.set(conversation.id, []); const record = { method: "POST", path: api, body, loopbackOnly: true }; state.posts.push(record); allowedSyntheticMutations.push(record); await respond(conversation); return; }
      const messagePath = api.match(/^\/chat\/conversations\/(qa-[A-Za-z0-9-]+)\/messages$/u);
      if (request.method() === "POST" && messagePath) {
        const body = JSON.parse(request.postData()); assert.deepEqual(Object.keys(body).sort(), ["content", "locale"]); assert.equal(typeof body.content, "string"); assert(body.content.length >= 2 && body.content.length <= 32000); assert.equal(body.locale, locale); assert(state.messages.has(messagePath[1]));
        const record = { method: "POST", path: api, body, loopbackOnly: true }; state.posts.push(record); allowedSyntheticMutations.push(record);
        if (state.holdSend) await new Promise(resolve => state.releases.push(resolve));
        if (state.failNextSend) { state.failNextSend = false; await fail(503, "Synthetic chat service temporarily unavailable"); return; }
        const reply = { id: `qa-reply-${state.posts.length}`, role: "assistant", content: "Synthetic local reply — پاسخ مصنوعی بدون ارتباط با سرویس هوش مصنوعی", createdAt: "2026-10-23T12:06:00.000Z", citations: [] }, user = { id: `qa-user-message-${state.posts.length}`, role: "user", content: body.content, createdAt: "2026-10-23T12:05:00.000Z" };
        state.messages.get(messagePath[1]).push(user, reply); await respond(reply); return;
      }
      if (request.method() !== "GET") { rejectedMutations.push({ method: request.method(), path: api }); await fail(405, "Unexpected synthetic mutation rejected"); return; }
      state.reads.push({ path: api });
      if (api === "/chat/conversations") { await respond(state.conversations); return; }
      if (messagePath) { if (state.failNextMessages) { state.failNextMessages = false; await fail(503, "Synthetic message history load failure"); return; } assert(state.messages.has(messagePath[1])); await respond(state.messages.get(messagePath[1])); return; }
      if (api === "/organizations/current") { await respond(organization); return; }
      if (api === "/notifications/summary") { await respond({ items: [], unreadCount: 0, total: 0 }); return; }
      if (api === "/me/ai-quota") { await respond({ tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-23T12:00:00.000Z" }); return; }
      unexpectedApiRequests.push({ method: request.method(), path: api }); await fail(404, "Unexpected synthetic API request rejected"); return;
    }
    await route.continue();
  });
  await page.goto(`${origin}/assistant${baseline ? "?qa-baseline=1" : ""}`, { waitUntil: "networkidle" }); await expect(page.locator(textareaSelector)).toBeVisible(); await expect(page.locator(".welcome-icon")).toBeVisible(); await settled(page);
  if (!baseline && !deployed && !plan.cssAsset) { await page.addStyleTag({ url: `${origin}/qa/assistant-chat-density.css` }); await settled(page); }
  return { page, context, state, async close() { state.holdSend = false; for (const release of state.releases.splice(0)) release(); await context.close(); } };
}
async function selectConversation(page, id = "qa-chat-one") {
  if (!(await page.locator(".history").isVisible())) await page.locator(".history-toggle").click();
  const title = initialConversations.find(item => item.id === id).title; await page.locator(".history .conversation-row").filter({ hasText: title }).click(); await expect(page.locator(".message-thread")).toBeVisible(); await settled(page);
}
async function textareaMetrics(page) { return page.locator(textareaSelector).evaluate(element => { const s = getComputedStyle(element), r = element.getBoundingClientRect(), composer = element.closest(".composer").getBoundingClientRect(); return { value: element.value, width: r.width, height: r.height, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, fontSize: Number.parseFloat(s.fontSize), lineHeight: Number.parseFloat(s.lineHeight), paddingTop: Number.parseFloat(s.paddingTop), paddingBottom: Number.parseFloat(s.paddingBottom), overflowY: s.overflowY, maxHeight: Number.parseFloat(s.maxHeight), minHeight: Number.parseFloat(s.minHeight), composerHeight: composer.height, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1 }; }); }
async function expectedRows(page, rows) { await expect.poll(async () => (await textareaMetrics(page)).height).toBe(rows * 24); return textareaMetrics(page); }
async function countMatches(page, locale) { const value = await page.locator(textareaSelector).inputValue(); const formatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "fa-IR"); await expect(page.locator(".composer-label > span")).toHaveText(`${formatter.format(value.length)} / ${formatter.format(32000)}`); }
async function styleFingerprint(page, selector) { return page.locator(selector).evaluateAll(items => items.map(element => { const s = getComputedStyle(element); return { tag: element.tagName, class: element.className, text: element.textContent, display: s.display, padding: s.padding, margin: s.margin, border: s.border, radius: s.borderRadius, font: s.font, color: s.color, background: s.backgroundColor, width: s.width, minWidth: s.minWidth, maxWidth: s.maxWidth }; })); }
async function messageMetrics(page, selector = ".message.user:not(.pending-message)") { return page.locator(selector).evaluateAll(items => items.map(element => { const s = getComputedStyle(element), r = element.getBoundingClientRect(); return { text: element.textContent, width: r.width, height: r.height, paddingTop: Number.parseFloat(s.paddingTop), paddingInlineStart: Number.parseFloat(s.paddingInlineStart), minWidth: s.minWidth, maxWidth: s.maxWidth, overflow: element.scrollWidth > element.clientWidth + 2, paragraphOverflow: [...element.querySelectorAll("p")].some(item => item.scrollWidth > item.clientWidth + 2), left: r.left, right: r.right }; })); }
async function screenshot(page, name, selector = ".assistant-redesign") { const file = `${evidence}/${deployed ? "deployed-" : ""}${name}.png`; await page.locator(selector).screenshot({ path: file }); screenshots.push({ path: file, sha256: sha(file) }); }
async function assertComposerLifecycle(page, locale) {
  const input = page.locator(textareaSelector); await input.fill(""); const one = await expectedRows(page, 1); await input.fill("First line"); await input.press("Shift+Enter"); await input.press("KeyB"); const two = await expectedRows(page, 2); await input.press("Shift+Enter"); await input.press("KeyC"); const three = await expectedRows(page, 3); await input.press("Shift+Enter"); await input.press("KeyD"); const four = await expectedRows(page, 3); assert(four.scrollHeight > four.clientHeight); assert.equal(four.overflowY, "auto"); await countMatches(page, locale);
  await input.fill("x"); await expectedRows(page, 1); await input.fill("Safety posture and task context ".repeat(30)); const wrap = await expectedRows(page, 3); assert(wrap.scrollHeight > wrap.clientHeight); await input.fill("Paste first\nPaste second\nPaste third"); await expectedRows(page, 3); await input.fill(""); await expectedRows(page, 1); await countMatches(page, locale); assert.equal((await textareaMetrics(page)).pageOverflow, false); return { one, two, three, four: { ...four, value: undefined }, wrap: { ...wrap, value: undefined } };
}
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  const variants = deployed ? [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "fa", theme: "white" }, { width: 1440, locale: "en", theme: "blue" }] : [{ width: 1440, locale: "fa", theme: "white" }, { width: 390, locale: "fa", theme: "white" }, { width: 320, locale: "fa", theme: "white" }, { width: 768, locale: "fa", theme: "white" }, { width: 1440, locale: "en", theme: "blue" }, { width: 390, locale: "en", theme: "blue" }];
  for (const options of variants) await check(`assistant-density-${options.width}-${options.locale}-${options.theme}`, async () => {
    const run = await contextPage(options), { page, state } = run;
    try {
      await expect(page.locator(".assistant-header .identity-icon")).toBeHidden(); await expect(page.locator(".assistant-header h1")).toBeVisible(); await expect(page.locator(".welcome-icon img")).toBeVisible(); await expect(page.locator(".side-brand img").first()).toBeVisible(); await expect(page.locator(".prompt-grid .prompt")).toHaveCount(3);
      const metrics = await textareaMetrics(page); assert.equal(metrics.fontSize, options.width <= 768 ? 16 : 14); assert.equal(metrics.lineHeight, 24); const lifecycle = await assertComposerLifecycle(page, options.locale);
      const send = page.locator(".composer .send"), target = await send.boundingBox(); assert(target.width >= 44 && target.height >= 44); await page.locator(textareaSelector).focus(); await page.keyboard.press("Tab"); await expect(send).toBeFocused(); const focus = await send.evaluate(element => ({ visible: element.matches(":focus-visible"), outline: getComputedStyle(element).outlineStyle, shadow: getComputedStyle(element).boxShadow })); assert(focus.visible && (focus.outline !== "none" || focus.shadow !== "none"));
      await selectConversation(page); const bubbles = await messageMetrics(page); assert.equal(bubbles.length, 2); assert(bubbles.every(item => !item.overflow && !item.paragraphOverflow && item.left >= -1 && item.right <= options.width + 1)); assert(bubbles[0].width < 180); assert.equal(bubbles[0].paddingTop, 8); assert.equal(bubbles[0].paddingInlineStart, 10); await expect(page.locator(".message.assistant .message-citations")).toContainText("Synthetic knowledge source");
      if ([1440, 390].includes(options.width)) await screenshot(page, `assistant-${options.width}-${options.locale}-${options.theme}`); assert.equal(state.posts.length, 0); return { fontSize: metrics.fontSize, lineHeight: metrics.lineHeight, lifecycle, sendTarget: target, focus, bubbles, headerLogoOnlyHidden: true };
    } finally { await run.close(); }
  });
  if (!deployed) {
    for (const width of [1440, 390]) await check(`assistant-original-content-replies-history-preserved-${width}`, async () => {
      const baselineRun = await contextPage({ width, locale: "en", baseline: true }), candidateRun = await contextPage({ width, locale: "en" });
      try {
        const beforeWelcome = await baselineRun.page.locator(".welcome, .prompt-grid").allTextContents(), afterWelcome = await candidateRun.page.locator(".welcome, .prompt-grid").allTextContents(); assert.deepEqual(afterWelcome, beforeWelcome);
        await selectConversation(baselineRun.page); await selectConversation(candidateRun.page);
        assert.deepEqual(await styleFingerprint(candidateRun.page, ".message.assistant, .message.assistant .message-bubble, .message.assistant p, .message.assistant .message-time, .message.assistant .message-citations"), await styleFingerprint(baselineRun.page, ".message.assistant, .message.assistant .message-bubble, .message.assistant p, .message.assistant .message-time, .message.assistant .message-citations"));
        assert.deepEqual(await candidateRun.page.locator(".message-thread").allTextContents(), await baselineRun.page.locator(".message-thread").allTextContents());
        const controlSelector = ".assistant-redesign button, .assistant-redesign input, .assistant-redesign textarea, .assistant-header h1, .assistant-header .identity-icon img";
        const inventory = page => page.locator(controlSelector).evaluateAll(elements => elements.map(element => ({ tag: element.tagName, class: element.className, type: element.getAttribute("type"), name: element.getAttribute("name"), label: element.getAttribute("aria-label"), text: element.textContent, src: element.getAttribute("src") }))); assert.deepEqual(await inventory(candidateRun.page), await inventory(baselineRun.page));
        const oldUser = await messageMetrics(baselineRun.page), newUser = await messageMetrics(candidateRun.page); assert(newUser[0].width < oldUser[0].width); assert(newUser[0].paddingTop < oldUser[0].paddingTop); assert.deepEqual(await styleFingerprint(candidateRun.page, ".history .history-heading, .history .new-chat, .history .conversation-row, .history .autosave"), await styleFingerprint(baselineRun.page, ".history .history-heading, .history .new-chat, .history .conversation-row, .history .autosave"));
        return { welcomeTextPreserved: true, assistantReplyStylesUnchanged: true, controlInventoryUnchanged: true, historyStylesUnchanged: true, shortUserBefore: oldUser[0], shortUserAfter: newUser[0] };
      } finally { await baselineRun.close(); await candidateRun.close(); }
    });
    await check("assistant-desktop-single-submit-pending-success-and-reset", async () => {
      const run = await contextPage({ locale: "en" }), { page, state } = run;
      try {
        state.holdSend = true; const input = page.locator(textareaSelector); await input.fill("Short pending question"); await input.press("Enter"); await expect.poll(() => state.posts.filter(item => item.path.endsWith("/messages")).length).toBe(1); await expect(page.locator(".message.user.pending-message")).toBeVisible(); await expect(page.locator(".message.assistant.pending-message")).toBeVisible(); await expect(page.locator(".composer .send")).toBeDisabled(); await input.press("Enter"); assert.equal(state.posts.length, 2);
        const pending = (await messageMetrics(page, ".message.user.pending-message"))[0]; assert.equal(pending.paddingTop, 8); assert.equal(pending.paddingInlineStart, 10); assert(!pending.overflow && !pending.paragraphOverflow); await expectedRows(page, 1); await countMatches(page, "en");
        state.holdSend = false; for (const release of state.releases.splice(0)) release(); await expect(page.locator(".message.user.pending-message")).toHaveCount(0); await expect(page.locator(".message.assistant.pending-message")).toHaveCount(0); await expect(page.locator(".message.user p")).toHaveText("Short pending question"); await expect(page.locator(".message.assistant p")).toContainText("Synthetic local reply"); await expect(page.locator(".composer .send")).toBeEnabled(); await expect(input).toHaveValue(""); await expectedRows(page, 1); assert.equal(state.posts.length, 2); return { createdConversationOnce: true, postedMessageOnce: true, pendingUserCompact: pending, restoredOneLineAfterSuccess: true };
      } finally { await run.close(); }
    });
    await check("assistant-send-failure-restores-multiline-and-retry", async () => {
      const run = await contextPage({ locale: "en" }), { page, state } = run;
      try { await selectConversation(page); state.failNextSend = true; const input = page.locator(textareaSelector), value = "First failure line\nSecond failure line\nThird failure line"; await input.fill(value); await expectedRows(page, 3); await page.locator(".composer .send").click(); await expect(page.locator('.assistant-redesign > [role="alert"]')).toContainText("Synthetic chat service temporarily unavailable"); await expect(input).toHaveValue(value); await expectedRows(page, 3); await countMatches(page, "en"); await page.locator(".composer .send").click(); await expect(input).toHaveValue(""); await expect(page.locator(".message.user p").last()).toHaveText(value); await expectedRows(page, 1); assert.equal(state.posts.length, 2); return { failedDraftRestored: true, multilineHeightRestored: true, successfulRetry: true, localSendAttempts: 2 }; }
      finally { await run.close(); }
    });
    await check("assistant-conversation-drafts-history-search-and-suggestions", async () => {
      const run = await contextPage({ width: 390, locale: "en" }), { page, state } = run;
      try {
        await selectConversation(page); const input = page.locator(textareaSelector), first = "First draft line\nSecond draft line\nThird draft line"; await input.fill(first); await expectedRows(page, 3); await selectConversation(page, "qa-chat-two"); await expect(input).toHaveValue(""); await expectedRows(page, 1); await input.fill("Second chat draft\nSecond line"); await expectedRows(page, 2); await selectConversation(page); await expect(input).toHaveValue(first); await expectedRows(page, 3); await countMatches(page, "en");
        await page.reload({ waitUntil: "networkidle" }); await selectConversation(page); await expect(input).toHaveValue(first); await expectedRows(page, 3); await countMatches(page, "en");
        await page.locator(".history-toggle").click(); await page.locator("#assistant-conversation-search").fill("second"); await expect(page.locator(".history-list .conversation-row")).toHaveCount(1); await page.locator("#assistant-conversation-search").fill(""); await page.locator(".history .new-chat").click(); await expect(page.locator(".welcome-icon")).toBeVisible(); await expectedRows(page, 1); await page.locator(".prompt-grid .prompt").first().click(); assert((await input.inputValue()).length > 2); await countMatches(page, "en"); assert((await textareaMetrics(page)).height <= 72); assert.equal(state.posts.length, 0); return { independentDraftsRestored: true, restoredAfterReload: true, historySearchPreserved: true, suggestionFilledAndSized: true, networkWrites: 0 };
      } finally { await run.close(); }
    });
    await check("assistant-mobile-enter-ime-and-32000-character-limit", async () => {
      const run = await contextPage({ width: 390, locale: "en" }), { page, state } = run;
      try {
        const input = page.locator(textareaSelector); await input.fill("Mobile first"); await input.press("Enter"); await expect(input).toHaveValue("Mobile first\n"); await expectedRows(page, 2); assert.equal(state.posts.length, 0);
        await page.setViewportSize({ width: 1440, height: 1000 }); await settled(page); await input.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true, bubbles: true }); assert.equal(state.posts.length, 0); await input.fill("x"); await input.press("Enter"); assert.equal(state.posts.length, 0); assert.equal(await input.evaluate(element => element.validity.tooShort), true);
        await input.fill(""); await input.focus(); await page.keyboard.insertText("x".repeat(32010)); const value = await input.inputValue(); assert.equal(value.length, 32000); await expect(input).toHaveAttribute("maxlength", "32000"); await countMatches(page, "en"); await expectedRows(page, 3); assert.equal(state.posts.length, 0); await input.fill(""); await expectedRows(page, 1); return { mobileEnterCreatesNewline: true, composingEnterDoesNotSubmit: true, tooShortRejected: true, maximumCharacters: value.length, localWrites: 0 };
      } finally { await run.close(); }
    });
    await check("assistant-delayed-indexeddb-draft-silent-assignment-and-detached-cleanup", async () => {
      const run = await contextPage({ locale: "en" }), { page, state } = run;
      try {
        const key = `nivasafe-form-draft:v1:chat-composer:qa-chat-two:${baseSession.user.id}:${organization.id}`, value = "Delayed first\nDelayed second\nDelayed third\nDelayed fourth";
        await page.evaluate(async ({ key, value }) => {
          localStorage.removeItem(key);
          await new Promise((resolve, reject) => { const request = indexedDB.open("keyval-store"); request.onupgradeneeded = () => request.result.createObjectStore("keyval"); request.onerror = () => reject(request.error); request.onsuccess = () => { const db = request.result, tx = db.transaction("keyval", "readwrite"); tx.objectStore("keyval").put({ content: value }, key); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); }; });
          window.qaDraftInputEvents = 0; window.qaDraftGetDelayed = false; document.addEventListener("input", event => { if (event.target.matches('.assistant-redesign textarea[name="content"]')) window.qaDraftInputEvents++; }, true); document.addEventListener("change", event => { if (event.target.matches('.assistant-redesign textarea[name="content"]')) window.qaDraftInputEvents++; }, true);
          const originalGet = IDBObjectStore.prototype.get, handler = Object.getOwnPropertyDescriptor(IDBRequest.prototype, "onsuccess");
          IDBObjectStore.prototype.get = function (requestedKey) { const request = originalGet.call(this, requestedKey); if (requestedKey === key) Object.defineProperty(request, "onsuccess", { configurable: true, get() { return handler.get.call(this); }, set(callback) { handler.set.call(this, function (event) { window.qaDraftGetDelayed = true; setTimeout(() => callback.call(this, event), 500); }); } }); return request; };
        }, { key, value });
        await selectConversation(page, "qa-chat-two"); await expect.poll(() => page.evaluate(() => window.qaDraftGetDelayed)).toBe(true); await expect(page.locator(textareaSelector)).toHaveValue(""); await expectedRows(page, 1); await expect(page.locator(textareaSelector)).toHaveValue(value); await expectedRows(page, 3); await countMatches(page, "en"); assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null); assert.equal(await page.evaluate(() => window.qaDraftInputEvents), 0);
        await page.locator(textareaSelector).evaluate(element => { element.value = "Silent one\nSilent two\nSilent three\nSilent four"; }); await expectedRows(page, 3); await countMatches(page, "en"); await page.locator(textareaSelector).evaluate(element => { element.value = "x"; }); await expectedRows(page, 1); await countMatches(page, "en"); assert.equal(await page.evaluate(() => window.qaDraftInputEvents), 0);
        await page.locator(textareaSelector).evaluate(element => { window.qaDetachedComposer = element; window.qaWrappedComposerSetter = Object.getOwnPropertyDescriptor(element, "value")?.set; }); await selectConversation(page); await expect(page.locator(textareaSelector)).toHaveValue(""); await expectedRows(page, 1);
        const detached = await page.evaluate(() => { const old = window.qaDetachedComposer, active = document.querySelector('.assistant-redesign textarea[name="content"]'); const restored = Object.getOwnPropertyDescriptor(old, "value")?.set !== window.qaWrappedComposerSetter, oldHeight = old.style.height; old.value = "Detached one\nDetached two\nDetached three\nDetached four"; return { detached: !old.isConnected, setterRestored: restored, oldHeight, activeValue: active.value }; });
        await settled(page); assert(detached.detached && detached.setterRestored); await expect(page.locator(textareaSelector)).toHaveValue(""); await expectedRows(page, 1); await countMatches(page, "en"); assert.equal(state.posts.length, 0); return { indexedDbOnly: true, delayedGetMs: 500, inputOrChangeEvents: 0, silentAssignmentsResizedAndUpdatedCount: true, detachedCleanup: detached, mutationCount: 0 };
      } finally { await run.close(); }
    });
    await check("assistant-resize-recomputes-wrap-and-shrink", async () => {
      const run = await contextPage({ locale: "en" }), { page } = run;
      try { const input = page.locator(textareaSelector); await input.fill("safety ".repeat(14)); await settled(page); const wide = await textareaMetrics(page); await page.setViewportSize({ width: 390, height: 1000 }); await settled(page); await expectedRows(page, 3); const narrow = await textareaMetrics(page); assert.equal(narrow.fontSize, 16); await page.setViewportSize({ width: 1440, height: 1000 }); await settled(page); await expect.poll(async () => (await textareaMetrics(page)).height).toBe(wide.height); assert(wide.height < narrow.height); await input.fill("x"); await expectedRows(page, 1); return { wideHeight: wide.height, narrowHeight: narrow.height, shrunkAfterWidening: true }; }
      finally { await run.close(); }
    });
    await check("assistant-existing-message-history-load-error-retry", async () => {
      const run = await contextPage({ locale: "en" }), { page, state } = run;
      try { state.failNextMessages = true; await page.locator(".history .conversation-row").filter({ hasText: initialConversations[0].title }).click(); await expect(page.locator(".chat-log .alert.error")).toContainText("Synthetic message history load failure"); await page.locator(".chat-log").getByRole("button", { name: "Try again", exact: true }).click(); await expect(page.locator(".message-thread")).toBeVisible(); await expect(page.locator(".message.user p").first()).toHaveText(shortUser.content); assert.equal(state.posts.length, 0); return { existingHistoryRetryWorks: true, mutationCount: 0 }; }
      finally { await run.close(); }
    });
  }
  assert.deepEqual(pageErrors, []); assert.deepEqual(rejectedMutations, []); assert.deepEqual(unexpectedApiRequests, []); assert.deepEqual(blockedExternalRequests, []);
  assert.equal(sha(manifestFile), manifestSha256); assert.equal(sha(runtimeFile), runtimeSha256); assert.equal(sha(cssFile), manifest.cssSupplementSha256); assert.equal(sha(helper), helperSha256); assert.equal(sha(capturedIndex), runtime.indexSha256); assert.equal(sha(`${live}/index.html`), expectedIndexSha256); assert.equal(sha(planFile), planSha256); assert.equal(sha(`${work}/test-index.html`), plan.htmlSha256);
  for (const file of manifest.files) assert.equal(sha(`${work}/candidate/${file.path}`), file.sha256, `Candidate source changed ${file.path}`); for (const [relative, digest] of accessed) assert.equal(sha(`${live}/${relative}`), digest); for (const [relative, digest] of candidateInputs) assert.equal(sha(`${candidateRoot}/${relative}`), digest);
} catch (error) { fatal = error.message; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = !fatal && checks.length === (deployed ? 3 : 15) && checks.every(check => check.status === "PASS") ? "PASS" : "FAIL";
save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed, port: new URL(origin).port, productionUntouched: true }, sourceBundle: deployed ? "Published index and immutable application assets; synthetic loopback APIs only" : "Frozen candidate JS graph with all preserved production stylesheets and scoped density supplement; captured baseline bundle used for preservation comparisons", noProductionAccountOrAiCalls: true }); console.log(JSON.stringify({ status, task, total: checks.length, passed: checks.filter(check => check.status === "PASS").length, failed: checks.filter(check => check.status === "FAIL").length, fatal })); if (status !== "PASS") process.exitCode = 1;
