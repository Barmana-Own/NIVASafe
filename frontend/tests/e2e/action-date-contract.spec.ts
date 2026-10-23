import { expect, test } from "@playwright/test";

test("action dates preserve delayed autosave restoration and parent rerenders", async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.goto("/test-fixtures/action-date-reset.html");
  const delayed = page.locator("#delayed-date");
  await expect(delayed.locator(".localized-date-trigger")).toContainText("Choose date");
  await expect(delayed.locator('[name="dueDate"]')).toHaveValue("2026-11-16");
  await expect(delayed.locator(".localized-date-trigger")).toContainText("November 16, 2026");
  await page.getByRole("button", { name: "Rerender parent" }).click();
  await expect(delayed.locator('[name="dueDate"]')).toHaveValue("2026-11-16");
  await expect(delayed.locator(".localized-date-trigger")).toContainText("November 16, 2026");
  await delayed.getByRole("button", { name: "Reset empty date" }).click();
  await expect(delayed.locator('[name="dueDate"]')).toHaveValue("");
  await expect(delayed.locator(".localized-date-trigger")).toContainText("Choose date");
});

test("native reset restores an initial date and cleans up pending reset on unmount", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.goto("/test-fixtures/action-date-reset.html");
  const form = page.locator("#initial-date");
  await expect(form.locator('[name="dueDate"]')).toHaveValue("2026-10-20");
  await form.locator(".localized-date-trigger").click();
  await form.locator(".localized-date-day:not(.is-outside)").nth(10).click();
  await expect(form.locator('[name="dueDate"]')).toHaveValue("2026-10-11");
  await form.getByRole("button", { name: "Reset initial date" }).click();
  await expect(form.locator('[name="dueDate"]')).toHaveValue("2026-10-20");
  await expect(form.locator(".localized-date-trigger")).toContainText("October 20, 2026");
  await form.evaluate((element) => (element as HTMLFormElement).reset());
  await page.getByRole("button", { name: "Unmount controls" }).click();
  await expect(page.locator("#initial-date")).toHaveCount(0);
  expect(errors).toEqual([]);
});
