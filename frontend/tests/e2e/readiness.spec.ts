import { expect, authenticate, test, waitForPageReady } from "./fixtures";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

test.describe("bounded route readiness", () => {
  test("does not become ready while route data is still loading", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const requestStarted = deferred<void>();
    const releaseResponse = deferred<void>();
    await page.route("**/api/v1/dashboard", async (route) => {
      requestStarted.resolve();
      await releaseResponse.promise;
      await route.fallback();
    });

    await authenticate(page, "/", { waitForReady: false });
    const ready = waitForPageReady(page, { expectedRoute: "/" });
    let finished = false;
    void ready.finally(() => { finished = true; }).catch(() => undefined);
    await requestStarted.promise;
    await expect(page.locator(".workspace .loading-state")).toBeVisible();
    expect(finished).toBe(false);

    releaseResponse.resolve();
    await ready;
    await expect(page.locator(".dashboard-widgets .kpi-card").first()).toBeVisible();
    expect(finished).toBe(true);
  });

  test("waits for delayed file image content and verifies it decodes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const requestStarted = deferred<void>();
    const releaseResponse = deferred<void>();
    await page.route("**/api/v1/files/file-e2e-1/download", async (route) => {
      requestStarted.resolve();
      await releaseResponse.promise;
      await route.fallback();
    });

    await authenticate(page, "/files", { waitForReady: false });
    await expect(page.locator(".file-card")).toBeVisible();
    await page.locator(".file-card .file-actions button").first().click();
    const ready = waitForPageReady(page, {
      expectedRoute: "/files",
      expectedContent: page.locator(".file-preview-dialog img"),
      expectedDescription: "file preview image",
    });
    let finished = false;
    void ready.finally(() => { finished = true; }).catch(() => undefined);
    await requestStarted.promise;
    expect(finished).toBe(false);
    releaseResponse.resolve();
    await ready;

    const dimensions = await page.locator(".file-preview-dialog img").evaluate((image: HTMLImageElement) => ({ width: image.naturalWidth, height: image.naturalHeight }));
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
    expect(finished).toBe(true);
  });

  test("reports a bounded stuck-loader failure with route and geometry diagnostics", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const requestStarted = deferred<void>();
    const releaseResponse = deferred<void>();
    await page.route("**/api/v1/dashboard", async (route) => {
      requestStarted.resolve();
      await releaseResponse.promise;
      await route.fallback();
    });

    await authenticate(page, "/", { waitForReady: false });
    await requestStarted.promise;
    const readiness = waitForPageReady(page, { expectedRoute: "/", timeoutMs: 800 });
    const failure = await readiness.then(() => "unexpected readiness success", (error: Error) => error.message);
    expect(failure).toContain("route=http://127.0.0.1:5043/");
    expect(failure).toContain("expected=visible page heading at /");
    expect(failure).toContain("phase=application loaders and busy regions");
    expect(failure).toContain("loading-state");
    expect(failure).toContain("lastGeometry=");

    releaseResponse.resolve();
    await expect(page.locator(".dashboard-widgets .kpi-card").first()).toBeVisible();
  });

  test("uses the local fixture font before declaring the page ready", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/login");
    const fontState = await page.evaluate(() => ({
      status: document.fonts.status,
      loaded: document.fonts.check('400 16px "Vazirmatn"'),
    }));
    expect(fontState).toEqual({ status: "loaded", loaded: true });
  });

  test("waits for the expected SPA route rather than a document load event", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/");
    const navigation = page.locator('.quick-actions a[href="/fmea"]').click();
    const readiness = waitForPageReady(page, { expectedRoute: "/fmea" });
    await Promise.all([navigation, readiness]);
    await expect(page).toHaveURL(/\/fmea$/);
    await expect(page.locator(".workspace .page-title-block h2")).toBeVisible();
  });

  test("rejects a visible image without a usable source instead of silently accepting it", async ({ page }) => {
    await page.setContent('<main class="workspace"><h2>Image source readiness test</h2><img width="24" height="24" alt="Missing source test image"></main>');
    const failure = await waitForPageReady(page, {
      expectedRoute: page.url(),
      expectedContent: page.getByRole("heading", { name: "Image source readiness test" }),
      expectedDescription: "image source fixture",
    }).then(() => "unexpected readiness success", (error: Error) => error.message);
    expect(failure).toContain("phase=visible image completion and decode");
    expect(failure).toContain("(no source; alt=Missing source test image)");
  });

});
