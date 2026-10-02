import { expect, test as base, type Locator, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { actions, activityLog, adminOverview, adminUsers, dashboard, files, fmeaRecord, fmeaReport, knowledgeDocuments, knowledgeQuota, members, notificationPreferences, notifications, profile, rulaRecord, rulaReport, rulaSuggestions, testProject, testSession } from "./testData";

export { expect };

const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const vazirmatnFonts = {
  arabic: readFileSync(new URL("./assets/vazirmatn-arabic.woff2", import.meta.url)),
  latin: readFileSync(new URL("./assets/vazirmatn-latin.woff2", import.meta.url)),
};
const vazirmatnWeights = [400, 500, 600, 700, 800, 900] as const;
const vazirmatnSubsets = [
  {
    name: "arabic",
    url: "https://fonts.gstatic.com/s/vazirmatn/v16/Dxxo8j6PP2D_kU2muijlGMWWMmk.woff2",
    unicodeRange: "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC4, U+10EFC-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1",
  },
  {
    name: "latin",
    url: "https://fonts.gstatic.com/s/vazirmatn/v16/Dxxo8j6PP2D_kU2muijlHcWW.woff2",
    unicodeRange: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
] as const;
const vazirmatnTestStylesheet = vazirmatnSubsets.flatMap(({ url, unicodeRange }) =>
  vazirmatnWeights.map((weight) => `@font-face { font-family: "Vazirmatn"; font-style: normal; font-weight: ${weight}; font-display: swap; src: url("${url}") format("woff2"); unicode-range: ${unicodeRange}; }`),
).join("\n");
const expandedFmeaReport = (() => {
  const extraItems = [5, 6].map((rowNumber) => ({ ...fmeaReport.items[0], id: `fmea-item-touch-audit-${rowNumber}`, rowNumber, failureMode: `حالت خرابی ${rowNumber}: داده مصنوعی برای آزمون کنترل فهرست پیشنهادها` }));
  const items = [...fmeaReport.items, ...extraItems];
  return { ...fmeaReport, summary: { ...fmeaReport.summary, totalFailureModes: items.length }, items, topFailureModes: items };
})();

function apiPath(route: Route) {
  const url = new URL(route.request().url());
  const marker = "/api/v1";
  const index = url.pathname.indexOf(marker);
  return index >= 0 ? url.pathname.slice(index + marker.length) || "/" : url.pathname;
}

async function json(route: Route, data: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ data }) });
}

async function mockApi(route: Route) {
  const request = route.request();
  const method = request.method();
  const path = apiPath(route);

  if (path.endsWith("/download")) {
    await route.fulfill({ status: 200, contentType: "image/png", body: onePixelPng });
    return;
  }
  if (path === "/auth/login" && method === "POST") { await json(route, testSession); return; }
  if (path === "/profile" && method === "GET") { await json(route, profile); return; }
  if (path === "/actions" && method === "GET") { await json(route, actions); return; }
  if (path === "/members" && method === "GET") { await json(route, members); return; }
  if (path === "/knowledge" && method === "GET") { await json(route, knowledgeDocuments); return; }
  if (path === "/knowledge/quota" && method === "GET") { await json(route, knowledgeQuota); return; }
  if (path === "/notifications/preferences" && method === "GET") { await json(route, notificationPreferences); return; }
  if (path === "/processes" && method === "GET") { await json(route, [{ id: "process-e2e-1", projectId: testProject.id, name: "فرایند مونتاژ تجهیزات ایمنی" }]); return; }
  if (path === "/activities" && method === "GET") { await json(route, [{ id: "activity-e2e-1", projectId: testProject.id, processId: "process-e2e-1", title: "فعالیت مونتاژ و کنترل نهایی", location: "سالن تولید" }]); return; }
  if (path === "/fmea/process-suggestions" && method === "POST") {
    let mode = "suggestions";
    try {
      mode = String(JSON.parse(request.postData() ?? "{}").mode ?? mode);
    } catch {
      mode = "suggestions";
    }
    await json(route, {
      aiStatus: "fallback",
      provider: "fallback",
      model: null,
      databaseSuggestions: { equipment: [], materials: [], controls: [] },
      aiSuggestions: {
        equipment: ["تجهیزات کنترل‌شده با نام طولانی برای آزمون", "ابزار مونتاژ ایمن", "تجهیزات پایش نهایی", "تجهیزات پشتیبان چهارم"],
        materials: ["مواد اولیه استاندارد", "مواد بسته‌بندی ایمن", "مواد مصرفی کنترل‌شده", "مواد جایگزین چهارم"],
        controls: ["کنترل کیفیت مرحله‌ای", "بازبینی دستورالعمل", "آموزش اپراتور", "کنترل مستندات چهارم"],
      },
      descriptionSuggestion: mode === "description" ? "شرح فعالیت مونتاژ و کنترل نهایی تجهیزات ایمنی با رعایت دستورالعمل‌های مصوب." : undefined,
      riskSuggestions: mode === "risk-row" ? {
        failureModes: ["خرابی نمونه پیشنهادی اول", "خرابی نمونه پیشنهادی دوم", "خرابی نمونه پیشنهادی سوم", "خرابی نمونه پیشنهادی چهارم", "خرابی نمونه پیشنهادی پنجم", "خرابی نمونه پیشنهادی ششم"],
        effects: [],
        causes: [],
        preventiveControls: [],
        detectionControls: [],
        recommendations: [],
      } : undefined,
      scoreSuggestion: mode === "risk-row" ? { severity: 4, occurrence: 3, detection: 2, rationale: "داده ساختگی برای بررسی کنترل اندازه تعاملی." } : undefined,
      riskRows: [],
    });
    return;
  }
  if (path === "/auth/logout" || path === "/profile" || path.startsWith("/actions") || path.startsWith("/admin/") || path.startsWith("/fmea/") || path.startsWith("/rula/")) {
    if (path === "/rula/rula-e2e-1/report/action-suggestions" && method === "POST") { await json(route, { suggestions: rulaSuggestions, provider: "fallback", model: null, aiStatus: "fallback", minimum: 1 }); return; }
    if (path === "/fmea/fmea-e2e-1/report/action-suggestions" && method === "POST") { await json(route, { suggestions: fmeaReport.suggestedActions, provider: "fallback", model: null, aiStatus: "fallback", minimum: 1 }); return; }
    if (path === "/fmea/fmea-e2e-1/report/detail-suggestions" && method === "POST") { await json(route, { suggestions: [], provider: "fallback", aiStatus: "fallback", minimum: 0 }); return; }
    if (path === "/rula/rula-e2e-1/report" && method === "GET") { await json(route, rulaReport); return; }
    if (path === "/fmea/fmea-e2e-1/report" && method === "GET") { await json(route, request.headers()["x-e2e-touch-targets"] === "fmea-report-expanded" ? expandedFmeaReport : fmeaReport); return; }
    if (path === "/rula/posture-analysis" && method === "POST") { await json(route, { sides: { RIGHT: rulaRecord.postureAnalysis.sideAnalyses.RIGHT, LEFT: rulaRecord.postureAnalysis.sideAnalyses.LEFT }, notes: "Synthetic analysis", provider: "fallback", aiStatus: "fallback" }); return; }
    if (path === "/rula/posture-image-analysis" && method === "POST") { await json(route, { sides: { RIGHT: rulaRecord.postureAnalysis.sideAnalyses.RIGHT, LEFT: rulaRecord.postureAnalysis.sideAnalyses.LEFT }, notes: "Synthetic image analysis", provider: "fallback", aiStatus: "fallback" }); return; }
    if (path.startsWith("/fmea/job-catalog")) { await json(route, []); return; }
    if (path === "/rula/rula-e2e-1/history" || path === "/fmea/fmea-e2e-1/history") { await json(route, [{ id: "version-e2e-1", version: 1, createdAt: "2026-01-16T10:45:00.000Z" }]); return; }
    if (method !== "GET") { await json(route, { id: "e2e-created" }); return; }
  }
  if (path === "/dashboard") { await json(route, dashboard); return; }
  if (path === "/notifications") { await json(route, notifications); return; }
  if (path.startsWith("/activity-log")) { await json(route, activityLog); return; }
  if (path === "/projects") { await json(route, [testProject]); return; }
  if (path === "/fmea") { await json(route, [fmeaRecord]); return; }
  if (path === "/rula") { await json(route, [rulaRecord]); return; }
  if (path === "/files") { await json(route, files); return; }
  if (path === "/reports/registered") { await json(route, [{ id: rulaRecord.id, type: "RULA", title: rulaRecord.title, code: "RULA-E2E-01", projectName: testProject.name, projectCode: testProject.code, finalizedAt: rulaRecord.updatedAt }]); return; }
  if (path === "/admin/overview") { await json(route, adminOverview); return; }
  if (path.startsWith("/admin/member-requests")) { await json(route, []); return; }
  if (path.startsWith("/admin/users")) { await json(route, adminUsers); return; }
  if (path.startsWith("/admin/ai-usage")) { await json(route, { users: adminUsers.map((user) => ({ userId: user.id, displayName: user.displayName, username: user.username, email: user.email, active: user.active, requestCount: 12, inputTokens: 1200, outputTokens: 800, totalTokens: 2000 })), totals: { requestCount: 24, inputTokens: 2400, outputTokens: 1600, totalTokens: 4000 } }); return; }
  if (path === "/health") { await json(route, { status: "ready", database: "ready", redis: "ready", storage: "ready", ai: "ready" }); return; }
  if (path === "/organizations/current") { await json(route, { id: "org-e2e-1", nameFa: "سازمان آزمایشی ایمنی", nameEn: "Synthetic Safety Organization", active: true, subscriptionStatus: "ACTIVE" }); return; }
  if (path === "/organizations") { await json(route, [{ id: "org-e2e-1", nameFa: "سازمان آزمایشی ایمنی", nameEn: "Synthetic Safety Organization", active: true, subscriptionStatus: "ACTIVE" }]); return; }
  if (path === "/members") { await json(route, []); return; }
  if (path === "/ai/providers") { await json(route, []); return; }
  if (method !== "GET") { await json(route, { id: "e2e-created" }); return; }
  await json(route, []);
}

export const test = base.extend<{ apiMocks: void }>({
  apiMocks: [async ({ page }, use) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("https://fonts.googleapis.com/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/css2" && url.searchParams.get("family")?.startsWith("Vazirmatn:")) {
        await route.fulfill({ status: 200, contentType: "text/css; charset=utf-8", headers: { "access-control-allow-origin": "*" }, body: vazirmatnTestStylesheet });
        return;
      }
      await route.continue();
    });
    await page.route("https://fonts.gstatic.com/s/vazirmatn/v16/**", async (route) => {
      const url = new URL(route.request().url());
      const subset = vazirmatnSubsets.find(({ url: fontUrl }) => new URL(fontUrl).pathname === url.pathname);
      if (!subset) {
        await route.continue();
        return;
      }
      await route.fulfill({ status: 200, contentType: "font/woff2", headers: { "access-control-allow-origin": "*", "cache-control": "public, max-age=31536000" }, body: vazirmatnFonts[subset.name] });
    });
    await page.route("**/api/v1/**", mockApi);
    await use();
    expect(consoleErrors, `browser console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
    expect(pageErrors, `uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  }, { auto: true }],
});

export async function authenticate(page: Page, path = "/", options: { locale?: "fa" | "en"; theme?: "blue" | "white"; waitForReady?: boolean } = {}) {
  await page.addInitScript(({ session, locale, theme }) => {
    localStorage.setItem("nivasafe-session", JSON.stringify(session));
    localStorage.setItem("nivasafe-org", "org-e2e-1");
    localStorage.setItem("nivasafe-locale", locale);
    localStorage.setItem("nivasafe-theme", theme);
    sessionStorage.removeItem("nivasafe-session");
  }, { session: testSession, locale: options.locale ?? "fa", theme: options.theme ?? "blue" });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  if (options.waitForReady !== false) await waitForPageReady(page, { expectedRoute: path });
}

export type PageReadinessOptions = {
  expectedRoute?: string;
  expectedContent?: Locator;
  expectedDescription?: string;
  timeoutMs?: number;
  stableFrames?: number;
};

const readinessBudgetMs = 12_000;
const readinessDiagnosticBudgetMs = 500;
const readinessLoaders = [
  ".page-loading-screen",
  ".workspace .loading-state",
  ".workspace .spinner",
  ".workspace [aria-busy='true']:not(button):not(input):not([role='button'])",
  "main.login [aria-busy='true']:not(button):not(input):not([role='button'])",
].join(",");

function routePath(url: string) {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}

function pageContentLocator(page: Page, expectedRoute: string) {
  const path = new URL(expectedRoute, page.url()).pathname;
  if (path === "/login" || path === "/register" || path === "/forgot-password" || path === "/reset-password" || path === "/accept-invitation") {
    return page.locator("main.login h1:visible, main.login h2:visible, main.login h3:visible").first();
  }
  return page.locator(".workspace .page-title-block h2:visible, .workspace .state h1:visible, .workspace .state h2:visible, .workspace .state h3:visible, main:not(.login) h1:visible, main:not(.login) h2:visible, main:not(.login) h3:visible").first();
}

function pageContentDescription(page: Page, expectedRoute: string) {
  const path = routePath(new URL(expectedRoute, page.url()).toString());
  return `visible page heading at ${path}`;
}

async function readinessDiagnostics(page: Page, phase: string, expected: string, lastGeometry: unknown) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let detail: unknown = null;
  try {
    detail = await Promise.race([
      page.evaluate((loaderSelector) => {
        const visible = (element: Element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        };
        const geometryRoot = document.querySelector<HTMLElement>(".workspace, main.login, main");
        const rect = geometryRoot?.getBoundingClientRect();
        return {
          readyState: document.readyState,
          fonts: "fonts" in document ? document.fonts.status : "unsupported",
          visibleLoaders: Array.from(document.querySelectorAll(loaderSelector)).filter(visible).map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === "string" ? element.className : "",
            label: (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 120),
          })),
          visibleImages: Array.from(document.images).filter(visible).map((image) => ({
            src: image.currentSrc || image.getAttribute("src") || image.getAttribute("srcset") || `(no source; alt=${image.alt || "unnamed"})`,
            complete: image.complete,
            width: image.naturalWidth,
            height: image.naturalHeight,
          })),
          geometry: geometryRoot && rect ? {
            left: Math.round(rect.left * 100) / 100,
            top: Math.round(rect.top * 100) / 100,
            width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100,
            scrollWidth: geometryRoot.scrollWidth,
            scrollHeight: geometryRoot.scrollHeight,
            documentWidth: document.documentElement.scrollWidth,
            documentHeight: document.documentElement.scrollHeight,
          } : null,
        };
      }, readinessLoaders),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), readinessDiagnosticBudgetMs); }),
    ]);
  } catch {
    detail = null;
  } finally {
    if (timer) clearTimeout(timer);
  }
  const diagnosticGeometry = (detail as { geometry?: unknown } | null)?.geometry;
  return `Page readiness failed: route=${page.url()}; expected=${expected}; phase=${phase}; lastGeometry=${JSON.stringify(lastGeometry ?? diagnosticGeometry ?? null)}; diagnostics=${JSON.stringify(detail)}`;
}

async function withTimeout<T>(promise: Promise<T>, timeout: number, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} did not settle before the readiness deadline`)), timeout); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function waitForPageReady(page: Page, options: PageReadinessOptions = {}) {
  const budget = options.timeoutMs ?? readinessBudgetMs;
  const deadline = Date.now() + budget;
  const expectedRoute = options.expectedRoute ? routePath(new URL(options.expectedRoute, page.url()).toString()) : routePath(page.url());
  const expectedContent = options.expectedContent ?? pageContentLocator(page, expectedRoute);
  const expectedDescription = options.expectedDescription ?? pageContentDescription(page, expectedRoute);
  const stableFrames = options.stableFrames ?? 3;
  let phase = "document readiness";
  let lastGeometry: unknown = null;

  const remaining = () => Math.max(1, deadline - Date.now());
  const runPhase = async <T>(name: string, operation: (timeout: number) => Promise<T>): Promise<T> => {
    phase = name;
    const timeout = remaining();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation(timeout),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`exceeded the ${budget}ms readiness budget`)), timeout);
        }),
      ]);
    } catch (error) {
      throw new Error(await readinessDiagnostics(page, phase, expectedDescription, lastGeometry) + `; cause=${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  await runPhase("document readiness", (timeout) => page.waitForFunction(() => document.readyState !== "loading", undefined, { timeout, polling: "raf" }));
  await runPhase("expected route", (timeout) => page.waitForFunction((route) => `${location.pathname}${location.search}` === route, expectedRoute, { timeout, polling: "raf" }));
  await runPhase("expected route content", async (timeout) => {
    await expect(expectedContent).toBeVisible({ timeout });
    const content = await expectedContent.evaluate((element) => (element.textContent || element.getAttribute("aria-label") || element.getAttribute("alt") || "").trim());
    if (!content) throw new Error("expected content is visible but has no accessible text");
  });
  await runPhase("application loaders and busy regions", (timeout) => page.waitForFunction((selector) => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    return Array.from(document.querySelectorAll(selector)).every((element) => !visible(element));
  }, readinessLoaders, { timeout, polling: "raf" }));
  await runPhase("initial font readiness", (timeout) => withTimeout(page.evaluate(async () => {
      if ("fonts" in document) await document.fonts.ready;
    }), timeout, "document.fonts.ready"));
  await runPhase("visible image completion and decode", async (timeout) => {
    await page.waitForFunction(() => {
      const visible = (image: HTMLImageElement) => {
        const style = getComputedStyle(image);
        const rect = image.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      return Array.from(document.images).filter(visible).every((image) => image.complete);
    }, undefined, { timeout, polling: "raf" });
    const failedImages = await page.evaluate(async () => {
      const visible = (image: HTMLImageElement) => {
        const style = getComputedStyle(image);
        const rect = image.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const images = Array.from(document.images).filter(visible);
      const decoded = await Promise.all(images.map(async (image) => {
        try {
          await image.decode();
          return image.naturalWidth > 0 && image.naturalHeight > 0 ? null : image.currentSrc || image.getAttribute("src") || image.getAttribute("srcset") || `(no source; alt=${image.alt || "unnamed"})`;
        } catch {
          return image.currentSrc || image.getAttribute("src") || image.getAttribute("srcset") || `(no source; alt=${image.alt || "unnamed"})`;
        }
      }));
      return decoded.filter((src): src is string => Boolean(src));
    });
    if (failedImages.length) throw new Error(`visible images failed to decode: ${failedImages.join(", ")}`);
  });
  await runPhase("post-render font readiness", (timeout) => withTimeout(page.evaluate(async () => {
      if ("fonts" in document) await document.fonts.ready;
    }), timeout, "post-render document.fonts.ready"));
  await runPhase("settled layout geometry", async (timeout) => {
    const geometry = await withTimeout(page.evaluate(async ({ stableFrames: requiredStableFrames, maximumFrames }) => {
        const isVisible = (element: Element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        };
        const main = document.querySelector<HTMLElement>(".workspace, main.login, main");
        if (!main) return { stable: false, reason: "main content container is missing", last: null };
        let previous = "";
        let consecutive = 0;
        let last: unknown = null;
        for (let frame = 0; frame < maximumFrames; frame += 1) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const rect = main.getBoundingClientRect();
          const overlays = Array.from(document.querySelectorAll<HTMLElement>("[role='dialog'], [role='listbox']")).filter(isVisible).map((element) => {
            const bounds = element.getBoundingClientRect();
            return [Math.round(bounds.left * 100) / 100, Math.round(bounds.top * 100) / 100, Math.round(bounds.width * 100) / 100, Math.round(bounds.height * 100) / 100];
          });
          const activeLoaders = Array.from(document.querySelectorAll(
            ".page-loading-screen, .workspace .loading-state, .workspace .spinner, .workspace [aria-busy='true']:not(button):not(input):not([role='button']), main.login [aria-busy='true']:not(button):not(input):not([role='button'])",
          )).filter(isVisible).length;
          const current = {
            rect: [Math.round(rect.left * 100) / 100, Math.round(rect.top * 100) / 100, Math.round(rect.width * 100) / 100, Math.round(rect.height * 100) / 100],
            scroll: [main.scrollWidth, main.scrollHeight, document.documentElement.scrollWidth, document.documentElement.scrollHeight],
            textLength: (main.innerText || "").trim().length,
            overlays,
            activeLoaders,
          };
          last = current;
          const serialized = JSON.stringify(current);
          if (serialized === previous && activeLoaders === 0) consecutive += 1;
          else consecutive = 0;
          previous = serialized;
          if (consecutive >= requiredStableFrames) return { stable: true, reason: null, last };
        }
        return { stable: false, reason: `geometry did not remain stable for ${requiredStableFrames + 1} consecutive animation frames`, last };
      }, { stableFrames, maximumFrames: 90 }), timeout, "layout geometry");
    lastGeometry = geometry.last;
    if (!geometry.stable) throw new Error(geometry.reason ?? "layout geometry remained unstable");
  });
  await runPhase("route consistency", async () => {
    const actualRoute = routePath(page.url());
    if (actualRoute !== expectedRoute) throw new Error(`route changed while waiting: expected ${expectedRoute}, got ${actualRoute}`);
  });
}

export async function waitForElementMotionToSettle(page: Page, selector: string, timeoutMs = 5_000) {
  await page.waitForFunction((targetSelector) => {
    const element = document.querySelector(targetSelector);
    return Boolean(element) && element!.getAnimations().every((animation) => animation.playState !== "running");
  }, selector, { timeout: timeoutMs, polling: "raf" });
}
