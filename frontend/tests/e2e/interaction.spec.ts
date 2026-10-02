import { expect, authenticate, test, waitForPageReady } from "./fixtures";
import { files } from "./testData";

declare global {
  interface Window {
    __previewObjectUrls?: { created: string[]; revoked: string[] };
  }
}

const pdfPreviewFixture = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF", "ascii");

async function trackPreviewObjectUrls(page: Parameters<typeof authenticate>[0]) {
  await page.addInitScript(() => {
    const state = { created: [] as string[], revoked: [] as string[] };
    Object.defineProperty(window, "__previewObjectUrls", { value: state });
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (value) => {
      const url = create(value);
      state.created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      state.revoked.push(url);
      revoke(url);
    };
  });
}

async function readTrackedObjectUrls(page: Parameters<typeof authenticate>[0]) {
  return page.evaluate(() => {
    const state = window.__previewObjectUrls;
    if (!state) throw new Error("Preview object URL tracking was not initialized");
    return state;
  });
}

async function mockPreviewFiles(page: Parameters<typeof authenticate>[0], videoBytes?: Buffer) {
  const previewFiles = [
    ...files,
    { id: "file-preview-pdf-e2e", originalName: "گزارش-آزمایشی.pdf", mimeType: "application/pdf", size: pdfPreviewFixture.length, kind: "DOCUMENT", createdAt: "2026-01-16T10:45:00.000Z" },
    ...(videoBytes ? [{ id: "file-preview-video-e2e", originalName: "ویدئوی-آزمایشی.webm", mimeType: "video/webm", size: videoBytes.length, kind: "VIDEO", createdAt: "2026-01-16T10:45:00.000Z" }] : []),
  ];

  await page.route("**/api/v1/files", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: previewFiles }) });
  });
  await page.route("**/api/v1/files/file-preview-pdf-e2e/download", (route) => route.fulfill({ status: 200, contentType: "application/pdf", body: pdfPreviewFixture }));
  if (videoBytes) {
    await page.route("**/api/v1/files/file-preview-video-e2e/download", (route) => route.fulfill({ status: 200, contentType: "video/webm", body: videoBytes }));
  }
}

test.describe("responsive shell and critical interactions", () => {
  test("opens, closes and restores focus for the mobile sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page);

    const trigger = page.locator(".mobile-menu");
    await trigger.click();
    await expect(page.locator("#app-sidebar.open")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#app-sidebar.open")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("switches theme and language from the authenticated shell", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await authenticate(page);

    await page.locator('.topbar [data-testid="theme-switcher"] .theme-trigger').click();
    await page.locator('[data-theme-option="white"]').click();
    await expect(page.locator('.app[data-theme="white"]')).toBeVisible();

    await page.locator('.topbar [data-testid="language-switcher"]').click();
    await page.getByRole("menuitemradio", { name: /English|انگلیسی/i }).click();
    await expect(page.locator('html[dir="ltr"][lang="en"]')).toHaveCount(1);
  });

  test("supports keyboard selection in a portalized StyledSelect", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/fmea/fmea-e2e-1/report");
    await expect(page.locator(".fmea-report-table-wrap")).toBeVisible();

    const select = page.locator(".fmea-report-table-toolbar [role=combobox]").first();
    await select.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".styled-select-menu")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(select).toHaveAttribute("aria-expanded", "false");
  });

  test("opens and cancels the shared file confirmation dialog with focus return", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/files");
    await expect(page.locator(".file-card")).toBeVisible();

    const deleteButton = page.locator(".file-card .file-actions button").last();
    await deleteButton.click();
    const dialog = page.locator(".app-dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator(".dialog-actions button").first().click();
    await expect(dialog).toHaveCount(0);
    await expect(deleteButton).toBeFocused();
  });

  test("traps dialog focus, locks background scrolling and restores focus on Escape", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await authenticate(page, "/files");
    await expect(page.locator(".file-card")).toBeVisible();

    const deleteButton = page.locator(".file-card .file-actions button").last();
    const initialOverflow = await page.evaluate(() => ({ body: document.body.style.overflow, root: document.documentElement.style.overflow }));
    await deleteButton.click();
    const dialog = page.locator(".app-dialog");
    await expect(dialog).toBeVisible();
    await expect.poll(() => page.evaluate(() => ({ body: document.body.style.overflow, root: document.documentElement.style.overflow }))).toEqual({ body: "hidden", root: "hidden" });

    await page.keyboard.press("Tab");
    await expect(dialog.locator(".modal-close")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator(".dialog-actions button").last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(deleteButton).toBeFocused();
    await expect.poll(() => page.evaluate(() => ({ body: document.body.style.overflow, root: document.documentElement.style.overflow }))).toEqual(initialOverflow);
  });

  test("shows localized required-field validation on login", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login#login-form", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);

    await page.locator(".login-button").click();
    await expect(page.locator("#login-identifier")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".login-card .field-error").first()).toBeVisible();
  });

  test("keeps FMEA report operations usable in the mobile card view", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/fmea/fmea-e2e-1/report");
    await waitForPageReady(page);

    await expect(page.locator(".fmea-report-data-table")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth);
    expect(overflow).toBe(true);

    const viewButton = page.locator(".fmea-report-data-table .report-table-actions button").first();
    await viewButton.click();
    await expect(page.locator(".fmea-report-dialog")).toBeVisible();
    await page.locator(".fmea-report-dialog-actions button").first().click();
    await expect(page.locator(".fmea-report-dialog")).toHaveCount(0);
  });

  test("switches RULA side and saves a manual posture edit", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/rula/rula-e2e-1/report");
    await expect(page.locator(".rula-report-view")).toBeVisible();

    const sideTabs = page.locator(".rula-report-side-tabs [role=tab]");
    await expect(sideTabs).toHaveCount(2);
    await sideTabs.nth(1).click();
    await expect(sideTabs.nth(1)).toHaveAttribute("aria-selected", "true");

    await page.locator(".rula-report-data-table .report-table-actions > .icon-button").first().click();
    await expect(page).toHaveURL(/\/rula\?edit=rula-e2e-1&step=2&part=/);
    const dialog = page.locator(".rula-edit-dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator(".rula-edit-actions button").last().click();
    await expect(dialog).toHaveCount(0);
  });

  test("uses the same compact report download button styling as FMEA", async ({ page }) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });

      await authenticate(page, "/fmea/fmea-e2e-1/report");
      const fmeaPdf = page.locator(".fmea-report-page .page-header .page-actions-inline > button").filter({ hasText: "دانلود PDF" });
      await expect(fmeaPdf).toBeVisible();
      const fmeaGeometry = await fmeaPdf.evaluate((button) => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return { width: rect.width, height: rect.height, fontSize: style.fontSize, padding: style.padding, radius: style.borderRadius };
      });

      await authenticate(page, "/rula/rula-e2e-1/report");
      const rulaPdf = page.locator(".rula-report-page .page-header .page-actions-inline > button").filter({ hasText: "دانلود PDF" });
      await expect(rulaPdf).toBeVisible();
      await expect(page.locator(".rula-report-page .page-title-block h2")).toHaveText("نتیجه ارزیابی RULA");
      const rulaGeometry = await rulaPdf.evaluate((button) => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return { width: rect.width, height: rect.height, fontSize: style.fontSize, padding: style.padding, radius: style.borderRadius };
      });

      expect(rulaGeometry, `RULA/FMEA report button geometry at ${width}px`).toEqual(fmeaGeometry);
      expect(rulaGeometry.height).toBe(44);
    }
  });

  test("shows RULA-specific stage-three results and updates recommendation selection progress", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/rula?edit=rula-e2e-1&step=3");

    const overview = page.getByTestId("rula-assessment-overview");
    await expect(overview).toBeVisible();
    await expect(overview.getByText("خلاصه مدیریتی ارزیابی RULA")).toBeVisible();
    await expect(overview.getByText("توزیع سطح اثر عوامل RULA")).toBeVisible();
    await expect(overview.getByText("پیشرفت انتخاب اقدامات اصلاحی")).toBeVisible();
    await expect(overview.getByTestId("rula-factor-impact-chart").locator("svg circle.rula-overview-donut-segment").first()).toBeVisible();

    const selectionProgress = overview.getByTestId("rula-suggestion-selection-progress");
    await expect(selectionProgress).toBeVisible();
    await expect(selectionProgress).toHaveAttribute("aria-valuenow", "0");
    await expect.poll(() => selectionProgress.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("conic-gradient");
    const selectSuggestion = page.locator(".rula-correction-table .rula-correction-toggle").first();
    await expect(selectSuggestion).toBeVisible();
    await selectSuggestion.click();
    await expect(selectionProgress).toHaveAttribute("aria-valuenow", "1");
    await expect.poll(() => selectionProgress.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("conic-gradient");

    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
      const hasNoPageOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
        && document.body.scrollWidth <= window.innerWidth + 1,
      );
      expect(hasNoPageOverflow, `RULA stage 3 overflow at ${width}px`).toBe(true);
    }
  });

  test("renders the admin user data view without page-level horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/admin");
    await expect(page.locator(".admin-user-table")).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth);
    expect(overflow).toBe(true);
    await expect(page.getByText("اپراتور با نام طولانی برای جدول کاربران").first()).toBeVisible();
  });

  test("opens and closes the in-app file preview overlay", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/files");
    await expect(page.locator(".file-card")).toBeVisible();

    await page.locator(".file-card .file-actions button").first().click();
    const preview = page.locator(".file-preview-dialog");
    await expect(preview).toBeVisible();
    await expect(preview.locator("img")).toBeVisible();
    await preview.locator(".modal-close").click();
    await expect(preview).toHaveCount(0);
  });

  test("previews a local PDF fixture and revokes its object URL on close", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockPreviewFiles(page);
    await trackPreviewObjectUrls(page);
    await authenticate(page, "/files");
    await expect(page.locator(".file-card")).toHaveCount(2);

    const before = (await readTrackedObjectUrls(page)).created.length;
    await page.locator('.file-card').filter({ hasText: "گزارش-آزمایشی.pdf" }).locator(".file-actions button").first().click();
    const preview = page.locator(".file-preview-dialog");
    await expect(preview).toBeVisible();
    await expect(preview.locator('.file-preview-pdf object[type="application/pdf"]')).toBeVisible();
    const created = (await readTrackedObjectUrls(page)).created;
    expect(created.length).toBeGreaterThan(before);
    const previewUrl = created.at(-1);
    expect(previewUrl).toMatch(/^blob:/);

    await preview.locator(".modal-close").click();
    await expect(preview).toHaveCount(0);
    await expect.poll(async () => (await readTrackedObjectUrls(page)).revoked).toContain(previewUrl);
  });

  test("previews a generated local WebM fixture and revokes its object URL on close", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const videoData = await page.evaluate(async () => {
      if (!("MediaRecorder" in window) || !HTMLCanvasElement.prototype.captureStream) {
        throw new Error("Chromium MediaRecorder/canvas capture is required for the local video preview fixture");
      }
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 48;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D context is unavailable for the local video preview fixture");
      context.fillStyle = "#2878b8";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const stream = canvas.captureStream(0);
      const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
      const chunks: Blob[] = [];
      let resolveFirstChunk: (() => void) | undefined;
      const firstChunk = new Promise<void>((resolve, reject) => {
        resolveFirstChunk = resolve;
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
            resolveFirstChunk?.();
          }
        });
        recorder.addEventListener("error", (event) => reject(event), { once: true });
      });
      const stopped = new Promise<void>((resolve) => recorder.addEventListener("stop", () => resolve(), { once: true }));
      recorder.start();
      for (let frame = 0; frame < 8; frame += 1) {
        context.fillStyle = frame % 2 === 0 ? "#2878b8" : "#e69d32";
        context.fillRect(0, 0, canvas.width, canvas.height);
        track.requestFrame();
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      recorder.requestData();
      let mediaTimeout: number | undefined;
      try {
        await Promise.race([firstChunk, new Promise<never>((_, reject) => {
          mediaTimeout = window.setTimeout(() => reject(new Error("Chromium did not emit a local WebM media chunk")), 5000);
        })]);
      } finally {
        if (mediaTimeout !== undefined) window.clearTimeout(mediaTimeout);
      }
      recorder.stop();
      await stopped;
      for (const track of stream.getTracks()) track.stop();
      const bytes = new Uint8Array(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    });
    const videoBytes = Buffer.from(videoData, "base64");
    expect(videoBytes.byteLength).toBeGreaterThan(0);
    await mockPreviewFiles(page, videoBytes);
    await trackPreviewObjectUrls(page);
    await authenticate(page, "/files");
    await expect(page.locator(".file-card")).toHaveCount(3);

    const before = (await readTrackedObjectUrls(page)).created.length;
    await page.locator('.file-card').filter({ hasText: "ویدئوی-آزمایشی.webm" }).locator(".file-actions button").first().click();
    const preview = page.locator(".file-preview-dialog");
    await expect(preview).toBeVisible();
    const video = preview.locator(".file-preview-video video");
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute("src", /^blob:/);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState), { timeout: 5000 }).toBeGreaterThanOrEqual(1);
    const created = (await readTrackedObjectUrls(page)).created;
    expect(created.length).toBeGreaterThan(before);
    const previewUrl = created.at(-1);
    expect(previewUrl).toMatch(/^blob:/);

    await preview.locator(".modal-close").click();
    await expect(preview).toHaveCount(0);
    await expect.poll(async () => (await readTrackedObjectUrls(page)).revoked).toContain(previewUrl);
  });
});
