import { authenticate, expect, test, waitForPageReady } from "./fixtures";
import { collectTouchTargetFindings, collectTouchTargetFindingsAcrossScrollableRegions, formatTouchTargetFindings } from "./touch-targets";

const viewportWidths = [320, 360, 390, 430, 480, 768, 1024, 1280, 1440, 1920];
const criticalRoutes = [
  { name: "dashboard", path: "/" },
  { name: "fmea report", path: "/fmea/fmea-e2e-1/report" },
  { name: "rula report", path: "/rula/rula-e2e-1/report" },
  { name: "admin", path: "/admin" },
  { name: "files", path: "/files" },
  { name: "fmea process", path: "/fmea?edit=fmea-e2e-1&step=1" },
  { name: "rula analysis", path: "/rula?edit=rula-e2e-1&step=2" },
];

for (const route of criticalRoutes) {
  for (const width of viewportWidths) {
    test(`keeps ${route.name} actionable controls at least 44px at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await authenticate(page, route.path);
      const findings = await collectTouchTargetFindings(page);
      expect(findings, `${route.path} at ${width}px\n${formatTouchTargetFindings(findings)}`).toEqual([]);
    });
  }
}

const directionThemeMatrix = [
  { name: "Persian blue", locale: "fa" as const, theme: "blue" as const, width: 390 },
  { name: "Persian white", locale: "fa" as const, theme: "white" as const, width: 768 },
  { name: "English blue", locale: "en" as const, theme: "blue" as const, width: 390 },
  { name: "English white", locale: "en" as const, theme: "white" as const, width: 1280 },
];

for (const scenario of directionThemeMatrix) {
  for (const route of [
    { name: "dashboard", path: "/" },
    { name: "RULA report", path: "/rula/rula-e2e-1/report" },
  ]) {
    test(`keeps ${route.name} targets accessible in ${scenario.name}`, async ({ page }) => {
      await page.setViewportSize({ width: scenario.width, height: scenario.width < 768 ? 844 : 900 });
      await authenticate(page, route.path, { locale: scenario.locale, theme: scenario.theme });
      await expect(page.locator("html")).toHaveAttribute("dir", scenario.locale === "fa" ? "rtl" : "ltr");
      await expect(page.locator(".app").first()).toHaveAttribute("data-theme", scenario.theme);
      const findings = await collectTouchTargetFindings(page);
      expect(findings, `${route.path} in ${scenario.name}\n${formatTouchTargetFindings(findings)}`).toEqual([]);
    });
  }
}

test.describe("touch target audit interaction states", () => {
  test("covers FMEA AI controls, risk-row trigger, report toggle, select menu and dialog", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/fmea?edit=fmea-e2e-1&step=1");

    const jobInput = page.locator(".fmea-job-search input").first();
    await expect(jobInput).toBeVisible();
    await jobInput.fill("مونتاژ");
    await page.locator(".fmea-suggestion-ai-button").click();
    await expect(page.locator(".fmea-suggestion-ai-button")).toBeEnabled();
    await page.locator(".fmea-description-ai").click();
    await expect(page.locator(".fmea-description-suggestion-actions > button").first()).toBeVisible();
    let findings = await collectTouchTargetFindings(page);
    expect(findings, formatTouchTargetFindings(findings)).toEqual([]);

    const fmeaDataResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/fmea") && response.request().method() === "GET");
    await page.goto("/fmea?edit=fmea-e2e-1&step=2", { waitUntil: "domcontentloaded" });
    await fmeaDataResponse;
    await waitForPageReady(page);
    const addRiskTrigger = page.locator(".fmea-add-risk-row-trigger");
    await expect(addRiskTrigger).toBeVisible();
    await expect(page.locator(".fmea-stage-two-review .assessment-report-table").first()).toBeVisible();
    await addRiskTrigger.click();
    await expect(page.locator(".fmea-risk-ai-assist")).toBeVisible();
    const riskAiButton = page.locator(".fmea-risk-ai-head > button");
    await expect(riskAiButton).toBeEnabled();
    const manualRiskResponse = page.waitForResponse((response) => response.url().includes("/api/v1/fmea/process-suggestions") && response.request().method() === "POST" && Boolean(response.request().postData()?.includes('"mode":"risk-row"')));
    await riskAiButton.click();
    await manualRiskResponse;
    await expect(page.locator(".fmea-risk-ai-suggestion").first()).toBeVisible();
    const riskAiToggle = page.locator(".fmea-risk-ai-toggle").first();
    await expect(riskAiToggle).toBeVisible();
    await riskAiToggle.click();
    await expect(riskAiToggle).toHaveAttribute("aria-expanded", "true");
    findings = await collectTouchTargetFindings(page);
    expect(findings, formatTouchTargetFindings(findings)).toEqual([]);

    await page.setExtraHTTPHeaders({ "x-e2e-touch-targets": "fmea-report-expanded" });
    await authenticate(page, "/fmea/fmea-e2e-1/report");
    const reportToggle = page.locator(".report-list-toggle").first();
    await expect(reportToggle).toBeVisible();
    await reportToggle.click();
    const selectTrigger = page.locator(".fmea-report-table-toolbar [role=combobox]").first();
    await selectTrigger.click();
    await expect(page.locator(".styled-select-menu")).toBeVisible();
    findings = await collectTouchTargetFindings(page);
    expect(findings, formatTouchTargetFindings(findings)).toEqual([]);
    await page.keyboard.press("Escape");
    const reportAction = page.locator(".fmea-report-data-table .report-table-actions button").first();
    await reportAction.click();
    await expect(page.locator(".fmea-report-dialog")).toBeVisible();
    findings = await collectTouchTargetFindings(page);
    expect(findings, formatTouchTargetFindings(findings)).toEqual([]);
  });

  test("covers RULA RIGHT/LEFT tabs, correction actions and manual-edit dialog", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/rula/rula-e2e-1/report");
    const tabs = page.locator(".rula-report-side-tabs [role=tab]");
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toBeVisible();
    await expect(tabs.nth(1)).toBeVisible();
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".rula-correction-toggle").first()).toBeVisible();
    await page.locator(".rula-correction-toggle").first().click();
    let findings = await collectTouchTargetFindings(page);
    expect(findings, formatTouchTargetFindings(findings)).toEqual([]);

    await page.locator(".rula-report-data-table .report-table-actions > .icon-button").first().click();
    await expect(page.locator(".rula-edit-dialog")).toBeVisible();
    findings = await collectTouchTargetFindings(page);
    expect(findings, formatTouchTargetFindings(findings)).toEqual([]);
  });

  test("covers mobile navigation, dashboard customization and theme menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/");
    await page.locator(".mobile-menu").click();
    await expect(page.locator("#app-sidebar.open")).toBeVisible();
    let findings = await collectTouchTargetFindings(page);
    expect(findings, formatTouchTargetFindings(findings)).toEqual([]);
    findings = await collectTouchTargetFindingsAcrossScrollableRegions(page);
    expect(findings, formatTouchTargetFindings(findings)).toEqual([]);
    await page.keyboard.press("Escape");

    const customize = page.locator('[data-scroll-target="#dashboard-layout-controls"]').first();
    await customize.click();
    await expect(page.locator("#dashboard-layout-controls")).toBeVisible();
    findings = await collectTouchTargetFindings(page);
    expect(findings, formatTouchTargetFindings(findings)).toEqual([]);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('.topbar [data-testid="theme-switcher"] .theme-trigger').click();
    await expect(page.locator(".theme-options-menu")).toBeVisible();
    findings = await collectTouchTargetFindings(page);
    expect(findings, formatTouchTargetFindings(findings)).toEqual([]);
  });
});
