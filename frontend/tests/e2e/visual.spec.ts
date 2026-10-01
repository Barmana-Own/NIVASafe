import { expect, authenticate, test, waitForPageReady } from "./fixtures";

const phoneWidths = [320, 360, 390, 430, 480];
const shellWidths = [390, 768, 1280, 1920];
const reportWidths = [320, 390, 430, 768, 1280];

async function capture(page: Parameters<typeof authenticate>[0], name: string, width: number, height: number, path: string, options: { locale?: "fa" | "en"; theme?: "blue" | "white" } = {}) {
  await page.setViewportSize({ width, height });
  await authenticate(page, path, options);
  await waitForPageReady(page);
  await expect(page).toHaveScreenshot(`${name}-${width}.png`, { fullPage: true });
}

test.describe("@visual deterministic responsive surfaces", () => {
  for (const width of phoneWidths) {
    test(`login-${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot(`login-${width}.png`, { fullPage: true });
    });
  }

  for (const width of [768, 1024, 1280, 1440, 1920]) {
    test(`login-desktop-${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await expect(page).toHaveScreenshot(`login-${width}.png`, { fullPage: true });
    });
  }

  test("register-phone-390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot("register-390.png", { fullPage: true });
  });

  test("register-desktop-1280", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot("register-1280.png", { fullPage: true });
  });

  for (const width of shellWidths) {
    test(`dashboard-${width}`, async ({ page }) => {
      await capture(page, "dashboard", width, width < 500 ? 844 : 900, "/");
    });
  }

  for (const width of reportWidths) {
    test(`fmea-report-${width}`, async ({ page }) => {
      await capture(page, "fmea-report", width, width < 500 ? 900 : 1000, "/fmea/fmea-e2e-1/report");
    });
    test(`rula-report-${width}`, async ({ page }) => {
      await capture(page, "rula-report", width, width < 500 ? 900 : 1000, "/rula/rula-e2e-1/report");
    });
  }

  for (const [name, path] of [["admin", "/admin"], ["actions", "/actions"], ["files", "/files"], ["activity-log", "/activity-log"]] as const) {
    test(`${name}-phone-390`, async ({ page }) => {
      await capture(page, name, 390, 900, path);
    });
    test(`${name}-desktop-1280`, async ({ page }) => {
      await capture(page, name, 1280, 900, path);
    });
  }

  test("rula-report-english-white-1280", async ({ page }) => {
    await capture(page, "rula-report-en-white", 1280, 1000, "/rula/rula-e2e-1/report", { locale: "en", theme: "white" });
  });

  test("fmea-report-english-white-390", async ({ page }) => {
    await capture(page, "fmea-report-en-white", 390, 900, "/fmea/fmea-e2e-1/report", { locale: "en", theme: "white" });
  });
});
