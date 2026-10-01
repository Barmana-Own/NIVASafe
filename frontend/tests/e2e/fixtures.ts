import { expect, test as base, type Page, type Route } from "@playwright/test";
import { actions, activityLog, adminOverview, adminUsers, dashboard, files, fmeaRecord, fmeaReport, knowledgeDocuments, knowledgeQuota, members, notificationPreferences, notifications, profile, rulaRecord, rulaReport, rulaSuggestions, testProject, testSession } from "./testData";

export { expect };

const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

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
  if (path === "/auth/logout" || path === "/profile" || path.startsWith("/actions") || path.startsWith("/admin/") || path.startsWith("/fmea/") || path.startsWith("/rula/")) {
    if (path === "/rula/rula-e2e-1/report/action-suggestions" && method === "POST") { await json(route, { suggestions: rulaSuggestions, provider: "fallback", model: null, aiStatus: "fallback", minimum: 1 }); return; }
    if (path === "/fmea/fmea-e2e-1/report/action-suggestions" && method === "POST") { await json(route, { suggestions: fmeaReport.suggestedActions, provider: "fallback", model: null, aiStatus: "fallback", minimum: 1 }); return; }
    if (path === "/fmea/fmea-e2e-1/report/detail-suggestions" && method === "POST") { await json(route, { suggestions: [], provider: "fallback", aiStatus: "fallback", minimum: 0 }); return; }
    if (path === "/rula/rula-e2e-1/report" && method === "GET") { await json(route, rulaReport); return; }
    if (path === "/fmea/fmea-e2e-1/report" && method === "GET") { await json(route, fmeaReport); return; }
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
    await page.route("**/api/v1/**", mockApi);
    await use();
    expect(consoleErrors, `browser console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
    expect(pageErrors, `uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  }, { auto: true }],
});

export async function authenticate(page: Page, path = "/", options: { locale?: "fa" | "en"; theme?: "blue" | "white" } = {}) {
  await page.addInitScript(({ session, locale, theme }) => {
    localStorage.setItem("nivasafe-session", JSON.stringify(session));
    localStorage.setItem("nivasafe-org", "org-e2e-1");
    localStorage.setItem("nivasafe-locale", locale);
    localStorage.setItem("nivasafe-theme", theme);
    sessionStorage.removeItem("nivasafe-session");
  }, { session: testSession, locale: options.locale ?? "fa", theme: options.theme ?? "blue" });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app, main.login").first()).toBeVisible();
}

export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(100);
}
