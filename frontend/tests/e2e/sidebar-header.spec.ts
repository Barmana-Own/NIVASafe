import { authenticate, expect, test } from "./fixtures";

const desktopWidths = [1024, 1280, 1440, 1920];

for (const locale of ["fa", "en"] as const) {
  test(`sidebar branding and account controls stay usable in ${locale} at desktop widths`, async ({ page }, testInfo) => {
    await page.addInitScript(() => localStorage.setItem("nivasafe-sidebar-collapsed", "true"));
    await authenticate(page, "/", { locale });

    for (const width of desktopWidths) {
      await page.setViewportSize({ width, height: 900 });
      const app = page.locator(".app");
      const sidebar = page.locator("#app-sidebar");
      const logo = sidebar.locator(".side-brand-icon");
      const logout = sidebar.locator(".side-logout");

      await expect(app).toHaveAttribute("dir", locale === "fa" ? "rtl" : "ltr");
      await expect(logo).toBeVisible();
      await expect(sidebar.locator(".side-brand-copy")).toBeHidden();
      await expect(sidebar.locator(".side-user")).toBeHidden();
      await expect(sidebar.locator(".side-logout-label")).toBeHidden();
      await expect(logout).toHaveAccessibleName(locale === "fa" ? "خروج از حساب" : "Sign out of account");
      await expect(page.locator(".header-actions .profile-menu")).toHaveCount(0);
      await expect(page.locator(".header-notifications")).toBeVisible();
      await expect(page.locator(".topbar-language-switch")).toBeVisible();
      await expect(page.locator(".theme-switcher")).toBeVisible();

      const collapsedGeometry = await page.evaluate(() => {
        const sidebarNode = document.querySelector<HTMLElement>("#app-sidebar")!;
        const logoNode = sidebarNode.querySelector<HTMLElement>(".side-brand-icon")!;
        const logoutNode = sidebarNode.querySelector<HTMLElement>(".side-logout")!;
        const sidebarRect = sidebarNode.getBoundingClientRect();
        const logoRect = logoNode.getBoundingClientRect();
        const logoutRect = logoutNode.getBoundingClientRect();
        return {
          logoCenterDelta: Math.abs((logoRect.left + logoRect.width / 2) - (sidebarRect.left + sidebarRect.width / 2)),
          logoutCenterDelta: Math.abs((logoutRect.left + logoutRect.width / 2) - (sidebarRect.left + sidebarRect.width / 2)),
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });
      expect(collapsedGeometry.logoCenterDelta).toBeLessThan(2);
      expect(collapsedGeometry.logoutCenterDelta).toBeLessThan(2);
      expect(collapsedGeometry.documentWidth).toBeLessThanOrEqual(collapsedGeometry.viewportWidth);

      const toggle = sidebar.locator(".sidebar-toggle");
      await toggle.click();
      await expect(app).not.toHaveClass(/sidebar-collapsed/);
      await expect(sidebar.locator(".side-brand-copy")).toBeVisible();
      const profileMenu = sidebar.locator(".side-user");
      await expect(profileMenu).toBeVisible();
      await profileMenu.getByRole("button", { name: locale === "fa" ? "منوی حساب کاربری" : "Account menu" }).click();
      await expect(profileMenu.getByRole("menuitem", { name: locale === "fa" ? "تنظیمات حساب و برنامه" : "Account and application settings" })).toBeVisible();
      await expect(profileMenu.getByRole("menuitem", { name: locale === "fa" ? "گزارش فعالیت" : "Activity log" })).toBeVisible();
      await toggle.click();
      await expect(app).toHaveClass(/sidebar-collapsed/);

      if (locale === "fa" && width === 1280) {
        await page.screenshot({ path: testInfo.outputPath("sidebar-header-collapsed-fa-1280.png") });
      }
      if (width === 1920) {
        await logout.click();
        await expect(page).toHaveURL(/\/login$/);
      }
    }
  });
}
