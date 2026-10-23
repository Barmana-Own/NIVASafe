import { expect, authenticate, test } from "./fixtures";

for (const width of [320, 390, 768, 980]) {
  test(`RULA process fields remain readable with the sidebar at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await authenticate(page, "/rula");

    const layout = await page.locator(".rula-process-layout").evaluate((element) => {
      const fields = element.querySelector<HTMLElement>(".rula-process-fields")!;
      const photo = element.querySelector<HTMLElement>(".rula-posture-panel")!;
      const label = fields.querySelector<HTMLElement>(".rula-process-form-grid > label:not(.span-two)")!;
      return {
        fieldsBottom: fields.getBoundingClientRect().bottom,
        photoTop: photo.getBoundingClientRect().top,
        labelWidth: label.getBoundingClientRect().width,
        pageScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(layout.photoTop).toBeGreaterThanOrEqual(layout.fieldsBottom - 2);
    expect(layout.labelWidth).toBeGreaterThan(200);
    expect(layout.pageScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 2);
  });
}

test("RULA keeps its side-by-side layout when the workspace has room", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await authenticate(page, "/rula");

  const layout = await page.locator(".rula-process-layout").evaluate((element) => ({
    fieldsTop: element.querySelector(".rula-process-fields")!.getBoundingClientRect().top,
    photoTop: element.querySelector(".rula-posture-panel")!.getBoundingClientRect().top,
    columns: getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,
  }));
  expect(layout.columns).toBe(2);
  expect(Math.abs(layout.fieldsTop - layout.photoTop)).toBeLessThan(2);
});

test("FMEA process fields use one column when the workspace is narrow", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await authenticate(page, "/fmea");

  const layout = await page.locator(".fmea-process-grid").evaluate((element) => ({
    columns: getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,
    labelWidth: element.querySelector("label")!.getBoundingClientRect().width,
    pageScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(layout.columns).toBe(1);
  expect(layout.labelWidth).toBeGreaterThan(200);
  expect(layout.pageScrollWidth).toBeLessThanOrEqual(layout.viewportWidth + 2);
});

test("knowledge document titles retain readable width beside the expanded sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 980, height: 900 });
  await authenticate(page, "/knowledge");

  const layout = await page.locator(".knowledge-grid").evaluate((element) => ({
    columns: getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,
    titleWidth: element.querySelector(".knowledge-card h3")!.getBoundingClientRect().width,
  }));
  expect(layout.columns).toBe(1);
  expect(layout.titleWidth).toBeGreaterThan(220);
});
