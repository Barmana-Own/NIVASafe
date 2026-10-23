import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Observation-only baseline. Serve the exact published static application on
// an owned loopback origin, with no session and no real authentication/API calls.
const root = "C:/NIVASafe", task = "login-mobile-branding-20261023-01", live = "C:/inetpub/nivasafe/app-com", evidence = `${root}/reports/evidence/${task}`;
fs.mkdirSync(evidence, { recursive: true });
const require = createRequire(`${root}/frontend/package.json`), { chromium, expect } = require("@playwright/test");
const helper = fileURLToPath(import.meta.url), digest = bytes => createHash("sha256").update(bytes).digest("hex"), sha = file => digest(fs.readFileSync(file));
const helperSha256 = sha(helper), capturedIndex = fs.readFileSync(`${live}/index.html`), indexSha256 = digest(capturedIndex), output = `${evidence}/baseline-observations.json`;
assert(!fs.existsSync(output), "Preserve the earlier baseline before rerunning");
const allowed = new Map(), accessed = new Map();
function inventory(directory) { if (!fs.existsSync(directory)) return; for (const name of fs.readdirSync(directory)) { const file = path.join(directory, name); if (fs.statSync(file).isDirectory()) inventory(file); else allowed.set(`/${path.relative(live, file).replaceAll("\\", "/")}`, sha(file)); } }
inventory(`${live}/assets`); inventory(`${live}/brand`);
for (const name of ["favicon-white.svg", "favicon-blue.svg", "icon.svg", "icon-192.png", "icon-512.png", "manifest.webmanifest"]) if (fs.existsSync(`${live}/${name}`)) allowed.set(`/${name}`, sha(`${live}/${name}`));
const baselineSourceRoot = `${root}/.local/login-desktop-branding-20261023-01/candidate`;
const sourceInputs = ["frontend/src/features/account/AccountPages.tsx", "frontend/src/styles/account.css", "frontend/src/styles/authentication.css", "frontend/src/styles/responsive-auth.css", "frontend/src/i18n.tsx", "frontend/src/components/AuthAppearanceControls.tsx", "frontend/src/styles/login-desktop-branding.css", "frontend/public/brand/login-typography-fa-7488d145.png", "frontend/public/brand/login-typography-en-060c9cae.png"].map(relative => ({ path: `${baselineSourceRoot}/${relative}`, sha256: sha(`${baselineSourceRoot}/${relative}`) }));
const fontRoot = `${root}/frontend/tests/e2e/assets`, fontInputs = ["arabic", "latin"].map(subset => ({ path: `${fontRoot}/vazirmatn-${subset}.woff2`, sha256: sha(`${fontRoot}/vazirmatn-${subset}.woff2`) }));
const indexFile = `${evidence}/baseline-published-index.html`; fs.writeFileSync(indexFile, capturedIndex, { flag: "wx" });
const selectors = {
  main: "main.login", header: ".login-toolbar", headerBrand: ".login-toolbar-brand", headerLogo: ".login-toolbar-icon", headerLinks: ".login-toolbar-links", appearance: ".auth-appearance-controls", art: ".login-art", hero: ".login-hero-content", mobileBrand: ".login-mobile-brand", mobileLogo: ".login-mobile-brand-icon", mobileTypography: ".login-mobile-typography", mobileSubtitle: ".login-mobile-brand > span", heroTitle: ".login-art h1", visual: ".login-hero-visual", ctas: ".login-cta-row", features: ".login-features", footer: ".login-support-bar", supportCopy: ".login-support-copy", trustMarks: ".login-trust-marks", parkLogo: ".login-support-logo", enamad: ".login-enamad-link", enamadLogo: ".login-enamad-logo", form: "#login-form", formLogo: ".login-card .login-card-logo", welcome: ".login-card h2", formSubtitle: ".login-card > p.muted", identifier: "#login-identifier", password: "#login-password", remember: ".remember-me", submit: ".login-button", register: ".register-link",
};
const externalMocks = [], blockedExternalRequests = [], rejectedApiRequests = [], pageErrors = [], observations = [], screenshots = [], staticErrors = [];
let browser, browserClosed = false, serverClosed = false, fatal;
const mime = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" }, staticRoot = path.resolve(live);
const server = http.createServer((request, response) => {
  try {
    assert.equal(request.method, "GET"); const url = new URL(request.url, "http://127.0.0.1"), decoded = decodeURIComponent(url.pathname); assert(!decoded.includes("\\") && !decoded.includes("\0")); response.setHeader("cache-control", "no-store");
    if (/^\/qa\/font-(arabic|latin)\.woff2$/u.test(decoded)) { const file = `${fontRoot}/vazirmatn-${decoded.includes("arabic") ? "arabic" : "latin"}.woff2`; response.setHeader("content-type", "font/woff2"); response.end(fs.readFileSync(file)); return; }
    if (allowed.has(decoded)) { const file = path.resolve(staticRoot, `.${decoded}`); assert(file.startsWith(staticRoot + path.sep)); assert.equal(sha(file), allowed.get(decoded), "Published static input changed during baseline"); accessed.set(decoded, allowed.get(decoded)); response.setHeader("content-type", mime[path.extname(file)] ?? "application/octet-stream"); response.end(fs.readFileSync(file)); return; }
    assert(!path.extname(decoded), "Unlisted static artifact rejected"); response.setHeader("content-type", "text/html;charset=utf-8"); response.end(capturedIndex);
  } catch (error) { staticErrors.push({ path: request.url, error: error.message }); response.statusCode = 404; response.end("Not found"); }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
const fonts = ["arabic", "latin"].map(subset => `@font-face{font-family:Vazirmatn;font-style:normal;font-weight:100 900;src:url('/qa/font-${subset}.woff2') format('woff2');unicode-range:${subset === "arabic" ? "U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200F,U+FB50-FDFF,U+FE70-FEFF" : "U+0000-00FF,U+2000-206F"}}`).join("\n");
const mockSeal = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="52" viewBox="0 0 48 52"><rect width="48" height="52" fill="white"/><rect x="5" y="5" width="38" height="42" rx="4" fill="#edf4fa" stroke="#55738e"/><text x="24" y="29" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#29435a">QA seal</text></svg>';
function save(status, extra = {}) { fs.writeFileSync(output, JSON.stringify({ status, task, at: new Date().toISOString(), observationOnly: true, publishedIndexSha256: indexSha256, helperSha256, capturedIndex: indexFile, sourceInputs, fontInputs, publishedStylesheets: [...capturedIndex.toString().matchAll(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"/gu)].map(match => ({ path: match[1], sha256: allowed.get(match[1]) })), liveStaticInputs: [...accessed].map(([path, sha256]) => ({ path, sha256 })), selectors, observations, screenshots, externalMocks, blockedExternalRequests, rejectedApiRequests, pageErrors, staticErrors, realAuthenticationRequests: 0, productionMutations: 0, ...extra }, null, 2)); }
async function settled(page) { await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => undefined))); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }); }
async function observe(page, profile, stage) {
  const measurement = await page.evaluate(selectors => {
    const visible = element => { const s = getComputedStyle(element), rect = element.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && !element.closest('[hidden]'); };
    const elements = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, [...document.querySelectorAll(selector)].map(element => { const s = getComputedStyle(element), r = element.getBoundingClientRect(); return { tag: element.tagName, class: element.className, text: element.textContent?.trim(), visible: visible(element), rect: { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }, display: s.display, position: s.position, order: s.order, gap: s.gap, padding: s.padding, margin: s.margin, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, color: s.color, background: s.backgroundColor, backgroundImage: s.backgroundImage, objectFit: s.objectFit, borderRadius: s.borderRadius, whiteSpace: s.whiteSpace, direction: s.direction, ...(element instanceof HTMLImageElement ? { src: element.getAttribute("src"), alt: element.alt, naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight, complete: element.complete } : {}), ...(element instanceof HTMLAnchorElement ? { href: element.getAttribute("href"), target: element.target, rel: element.rel } : {}) }; })]));
    const controls = [...document.querySelectorAll('.login input,.login button,.login a,.login select')].map(element => ({ tag: element.tagName, type: element.getAttribute('type'), name: element.getAttribute('name'), id: element.id, class: element.className, text: element.textContent?.trim(), ariaLabel: element.getAttribute('aria-label'), autoComplete: element.getAttribute('autocomplete'), href: element.getAttribute('href'), visible: visible(element), disabled: element.hasAttribute('disabled'), checked: element instanceof HTMLInputElement ? element.checked : undefined, required: element.hasAttribute('required'), maxLength: element.getAttribute('maxlength') }));
    return { url: location.pathname + location.search + location.hash, direction: document.documentElement.dir, locale: document.documentElement.lang, theme: document.documentElement.dataset.theme, scrollX, scrollY, viewport: { width: innerWidth, height: innerHeight }, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth > innerWidth + 1 }, desktopMedia: matchMedia('(min-width:901px)').matches, activeElement: { id: document.activeElement?.id, tag: document.activeElement?.tagName }, elements, controls, formVisible: visible(document.querySelector('#login-form')), artVisible: visible(document.querySelector('.login-art')) };
  }, selectors);
  const name = `${profile.width}-${profile.locale}-${profile.theme}-${stage}`, domPath = `${evidence}/baseline-${name}.html`, screenshotPath = `${evidence}/baseline-${name}.png`;
  fs.writeFileSync(domPath, await page.locator("main.login").evaluate(element => element.outerHTML), { flag: "wx" }); await page.screenshot({ path: screenshotPath, fullPage: true });
  screenshots.push({ path: screenshotPath, sha256: sha(screenshotPath) }); observations.push({ profile, stage, ...measurement, dom: { path: domPath, sha256: sha(domPath) }, screenshot: { path: screenshotPath, sha256: sha(screenshotPath) } }); save("RUNNING");
}
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-background-networking", "--disable-component-update", "--no-default-browser-check"] });
  for (const width of [901, 1440, 1920, 320, 390, 768, 900, 812]) for (const locale of ["fa", "en"]) for (const theme of ["white", "blue"]) {
    const profile = { width, height: width === 1920 ? 1080 : width === 320 ? 568 : width === 390 ? 844 : width === 768 ? 1024 : width === 812 ? 375 : 1000, locale, theme }, context = await browser.newContext({ viewport: { width, height: profile.height }, locale: locale === "fa" ? "fa-IR" : "en-US", serviceWorkers: "block", reducedMotion: "reduce", deviceScaleFactor: 1 }), page = await context.newPage();
    page.on("pageerror", error => pageErrors.push({ profile, error: error.message }));
    await page.addInitScript(({ locale, theme }) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('nivasafe-locale', locale); localStorage.setItem('nivasafe-theme', theme); }, { locale, theme });
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname === 'fonts.googleapis.com') { externalMocks.push({ profile, kind: 'font-css', origin: url.origin }); await route.fulfill({ status: 200, contentType: 'text/css', body: fonts }); return; }
      if (url.hostname === 'trustseal.enamad.ir' && url.pathname === '/logo.aspx') { externalMocks.push({ profile, kind: 'enamad-image', note: 'Synthetic fixed48x52 SVG; external verification link never followed.' }); await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: mockSeal }); return; }
      if (url.origin !== origin) { blockedExternalRequests.push({ profile, method: request.method(), origin: url.origin, path: url.pathname }); await route.abort('blockedbyclient'); return; }
      if (url.pathname.startsWith('/api/')) { rejectedApiRequests.push({ profile, method: request.method(), path: url.pathname }); await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'QA_API_DISABLED', message: 'All authentication and business APIs are disabled in the observation baseline.' } }) }); return; }
      await route.continue();
    });
    try {
      await page.goto(`${origin}/login?next=%2Ffmea`, { waitUntil: 'networkidle' }); await expect(page.locator('main.login')).toBeVisible(); await settled(page); await observe(page, profile, 'landing');
      if (width <= 900) {
        await page.locator('.login-cta-row > a.primary').click(); await expect(page).toHaveURL(/#login-form$/u); await expect(page.locator('#login-form')).toBeVisible(); await settled(page); await observe(page, profile, 'form');
        await page.locator('.password-toggle').click(); const shown = await page.locator('#login-password').getAttribute('type'); await page.locator('.password-toggle').click(); const hidden = await page.locator('#login-password').getAttribute('type'); observations.at(-1).passwordToggle = { shown, hidden };
        await page.goBack({ waitUntil: 'networkidle' }); await settled(page); observations.at(-1).backNavigation = { url: new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash, formVisible: await page.locator('#login-form').isVisible(), artVisible: await page.locator('.login-art').isVisible() };
      }
      console.log(JSON.stringify({ status: 'OBSERVED', profile }));
    } finally { await context.close(); }
  }
  assert.equal(observations.length, 52); assert.deepEqual(pageErrors, []); assert.deepEqual(blockedExternalRequests, []); assert.deepEqual(rejectedApiRequests, []); assert.deepEqual(staticErrors, []); assert.equal(sha(`${live}/index.html`), indexSha256); assert.equal(sha(helper), helperSha256); for (const [relative, hash] of accessed) assert.equal(sha(`${live}${relative}`), hash); for (const file of [...sourceInputs, ...fontInputs]) assert.equal(sha(file.path), file.sha256);
} catch (error) { fatal = error.stack; }
finally { if (browser) { await browser.close(); browserClosed = true; } await new Promise(resolve => server.close(resolve)); serverClosed = true; }
const status = fatal ? 'FAIL' : 'PASS'; save(status, { fatal, cleanup: { browserClosed, ownedServerClosed: serverClosed }, productFilesChanged: false, acceptanceTestsImplemented: false }); console.log(JSON.stringify({ status, observations: observations.length, screenshots: screenshots.length, fatal })); if (fatal) process.exitCode = 1;
