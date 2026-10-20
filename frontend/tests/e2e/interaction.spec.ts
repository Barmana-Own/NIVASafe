import { expect, authenticate, test, waitForPageReady } from "./fixtures";
import { files } from "./testData";

declare global {
  interface Window {
    __previewObjectUrls?: {
      created: string[];
      revoked: string[];
      opened: Array<{ url: string; target: string; features: string; contentType: string | null }>;
      expire: () => void;
    };
  }
}

const pdfPreviewFixture = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF", "ascii");

async function trackPreviewObjectUrls(page: Parameters<typeof authenticate>[0], options: { interceptOpen?: boolean } = {}) {
  await page.addInitScript(({ interceptOpen }) => {
    const expirations: Array<() => void> = [];
    const contentTypes = new Map<string, string>();
    const state = {
      created: [] as string[],
      revoked: [] as string[],
      opened: [] as Array<{ url: string; target: string; features: string; contentType: string | null }>,
      expire: () => expirations.splice(0).forEach((callback) => callback()),
    };
    Object.defineProperty(window, "__previewObjectUrls", { value: state });
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (value) => {
      const url = create(value);
      state.created.push(url);
      contentTypes.set(url, value.type);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      state.revoked.push(url);
      revoke(url);
    };
    const open = window.open.bind(window);
    window.open = ((url?: string | URL | null, target?: string, features?: string) => {
      const normalizedUrl = String(url ?? "");
      state.opened.push({ url: normalizedUrl, target: target ?? "", features: features ?? "", contentType: contentTypes.get(normalizedUrl) ?? null });
      return interceptOpen ? null : open(url, target, features);
    }) as typeof window.open;
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (timeout === 60_000 && typeof handler === "function" && handler.toString().includes("revokeObjectURL")) {
        expirations.push(() => handler(...args));
        return 0;
      }
      return schedule(handler, timeout, ...args);
    }) as typeof window.setTimeout;
  }, options);
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
    await page.setViewportSize({ width: 1280, height: 800 });
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
    await expect.poll(() => page.evaluate(() => ({ body: document.body.style.overflow, root: document.documentElement.style.overflow }))).toEqual({ body: "hidden", root: initialOverflow.root });

    await expect(dialog.locator(".dialog-actions button").first()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.locator(".dialog-actions button").last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.locator(".dialog-actions button").first()).toBeFocused();
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

    const firstRow = page.locator(".fmea-report-page .rm-row").first();
    await expect(firstRow).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth);
    expect(overflow).toBe(true);

    await firstRow.click();
    const details = page.locator("dialog.rm-detail[open]");
    await expect(details).toBeVisible();
    await expect(details.locator(".rm-header h3")).toHaveText("جزئیات ریسک");
    await expect(details).toContainText("RPN");
    await details.locator(".rm-header button").click();
    await expect(page.locator("dialog.rm-detail[open]")).toHaveCount(0);
  });

  test("opens left-side RULA details and saves a manual posture edit", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/rula/rula-e2e-1/report");
    await expect(page.locator(".rula-report-view")).toBeVisible();

    const sideTabs = page.locator(".rula-report-side-tabs [role=tab]");
    await expect(sideTabs).toHaveCount(2);
    await sideTabs.nth(1).click();
    await expect(sideTabs.nth(1)).toHaveAttribute("aria-selected", "true");

    const leftRow = page.locator('[data-rula-report-side="LEFT"] .rm-row[data-mobile-row-id^="upperArm"]').first();
    await expect(leftRow).toBeVisible();
    await leftRow.click();
    const details = page.locator('.rm-modal [role="dialog"]');
    await expect(details).toBeVisible();
    await expect(details.locator(".rm-body-side")).toHaveText("سمت چپ");
    await expect(details.locator(".rm-metrics strong").first()).toHaveText("۳");

    await details.locator(".rm-detail-footer .rm-buttons button").first().click();
    const dialog = page.locator('.rula-evaluation-row-dialog[role="dialog"]');
    await expect(dialog).toBeVisible();
    const score = dialog.locator("label").filter({ hasText: "امتیاز پیشنهادی" }).locator("input");
    await expect(score).toHaveValue("3");
    await score.fill("5");

    const patchResponse = page.waitForResponse(response => response.request().method() === "PATCH" && new URL(response.url()).pathname === "/api/v1/rula/rula-e2e-1");
    const reportRefresh = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === "/api/v1/rula/rula-e2e-1/report");
    await dialog.getByRole("button", { name: "ذخیره" }).click();
    const patch = await patchResponse;
    const savedAnalysis = (await patch.json()).data?.postureAnalysis;
    expect(savedAnalysis.sideAnalyses.LEFT.upperArm.score).toBe(5);
    await reportRefresh;
    await expect(dialog).toHaveCount(0);
    await expect(leftRow.locator(".rm-score")).toHaveText("۵");
    await expect(page.locator('[data-rula-report-side="RIGHT"] .rm-row[data-mobile-row-id^="upperArm"] .rm-score')).toHaveText("۴");
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

    const overview = page.getByTestId("rula-stage-three-overview");
    await expect(overview).toBeVisible();
    await expect(overview.getByText("توزیع سطح ریسک ارزیابی RULA")).toBeVisible();
    await expect(overview.getByText("پیشرفت اقدامات اصلاحی")).toBeVisible();
    await expect(overview.locator(".rula-overview-distribution-panel .fmea-risk-donut-svg")).toBeVisible();
    await expect(overview.locator(".report-action-progress")).toBeVisible();

    const selectedActions = page.locator(".rula-selected-actions-preview");
    await expect(selectedActions).toBeVisible();
    await expect(selectedActions).toContainText("برای مشاهده اثر اصلاحی، یک اقدام پیشنهادی را انتخاب کنید.");
    const selectSuggestion = page.locator(".rula-corrections-section .compact-assessment-mobile .rm-row").first();
    await expect(selectSuggestion).toBeVisible();
    await selectSuggestion.scrollIntoViewIfNeeded();
    await selectSuggestion.click();
    const suggestionDialog = page.locator("dialog.rm-detail");
    await expect(suggestionDialog).toBeVisible();
    await suggestionDialog.getByRole("button", { name: "افزودن به جدول ارزیابی RULA" }).click();
    await expect(selectedActions.locator(":scope > div")).toHaveCount(1);

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
    await expect(page.locator(".admin-user-card").first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.body.clientWidth);
    expect(overflow).toBe(true);
    await expect(page.getByText("اپراتور با نام طولانی برای جدول کاربران").first()).toBeVisible();
  });

  test("opens image previews in an isolated tab and expires their object URL", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await trackPreviewObjectUrls(page);
    await authenticate(page, "/files");
    await expect(page.locator(".file-card")).toBeVisible();

    const popupPromise = page.waitForEvent("popup");
    await page.locator(".file-card .file-actions button").first().click();
    const preview = await popupPromise;
    await expect(preview).toHaveURL(/^blob:/);
    await expect.poll(() => preview.evaluate(() => document.contentType)).toBe("image/png");
    const url = (await readTrackedObjectUrls(page)).created.at(-1);
    expect(url).toMatch(/^blob:/);
    expect((await readTrackedObjectUrls(page)).revoked).not.toContain(url);

    await page.evaluate(() => window.__previewObjectUrls?.expire());
    await expect.poll(async () => (await readTrackedObjectUrls(page)).revoked).toContain(url);
    await preview.close();
  });

  test("previews a local PDF fixture in an isolated tab and expires its object URL", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockPreviewFiles(page);
    await trackPreviewObjectUrls(page, { interceptOpen: true });
    await authenticate(page, "/files");
    await expect(page.locator(".file-card")).toHaveCount(2);

    const before = (await readTrackedObjectUrls(page)).created.length;
    await page.locator('.file-card').filter({ hasText: "گزارش-آزمایشی.pdf" }).locator(".file-actions button").first().click();
    const created = (await readTrackedObjectUrls(page)).created;
    expect(created.length).toBeGreaterThan(before);
    const previewUrl = created.at(-1);
    expect(previewUrl).toMatch(/^blob:/);
    expect((await readTrackedObjectUrls(page)).opened.at(-1)).toEqual({
      url: previewUrl,
      target: "_blank",
      features: "noopener,noreferrer",
      contentType: "application/pdf",
    });

    expect((await readTrackedObjectUrls(page)).revoked).not.toContain(previewUrl);
    await page.evaluate(() => window.__previewObjectUrls?.expire());
    await expect.poll(async () => (await readTrackedObjectUrls(page)).revoked).toContain(previewUrl);
  });

  test("previews a generated local WebM fixture in an isolated tab and expires its object URL", async ({ page }) => {
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
    const popupPromise = page.waitForEvent("popup");
    await page.locator('.file-card').filter({ hasText: "ویدئوی-آزمایشی.webm" }).locator(".file-actions button").first().click();
    const preview = await popupPromise;
    await expect(preview).toHaveURL(/^blob:/);
    await expect.poll(() => preview.evaluate(() => document.contentType)).toBe("video/webm");
    const created = (await readTrackedObjectUrls(page)).created;
    expect(created.length).toBeGreaterThan(before);
    const previewUrl = created.at(-1);
    expect(previewUrl).toMatch(/^blob:/);

    expect((await readTrackedObjectUrls(page)).revoked).not.toContain(previewUrl);
    await page.evaluate(() => window.__previewObjectUrls?.expire());
    await expect.poll(async () => (await readTrackedObjectUrls(page)).revoked).toContain(previewUrl);
    await preview.close();
  });

  test("keeps the reply confirmation visible while refreshing support requests", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/support");
    await page.getByRole("button", { name: /مشاهده و ادامه گفتگو/ }).click();
    await page.getByRole("textbox", { name: "پاسخ شما" }).fill("پیام ساختگی برای آزمون تایید ارسال پاسخ");
    await page.getByRole("button", { name: "ارسال پاسخ" }).click();
    await expect(page.locator(".support-thread-panel .alert.success[role=status]")).toContainText("پاسخ در پرونده ثبت شد.");
  });

  test("shows the default AI allowance and confirms an admin quota update", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/admin");
    await page.getByRole("tab", { name: /هوش مصنوعی/ }).click();
    const firstUser = page.getByRole("row", { name: /کاربر آزمون ریسپانسیو/ });
    await expect(firstUser.getByRole("checkbox", { name: /دسترسی هوش مصنوعی/ })).toBeChecked();
    const limit = firstUser.getByRole("textbox", { name: /سقف توکن/ });
    await expect(limit).toHaveValue("1000000");
    await limit.fill("1250000");
    await firstUser.getByRole("button", { name: /ذخیره: کاربر آزمون ریسپانسیو/ }).click();
    await expect(page.getByRole("status")).toContainText("سهمیه هوش مصنوعی به‌روزرسانی شد.");
    await expect(limit).toHaveValue("1250000");
  });

  test("renders the notification inbox with the summary response shape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticate(page, "/notifications");
    await expect(page.getByRole("heading", { name: "اعلان‌ها" })).toBeVisible();
    await expect(page.getByText("نتیجه ارزیابی آماده است")).toBeVisible();
  });
});
