import { expect, authenticate, test, waitForPageReady } from "./fixtures";
import { collectOverflowReport, formatOverflowReport } from "./overflow";

type Viewport = { width: number; height: number };

const phoneAndDesktop: Viewport[] = [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
];

const criticalViewports: Viewport[] = [
  { width: 320, height: 640 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 480, height: 900 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const allRoutes = [
  ["login", "/login", false],
  ["register", "/register", false],
  ["dashboard", "/", true],
  ["projects", "/projects", true],
  ["choose-path", "/choose-path", true],
  ["fmea-list", "/fmea", true],
  ["fmea-register", "/fmea?edit=fmea-e2e-1&step=2", true],
  ["fmea-report", "/fmea/fmea-e2e-1/report", true],
  ["rula-list", "/rula", true],
  ["rula-analysis", "/rula?edit=rula-e2e-1&step=2", true],
  ["rula-report", "/rula/rula-e2e-1/report", true],
  ["actions", "/actions", true],
  ["files", "/files", true],
  ["knowledge", "/knowledge", true],
  ["assistant", "/assistant", true],
  ["notifications", "/notifications", true],
  ["members", "/members", true],
  ["admin", "/admin", true],
  ["organizations", "/organizations", true],
  ["activity-log", "/activity-log", true],
  ["profile", "/profile", true],
  ["health", "/health", true],
] as const;

const criticalRoutes = [
  ["login", "/login", false],
  ["dashboard", "/", true],
  ["fmea-report", "/fmea/fmea-e2e-1/report", true],
  ["rula-report", "/rula/rula-e2e-1/report", true],
  ["admin", "/admin", true],
  ["activity-log", "/activity-log", true],
] as const;

async function check(page: Parameters<typeof authenticate>[0], label: string) {
  const report = await collectOverflowReport(page);
  const unexpectedPhoneScroll = report.phoneScrollers.filter((item) => item.scrollWidth > item.clientWidth + 2);
  expect([...report.pageOverflow, ...report.viewportEscapes, ...unexpectedPhoneScroll], formatOverflowReport(label, report)).toEqual([]);
}

async function openRoute(page: Parameters<typeof authenticate>[0], path: string, authenticated: boolean, viewport: Viewport) {
  await page.setViewportSize(viewport);
  if (authenticated) await authenticate(page, path);
  else {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
  }
  await waitForPageReady(page);
}

test.describe("@overflow page-level horizontal overflow invariants", () => {
  for (const [name, path, authenticated] of allRoutes) {
    for (const viewport of phoneAndDesktop) {
      test(`${name}-${viewport.width}`, async ({ page }) => {
        await openRoute(page, path, authenticated, viewport);
        await check(page, `${name} ${viewport.width}x${viewport.height}`);
      });
    }
  }

  for (const [name, path, authenticated] of criticalRoutes) {
    for (const viewport of criticalViewports) {
      test(`${name}-critical-${viewport.width}x${viewport.height}`, async ({ page }) => {
        await openRoute(page, path, authenticated, viewport);
        await check(page, `${name} ${viewport.width}x${viewport.height}`);
      });
    }
  }
});

test.describe("@overflow dynamic states", () => {
  test("keeps the mobile drawer and portalized utility menus inside the viewport", async ({ page }) => {
    await openRoute(page, "/", true, { width: 390, height: 844 });
    await page.locator(".mobile-menu").click();
    await page.waitForTimeout(350);
    await check(page, "mobile drawer open");

    await page.locator("#app-sidebar [data-testid='theme-switcher'] .theme-trigger").click();
    await check(page, "mobile drawer theme menu open");
    await page.keyboard.press("Escape");
    if (!(await page.locator("#app-sidebar").evaluate((element) => element.classList.contains("open")))) {
      await page.locator(".mobile-menu").click();
      await page.waitForTimeout(350);
    }
    await page.locator("#app-sidebar [data-testid='language-switcher']").click();
    await check(page, "mobile drawer language menu open");
    await page.keyboard.press("Escape");
    if (await page.locator("#app-sidebar").evaluate((element) => element.classList.contains("open"))) {
      await page.locator(".sidebar-backdrop").click();
    }
    await page.waitForTimeout(350);
    await check(page, "mobile drawer closed");
  });

  test("keeps selects, dialogs, validation errors and file preview viewport-safe", async ({ page }) => {
    await openRoute(page, "/fmea/fmea-e2e-1/report", true, { width: 390, height: 844 });
    const select = page.locator(".fmea-report-table-toolbar [role=combobox]").first();
    await select.focus();
    await page.keyboard.press("Enter");
    await check(page, "portalized StyledSelect open");
    await page.keyboard.press("Escape");

    await page.locator(".fmea-report-data-table .report-table-actions button").first().click();
    await check(page, "FMEA detail dialog open");
    await page.locator(".fmea-report-dialog-actions button").first().click();

    await page.goto("/login#login-form", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    await page.locator(".login-button").click();
    await check(page, "login validation error");

    await authenticate(page, "/files");
    await page.locator(".file-card .file-actions button").first().click();
    await check(page, "file preview dialog open");
    await page.locator(".file-preview-dialog .modal-close").click();
    await check(page, "file preview dialog closed");
  });

  test("keeps expanded activity and report details inside the viewport", async ({ page }) => {
    await openRoute(page, "/activity-log", true, { width: 390, height: 844 });
    await page.locator(".activity-log-table tbody tr:not(.activity-log-detail-row) .text-button").first().click();
    await check(page, "activity-log metadata expanded");

    await authenticate(page, "/fmea/fmea-e2e-1/report");
    const fmeaDetails = page.locator(".fmea-report-page details").first();
    if (await fmeaDetails.count()) {
      const summary = fmeaDetails.locator("summary").first();
      if (!(await fmeaDetails.getAttribute("open"))) await summary.click();
      await check(page, "FMEA long details expanded");
    }

    await authenticate(page, "/rula/rula-e2e-1/report");
    const rulaDetails = page.locator(".rula-report-data-section details").first();
    if (await rulaDetails.count()) {
      const summary = rulaDetails.locator("summary").first();
      if (!(await rulaDetails.getAttribute("open"))) await summary.click();
      await check(page, "RULA report details expanded");
    }
  });

  test("keeps RTL/LTR and theme changes within the viewport", async ({ page }) => {
    await openRoute(page, "/rula/rula-e2e-1/report", true, { width: 390, height: 844 });
    await page.locator(".mobile-menu").click();
    await page.locator("#app-sidebar [data-testid='language-switcher']").click();
    await page.getByRole("menuitemradio", { name: /English|انگلیسی/i }).click();
    await check(page, "English RTL-to-LTR switch");

    await page.locator("#app-sidebar [data-testid='theme-switcher'] .theme-trigger").click();
    await page.locator("[data-theme-option='white']").click();
    await check(page, "English white theme");
  });
});
