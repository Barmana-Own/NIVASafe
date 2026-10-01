import { expect, authenticate, test, waitForPageReady } from "./fixtures";

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
});
