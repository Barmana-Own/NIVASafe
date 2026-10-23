import { expect, test, type Page } from "@playwright/test";
import { authenticate } from "./fixtures";
import { knowledgeQuota } from "./testData";

const activeMembers = [
  { user: { id: "knowledge-user-a", displayName: "کاربر فعال اول با نام بلند برای آزمون چیدمان", email: "active.first.member@example.invalid" }, role: "ASSESSOR", active: true },
  { user: { id: "knowledge-user-b", displayName: "Second active synthetic knowledge member", email: "active.second.member@example.invalid" }, role: "HSE_MANAGER", active: true },
];
const inactiveMember = { user: { id: "knowledge-user-inactive", displayName: "Inactive synthetic member", email: "inactive.member@example.invalid" }, role: "ASSESSOR", active: false };
const visibleOrganizations = [
  { id: "org-e2e-1", nameFa: "شرکت آزمایشی اول با نام طولانی برای بررسی نمایش", nameEn: "First synthetic company with a long display name" },
  { id: "org-second", nameFa: "شرکت آزمایشی دوم", nameEn: "Second synthetic company" },
];
type Options = { canUpload?: boolean; failCreate?: boolean; locale?: "fa" | "en"; theme?: "blue" | "white" };

async function openKnowledge(page: Page, options: Options = {}) {
  const submissions: Record<string, unknown>[] = [];
  const attachments: Array<{ path: string; contentType: string; body: string }> = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.split("/api/v1")[1];
    if (path === "/knowledge" && request.method() === "POST") {
      submissions.push(request.postDataJSON());
      await route.fulfill({ status: options.failCreate ? 503 : 201, contentType: "application/json", body: JSON.stringify(options.failCreate ? { error: { code: "TEST_UNAVAILABLE", message: "Synthetic knowledge creation failure" } } : { data: { id: "knowledge-synthetic-created" } }) });
      return;
    }
    if (path === "/knowledge/knowledge-synthetic-created/attachments" && request.method() === "POST") {
      attachments.push({ path, contentType: request.headers()["content-type"], body: request.postData() ?? "" });
    }
    const data = path === "/knowledge/quota" ? { ...knowledgeQuota, canUpload: options.canUpload ?? true }
      : path === "/members" ? [...activeMembers, inactiveMember]
      : path === "/organizations" ? visibleOrganizations
      : path === "/organizations/current" ? { id: "org-e2e-1", nameFa: "سازمان آزمایشی", active: true, subscriptionStatus: "ACTIVE" }
      : path === "/me/ai-quota" ? { tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-22T12:00:00.000Z" }
      : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });
  });
  await authenticate(page, "/knowledge", { locale: options.locale ?? "fa", theme: options.theme ?? "white" });
  const form = page.locator("form.knowledge-form");
  await expect(form).toBeVisible();
  await expect(form.locator('[name="visibleUserIds"] option')).toHaveCount(2);
  await expect(form.locator('[name="visibleOrganizationIds"] option')).toHaveCount(2);
  return { form, submissions, attachments, errors };
}

async function selectVisibility(page: Page, optionIndex: number) {
  const select = page.locator('.knowledge-options .styled-select:has(select[name="visibility"])');
  await select.locator('[role="combobox"]').click();
  await select.getByRole("option").nth(optionIndex).click();
}

for (const variant of [
  { width: 1600, columns: 3, locale: "fa" as const, theme: "white" as const },
  { width: 1024, columns: 2, locale: "en" as const, theme: "blue" as const },
  { width: 390, columns: 1, locale: "fa" as const, theme: "blue" as const },
]) {
  test(`seven knowledge option cards preserve layout and keyboard controls at ${variant.width}px ${variant.locale} ${variant.theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: variant.width, height: 1000 });
    const { form, errors } = await openKnowledge(page, variant);
    const options = form.locator(".knowledge-options");
    await expect(options.locator(":scope > label")).toHaveCount(7);
    await expect(page.locator("html")).toHaveAttribute("dir", variant.locale === "fa" ? "rtl" : "ltr");
    await expect(page.locator(".app")).toHaveAttribute("data-theme", variant.theme);
    const geometry = await options.evaluate((element) => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
      uploadSpansFullRow: getComputedStyle(element.querySelector(".knowledge-file")!).gridColumnEnd === "-1",
      viewportOverflow: document.documentElement.scrollWidth > window.innerWidth + 1 || document.body.scrollWidth > window.innerWidth + 1,
      cards: [...element.querySelectorAll(":scope > label")].map((card) => ({ width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height, overflow: card.scrollWidth > card.clientWidth + 1 })),
    }));
    expect(geometry.columns).toBe(variant.columns);
    expect(geometry.uploadSpansFullRow).toBe(true);
    expect(geometry.viewportOverflow).toBe(false);
    expect(geometry.cards.every((card) => card.width > 0 && card.height > 0 && !card.overflow)).toBe(true);
    await expect(form.locator('[name="visibleUserIds"] option[value="knowledge-user-inactive"]')).toHaveCount(0);
    await form.locator('[name="visibleUserIds"]').selectOption(activeMembers.map((member) => member.user.id));
    await expect(form.locator('[name="visibleUserIds"]')).toHaveValues(activeMembers.map((member) => member.user.id));
    await form.locator('[name="visibleOrganizationIds"]').selectOption(visibleOrganizations.map((organization) => organization.id));
    await expect(form.locator('[name="visibleOrganizationIds"]')).toHaveValues(visibleOrganizations.map((organization) => organization.id));
    const published = form.locator('[name="published"]');
    await expect(published).toBeChecked();
    await published.focus();
    await page.keyboard.press("Space");
    await expect(published).not.toBeChecked();
    const focusStyle = await published.evaluate((element) => ({ style: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
    expect(focusStyle.style).not.toBe("none");
    expect(focusStyle.width).toBeGreaterThanOrEqual(2);
    await form.locator('.checkbox-card:has(input[name="aiReadable"])').click();
    await expect(form.locator('[name="aiReadable"]')).not.toBeChecked();
    expect(errors).toEqual([]);
    await testInfo.attach("knowledge-seven-option-cards", { body: await options.screenshot(), contentType: "image/png" });
  });
}

test("knowledge option styling preserves SELECTED users, global organizations and attachment submission", async ({ page }) => {
  const { form, submissions, attachments, errors } = await openKnowledge(page, { locale: "en", theme: "white" });
  await form.locator('[name="title"]').fill("Synthetic selected knowledge");
  await form.locator('[name="content"]').fill("Synthetic knowledge content preserved in the existing API contract.");
  await form.locator('[name="tags"]').fill("safety, ergonomics");
  await selectVisibility(page, 1);
  await form.locator('[name="visibleUserIds"]').selectOption(activeMembers.map((member) => member.user.id));
  await form.locator('[name="visibleOrganizationIds"]').selectOption(visibleOrganizations.map((organization) => organization.id));
  await form.locator('[name="isGlobal"]').check();
  await form.locator('[name="aiReadable"]').uncheck();
  await form.locator('[name="file"]').setInputFiles({ name: "synthetic-knowledge.txt", mimeType: "text/plain", buffer: Buffer.from("Synthetic attachment only.") });
  await form.locator(".knowledge-submit").click();
  await expect(page.locator(".alert.success")).toBeVisible();
  expect(submissions).toEqual([{ title: "Synthetic selected knowledge", content: "Synthetic knowledge content preserved in the existing API contract.", tags: ["safety", "ergonomics"], published: true, aiReadable: false, isGlobal: true, visibility: "SELECTED", visibleUserIds: activeMembers.map((member) => member.user.id), visibleOrganizationIds: visibleOrganizations.map((organization) => organization.id) }]);
  expect(attachments).toHaveLength(1);
  expect(attachments[0].contentType).toContain("multipart/form-data;");
  expect(attachments[0].body).toContain('filename="synthetic-knowledge.txt"');
  expect(attachments[0].body).toContain("Synthetic attachment only.");
  expect(errors).toEqual([]);
});

test("quota-disabled upload and failed knowledge creation preserve existing field and scope behavior", async ({ page }) => {
  const { form, submissions, attachments, errors } = await openKnowledge(page, { canUpload: false, failCreate: true, locale: "en", theme: "white" });
  await expect(form.locator('[name="file"]')).toBeDisabled();
  await form.locator('[name="title"]').fill("Retained synthetic draft");
  await form.locator('[name="content"]').fill("Draft remains after a rejected creation.");
  await form.locator('[name="tags"]').fill("retained, draft");
  await form.locator('[name="visibleUserIds"]').selectOption(activeMembers.map((member) => member.user.id));
  await form.locator('[name="visibleOrganizationIds"]').selectOption(visibleOrganizations.map((organization) => organization.id));
  await form.locator('[name="published"]').uncheck();
  const before = await form.evaluate((element) => [...new FormData(element as HTMLFormElement)].filter(([, value]) => typeof value === "string"));
  await form.locator(".knowledge-submit").click();
  await expect(page.locator(".alert.error")).toContainText("Synthetic knowledge creation failure");
  expect(await form.evaluate((element) => [...new FormData(element as HTMLFormElement)].filter(([, value]) => typeof value === "string"))).toEqual(before);
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({ title: "Retained synthetic draft", published: false, aiReadable: true, isGlobal: false, visibility: "ALL", visibleUserIds: [], visibleOrganizationIds: [] });
  expect(attachments).toEqual([]);
  expect(errors).toEqual([]);
});
