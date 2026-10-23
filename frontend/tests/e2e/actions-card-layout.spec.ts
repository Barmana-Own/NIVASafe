import { expect, test } from "@playwright/test";
import { authenticate } from "./fixtures";
import { fmeaRecord, rulaRecord, testProject } from "./testData";

for (const viewport of [{ width: 390, columns: 1 }, { width: 1024, columns: 2 }, { width: 1600, columns: 3 }]) {
  test(`corrective-action cards retain all register data and operations at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: 1000 });
    const records = (["FMEA", "RULA", "UNCLASSIFIED"] as const).flatMap((type) => Array.from({ length: 3 }, (_, index) => ({
      id: `${type}-${index}`, projectId: testProject.id,
      fmeaId: type === "FMEA" ? fmeaRecord.id : null,
      fmeaItemId: type === "FMEA" ? fmeaRecord.items[index].id : null,
      rulaId: type === "RULA" ? rulaRecord.id : null,
      bodySide: type === "RULA" ? "RIGHT" : null,
      title: `${type} اقدام اصلاحی با عنوان طولانی برای حفظ تمام اطلاعات ${index + 1}`,
      description: `شرح اقدام اصلاحی ${type} با محتوای طولانی و شناسه ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(5)} که باید به صورت کامل نمایش داده شود.`,
      assigneeName: "مسئول اقدام مصنوعی با نام طولانی", dueDate: "2026-12-31", progress: 35,
      priority: index === 0 ? "HIGH" : "MEDIUM", status: "OPEN",
      rulaImpact: type === "RULA" ? { scoreReduction: 2, affectedParts: ["upperArm", "neck"] } : null,
    })));
    const mutations: Array<{ id: string; status: string }> = [];
    await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.split("/api/v1")[1];
      let data: unknown = [];
      if (path === "/fmea") data = [{ ...fmeaRecord, projectId: testProject.id }];
      else if (path === "/rula") data = [{ ...rulaRecord, projectId: testProject.id }];
      else if (path === "/me/ai-quota") data = { tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-22T12:00:00.000Z" };
      else if (path === "/actions") {
        const type = url.searchParams.get("type");
        data = records.filter((record) => record.id.startsWith(`${type}-`));
      } else if (path?.startsWith("/actions/") && request.method() === "PATCH") {
        const id = path.split("/").pop()!;
        const status = request.postDataJSON().status as string;
        mutations.push({ id, status });
        const record = records.find((item) => item.id === id)!;
        record.status = status;
        data = record;
      } else if (path === "/organizations/current") data = { id: "org-e2e-1", nameFa: "سازمان آزمایشی", active: true, subscriptionStatus: "ACTIVE" };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });
    });
    await authenticate(page, "/actions", { locale: "fa" });
    for (const type of ["FMEA", "RULA", "UNCLASSIFIED"] as const) {
      await page.locator(`#action-list-tab-${type.toLowerCase()}`).click();
      const cards = page.locator(".action-register-card");
      await expect(cards).toHaveCount(3);
      const grid = page.locator(".action-register-cards");
      expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(viewport.columns);
      const first = cards.first();
      await expect(first.locator("h3")).toContainText(`${type} اقدام اصلاحی`);
      await expect(first.locator(".action-register-card-main > p")).toContainText("ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(5));
      await expect(first.locator(".action-register-meta")).toContainText("مسئول اقدام مصنوعی");
      await expect(first.locator(".action-register-progress")).toContainText("۳۵%");
      if (type === "FMEA") await expect(first.locator(".action-fmea-risk-metrics > span")).toHaveCount(4);
      if (type === "RULA") await expect(first.locator(".action-register-rula-context")).toContainText("۲");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1)).toBe(true);
      const clipped = await first.evaluate((element) => [...element.querySelectorAll("h3, .action-register-card-main > p, .action-register-meta")].some((child) => child.scrollWidth > child.clientWidth + 1));
      expect(clipped).toBe(false);
      await first.locator('.action-register-card-controls [role="combobox"]').click();
      await first.getByRole("option").nth(2).click();
      await expect.poll(() => mutations.some((item) => item.id === `${type}-0` && item.status === "IN_PROGRESS")).toBe(true);
      await expect(cards.first().locator('.action-register-card-controls select')).toHaveValue("IN_PROGRESS");
      const priority = page.locator(".action-list-filters .styled-select").nth(1);
      await priority.locator('[role="combobox"]').click();
      await priority.getByRole("option").nth(2).click();
      await expect(cards).toHaveCount(1);
      await expect(cards.first().locator("h3")).toContainText(`${type} اقدام اصلاحی`);
      await priority.locator('[role="combobox"]').click();
      await priority.getByRole("option").first().click();
      await expect(cards).toHaveCount(3);
    }
    expect(mutations).toHaveLength(3);
  });
}
