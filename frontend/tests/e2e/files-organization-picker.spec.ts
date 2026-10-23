import { expect, test, type Page } from "@playwright/test";
import { authenticate } from "./fixtures";
import { testSession } from "./testData";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const organizationFiles = [
  { id: "org-image-a", originalName: "organization-first.png", mimeType: "image/png", size: png.length, kind: "IMAGE", createdAt: "2026-10-22T12:00:00.000Z", reference: { type: "RULA", title: "Existing source assessment", code: "RULA-EXISTING" } },
  { id: "org-image-b", originalName: "organization-second.png", mimeType: "image/png", size: png.length, kind: "IMAGE", createdAt: "2026-10-22T12:00:00.000Z" },
  { id: "org-document", originalName: "organization-document.pdf", mimeType: "application/pdf", size: 100, kind: "DOCUMENT", createdAt: "2026-10-22T12:00:00.000Z" },
  { id: "org-large-image", originalName: "organization-large.png", mimeType: "image/png", size: 10 * 1024 * 1024 + 1, kind: "IMAGE", createdAt: "2026-10-22T12:00:00.000Z" },
];
type Upload = { body: string; contentType: string };
async function openFiles(page: Page, options: { locale?: "fa" | "en"; theme?: "white" | "blue"; readOnly?: boolean; post?: (upload: Upload, attempt: number) => Promise<number> } = {}) {
  const uploads: Upload[] = [];
  const errors: string[] = [];
  const choosers: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("filechooser", () => choosers.push("native"));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.split("/api/v1")[1];
    if (path?.endsWith("/download")) {
      await route.fulfill({ status: 200, contentType: "image/png", body: png });
      return;
    }
    if (path === "/files" && request.method() === "POST") {
      const upload = { body: request.postData() ?? "", contentType: request.headers()["content-type"] };
      uploads.push(upload);
      const status = await options.post?.(upload, uploads.length) ?? 201;
      await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(status >= 400 ? { error: { code: "TEST_UPLOAD_FAILURE", message: "Synthetic upload failure" } } : { data: { id: "uploaded-synthetic-file" } }) });
      return;
    }
    const data = path === "/files" ? organizationFiles
      : path === "/organizations/current" ? { id: "org-e2e-1", nameFa: "سازمان آزمایشی", active: true, subscriptionStatus: "ACTIVE" }
      : path === "/me/ai-quota" ? { tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-22T12:00:00.000Z" }
      : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data, ...(path === "/files" ? { meta: { page: 1, limit: 8, total: organizationFiles.length } } : {}) }) });
  });
  if (options.readOnly) {
    await page.addInitScript((session) => {
      localStorage.setItem("nivasafe-session", JSON.stringify(session));
      localStorage.setItem("nivasafe-org", "org-e2e-1");
      localStorage.setItem("nivasafe-locale", "en");
      localStorage.setItem("nivasafe-theme", "white");
    }, { ...testSession, user: { ...testSession.user, globalRole: "USER" }, organizations: testSession.organizations.map((organization) => ({ ...organization, role: "EXTERNAL_AUDITOR" })) });
    await page.goto("/files");
    await expect(page.locator(".files-page")).toBeVisible();
  } else await authenticate(page, "/files", { locale: options.locale ?? "en", theme: options.theme ?? "white" });
  const form = page.locator("form.upload-form");
  if (!options.readOnly) await expect(form).toBeVisible();
  return { form, uploads, errors, choosers };
}
async function chooseOrganization(page: Page) {
  await page.locator(".files-upload-picker-actions").getByRole("button", { name: "Organization images", exact: true }).click();
  const dialog = page.locator(".organization-image-picker");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".organization-image-card")).toHaveCount(2);
  await expect(dialog.locator(".organization-image-card").first()).toBeEnabled();
  await dialog.locator(".organization-image-card").first().click();
  await expect(dialog.locator(".organization-image-card").last()).toBeDisabled();
  await dialog.getByRole("button", { name: "Use 1 images", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}
function fileParts(body: string) { return body.match(/name="file"/g)?.length ?? 0; }

test("organization images picker confirms the original without opening native chooser or posting a duplicate", async ({ page }) => {
  const { form, uploads, errors, choosers } = await openFiles(page);
  await chooseOrganization(page);
  expect(choosers).toEqual([]);
  await expect(form.locator(".dropzone strong")).toHaveText("organization-first.png");
  await expect(form.locator('[name="file"]')).not.toHaveAttribute("required");
  expect(await form.locator('[name="file"]').evaluate((element) => (element as HTMLInputElement).files?.length)).toBe(0);
  await form.locator('[name="entityType"]').fill("RULA");
  await form.locator('button.primary').click();
  await expect(page.locator(".alert.success")).toContainText("File uploaded successfully.");
  expect(uploads).toEqual([]);
  await expect(form.locator('[name="file"]')).toHaveAttribute("required");
  await expect(form.locator(".dropzone strong")).toHaveText("Choose a file");
  await expect(form.locator('[name="entityType"]')).toHaveValue("");
  expect(errors).toEqual([]);
});

test("native and organization sources replace each other deterministically", async ({ page }) => {
  const { form, uploads, errors } = await openFiles(page);
  await chooseOrganization(page);
  await form.locator('[name="file"]').setInputFiles({ name: "local-first.txt", mimeType: "text/plain", buffer: Buffer.from("Local first source") });
  await expect(form.locator(".dropzone strong")).toHaveText("local-first.txt");
  await expect(form.locator('[name="file"]')).toHaveAttribute("required");
  await form.locator('button.primary').click();
  await expect(page.locator(".alert.success")).toBeVisible();
  expect(fileParts(uploads[0].body)).toBe(1);
  expect(uploads[0].body).toContain('filename="local-first.txt"');
  expect(uploads[0].body).not.toContain('filename="organization-first.png"');
  await form.locator('[name="file"]').setInputFiles({ name: "local-second.txt", mimeType: "text/plain", buffer: Buffer.from("Local second source") });
  await chooseOrganization(page);
  expect(await form.locator('[name="file"]').evaluate((element) => (element as HTMLInputElement).files?.length)).toBe(0);
  await form.locator('button.primary').click();
  await expect(form.locator(".dropzone strong")).toHaveText("Choose a file");
  expect(uploads).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("native upload failure retains the file and reference, and retry guards duplicate requests until success", async ({ page }) => {
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const { form, uploads, errors } = await openFiles(page, { post: async (_, attempt) => { if (attempt === 1) return 503; await pending; return 201; } });
  await form.locator('[name="file"]').setInputFiles({ name: "retained-local.txt", mimeType: "text/plain", buffer: Buffer.from("Retained local contents") });
  await form.locator('[name="entityType"]').fill("FMEA");
  await form.locator('button.primary').click();
  await expect(page.locator(".alert.error")).toContainText("Synthetic upload failure");
  await expect(form.locator(".dropzone strong")).toHaveText("retained-local.txt");
  await expect(form.locator('[name="entityType"]')).toHaveValue("FMEA");
  await form.locator('button.primary').click();
  await expect.poll(() => uploads.length).toBe(2);
  await expect(form.locator('button.primary')).toBeDisabled();
  await expect(form.locator('[name="file"]')).toBeDisabled();
  await form.dispatchEvent("submit");
  expect(uploads).toHaveLength(2);
  finish();
  await expect(page.locator(".alert.success")).toBeVisible();
  for (const upload of uploads) {
    expect(fileParts(upload.body)).toBe(1);
    expect(upload.body).toContain('filename="retained-local.txt"');
  }
  await expect(form.locator(".dropzone strong")).toHaveText("Choose a file");
  await expect(form.locator('[name="file"]')).toHaveAttribute("required");
  await expect(form.locator('[name="entityType"]')).toHaveValue("");
  expect(errors).toEqual([]);
});

test("confirming an organization image preserves its existing reference and sends no reassignment request", async ({ page }) => {
  const { form, uploads } = await openFiles(page);
  const mutations: string[] = [];
  page.on("request", request => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) && request.url().includes("/api/v1/files")) mutations.push(request.url()); });
  await chooseOrganization(page);
  await form.locator('[name="entityType"]').fill("New optional reference must not reparent original");
  await form.locator('button.primary').click();
  await expect(page.locator(".alert.success")).toBeVisible();
  expect(uploads).toEqual([]);
  expect(mutations).toEqual([]);
  await expect(page.locator(".file-card").first()).toContainText("Existing source assessment");
});

test("compact upload choices remain separate accessible controls across responsive layouts", async ({ context }, testInfo) => {
  for (const variant of [{ width: 1280, locale: "fa" as const, theme: "white" as const }, { width: 1024, locale: "en" as const, theme: "blue" as const }, { width: 390, locale: "fa" as const, theme: "white" as const }]) {
    const page = await context.newPage();
    await page.setViewportSize({ width: variant.width, height: 1000 });
    const { form, errors } = await openFiles(page, variant);
    const picker = form.locator(".files-upload-picker");
    await expect(picker.locator(".files-upload-picker-actions button")).toHaveCount(2);
    expect(await picker.locator(".dropzone button").count()).toBe(0);
    const metrics = await picker.evaluate((element) => ({ height: element.getBoundingClientRect().height, overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1, buttons: [...element.querySelectorAll<HTMLButtonElement>(".files-upload-picker-actions button")].map((button) => button.getBoundingClientRect().height) }));
    expect(metrics.height).toBeLessThanOrEqual(variant.width > 560 ? 170 : 240);
    expect(metrics.buttons.every((height) => height >= 44)).toBe(true);
    expect(metrics.overflow).toBe(false);
    await testInfo.attach(`compact-upload-${variant.width}`, { body: await picker.screenshot(), contentType: "image/png" });
    expect(errors).toEqual([]);
    await page.close();
  }
});

test("picker failure and cancellation preserve native selection and read-only roles retain upload restrictions", async ({ page, context }) => {
  const { form, uploads } = await openFiles(page);
  await form.locator('[name="file"]').setInputFiles({ name: "existing-local.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 Synthetic local file") });
  await page.route("**/api/v1/files?*", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "TEST_PICKER_FAILURE", message: "Synthetic picker list failure" } }) }));
  await form.locator(".files-upload-picker-actions").getByRole("button", { name: "Organization images", exact: true }).click();
  const dialog = page.locator(".organization-image-picker");
  await expect(dialog.getByRole("alert")).toContainText("Synthetic picker list failure");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(form.locator(".dropzone strong")).toHaveText("existing-local.pdf");
  expect(await form.locator('[name="file"]').evaluate((element) => (element as HTMLInputElement).files?.length)).toBe(1);
  expect(uploads).toEqual([]);
  const readOnly = await context.newPage();
  await openFiles(readOnly, { readOnly: true });
  await expect(readOnly.locator("form.upload-form")).toHaveCount(0);
  await expect(readOnly.getByRole("button", { name: "Organization images", exact: true })).toHaveCount(0);
  await expect(readOnly.locator(".file-card")).toHaveCount(organizationFiles.length);
  await expect(readOnly.locator(".file-actions .danger")).toHaveCount(0);
  await readOnly.close();
});
