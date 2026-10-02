import { expect, authenticate, test, waitForPageReady } from "./fixtures";

const phoneWidths = [320, 360, 390, 430, 480];
const shellWidths = [390, 768, 1280, 1920];
const reportWidths = [320, 390, 430, 768, 1280];

async function capture(page: Parameters<typeof authenticate>[0], name: string, width: number, height: number, path: string, options: { locale?: "fa" | "en"; theme?: "blue" | "white" } = {}) {
  await page.setViewportSize({ width, height });
  await page.clock.setFixedTime(new Date("2026-01-16T10:45:00.000Z"));
  await authenticate(page, path, options);
  await expect(page).toHaveScreenshot(`${name}-${width}.png`, { fullPage: true });
}

async function openPublicPage(page: Parameters<typeof authenticate>[0], path: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.clock.setFixedTime(new Date("2026-01-16T10:45:00.000Z"));
  await page.addInitScript(() => {
    localStorage.setItem("nivasafe-locale", "fa");
    localStorage.setItem("nivasafe-theme", "blue");
  });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await waitForPageReady(page, { expectedRoute: path });
}

test.describe("@visual deterministic responsive surfaces", () => {
  for (const width of phoneWidths) {
    test(`login-${width}`, async ({ page }) => {
      await openPublicPage(page, "/login", width, 844);
      await expect(page).toHaveScreenshot(`login-${width}.png`, { fullPage: true });
    });
  }

  for (const width of [768, 1024, 1280, 1440, 1920]) {
    test(`login-desktop-${width}`, async ({ page }) => {
      await openPublicPage(page, "/login", width, 900);
      await expect(page).toHaveScreenshot(`login-${width}.png`, { fullPage: true });
    });
  }

  test("register-phone-390", async ({ page }) => {
    await openPublicPage(page, "/register", 390, 844);
    await expect(page).toHaveScreenshot("register-390.png", { fullPage: true });
  });

  test("register-desktop-1280", async ({ page }) => {
    await openPublicPage(page, "/register", 1280, 900);
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

  test.describe("@new-route-coverage", () => {
    for (const [name, path] of [
      ["fmea-list", "/fmea?view=registered"],
      ["fmea-editor", "/fmea?edit=fmea-e2e-1"],
      ["rula-list", "/rula?view=results"],
      ["rula-editor", "/rula?edit=rula-e2e-1"],
      ["knowledge", "/knowledge"],
      ["notifications", "/notifications"],
      ["members", "/members"],
      ["profile", "/profile"],
    ] as const) {
      test(`${name}-phone-390`, async ({ page }) => {
        await capture(page, name, 390, 900, path);
      });
      test(`${name}-desktop-1280`, async ({ page }) => {
        await capture(page, name, 1280, 900, path);
      });
    }
  });

  test("rula-report-english-white-1280", async ({ page }) => {
    await capture(page, "rula-report-en-white", 1280, 1000, "/rula/rula-e2e-1/report", { locale: "en", theme: "white" });
  });

  test("rula-stage-three-phone-390", async ({ page }) => {
    await capture(page, "rula-stage-three", 390, 900, "/rula?edit=rula-e2e-1&step=3");
  });

  test("rula-stage-three-desktop-1280", async ({ page }) => {
    await capture(page, "rula-stage-three", 1280, 900, "/rula?edit=rula-e2e-1&step=3");
  });

  test("fmea-report-english-white-390", async ({ page }) => {
    await capture(page, "fmea-report-en-white", 390, 900, "/fmea/fmea-e2e-1/report", { locale: "en", theme: "white" });
  });
});
