import { expect, test, type Locator, type Page } from "@playwright/test";
import { authenticate } from "./fixtures";
import { fmeaRecord, rulaRecord, testProject, testSession } from "./testData";

type ActionType = "FMEA" | "RULA";
type Submission = { payload: Record<string, unknown>; key?: string };

test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
});

async function openCreation(page: Page, type: ActionType, submit: (submission: Submission) => Promise<{ status: number; body: unknown }>, withSecondAssessment = false, deepLink = "") {
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.split("/api/v1")[1];
    if (path === "/actions" && request.method() === "POST") {
      const response = await submit({ payload: request.postDataJSON(), key: request.headers()["idempotency-key"] });
      await route.fulfill({ status: response.status, contentType: "application/json", body: JSON.stringify(response.body) });
      return;
    }
    if (request.method() !== "GET") {
      await route.abort();
      throw new Error(`Unexpected synthetic action request: ${request.method()} ${path}`);
    }
    const data = path === "/fmea" ? [{ ...fmeaRecord, projectId: testProject.id }, ...(withSecondAssessment ? [{ ...fmeaRecord, id: "fmea-second-assessment", title: "Second FMEA assessment", projectId: testProject.id }] : [])]
      : path === "/rula" ? [{ ...rulaRecord, projectId: testProject.id }, ...(withSecondAssessment ? [{ ...rulaRecord, id: "rula-second-assessment", title: "Second RULA assessment", projectId: testProject.id }] : [])]
      : path === "/me/ai-quota" ? { tokenLimit: 1000000, tokensUsed: 0, remainingTokens: 1000000, warningThreshold: 100000, state: "HEALTHY", serverTimestamp: "2026-10-22T12:00:00.000Z" }
      : path === "/organizations/current" ? { id: "org-e2e-1", nameFa: "سازمان آزمایشی", active: true, subscriptionStatus: "ACTIVE" }
      : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });
  });
  await authenticate(page, `/actions?type=${type}${deepLink}`, { locale: "en" });
  const panel = page.locator(`#action-create-${type.toLowerCase()}`);
  await expect(panel.locator("form.action-create-form")).toBeVisible();
  return panel;
}

async function choose(select: Locator, optionIndex: number) {
  await select.locator('[role="combobox"]').click();
  await select.locator('[role="option"]').nth(optionIndex).click();
}

async function enterAction(panel: Locator, type: ActionType) {
  const form = panel.locator("form.action-create-form");
  await form.locator('[name="title"]').fill(`Synthetic ${type} action`);
  await form.locator('[name="description"]').fill("Synthetic action details retained until the server confirms creation.");
  await form.locator('[name="assigneeName"]').fill("Synthetic assignee");
  await choose(form.locator('.styled-select:has(select[name="priority"])'), 0);
  if (type === "FMEA") await choose(form.locator('.styled-select:has(select[name="fmeaItemId"])'), 2);
  else await choose(form.locator('.styled-select:has(select[name="bodySide"])'), 1);
  await form.locator(".localized-date-trigger").click();
  await form.locator(".localized-date-day:not(.is-outside)").nth(10).click();
  await expect(form.locator('[name="dueDate"]')).not.toHaveValue("");
  return form;
}

async function expectEmptyAction(panel: Locator, type: ActionType) {
  const form = panel.locator("form.action-create-form");
  for (const name of ["title", "description", "assigneeName", "dueDate"]) await expect(form.locator(`[name="${name}"]`)).toHaveValue("");
  await expect(form.locator('[name="priority"]')).toHaveValue("MEDIUM");
  await expect(form.locator(".localized-date-trigger")).toContainText("Choose date");
  await expect(form.locator('.styled-select:has(select[name="priority"])').locator('[role="combobox"]')).toContainText("Medium");
  if (type === "FMEA") {
    await expect(form.locator('[name="fmeaItemId"]')).toHaveValue("");
    await expect(form.locator(".action-fmea-risk-context")).toHaveCount(0);
  } else {
    await expect(form.locator('[name="bodySide"]')).toHaveValue("RIGHT");
    await expect(form.locator('.styled-select:has(select[name="bodySide"])').locator('[role="combobox"]')).toContainText("Right");
  }
}

async function expectClearedContext(panel: Locator) {
  for (const select of await panel.locator(".action-project-assessment-selectors select").all()) await expect(select).toHaveValue("");
  await expect(panel.locator("form.action-create-form")).toHaveCount(0);
  await expect(panel.locator(".action-assessment-context, .action-fmea-risk-context, .action-rula-assessment-context")).toHaveCount(0);
  await expect(panel.locator(".action-project-assessment-selectors [role=combobox]").first()).toContainText("Select a project");
}

async function selectCreationContext(panel: Locator) {
  await choose(panel.locator(".action-project-assessment-selectors .styled-select").first(), 1);
  await expect(panel.locator("form.action-create-form")).toBeVisible();
}

async function expectListContext(page: Page, type: ActionType) {
  const list = page.locator("#action-list-panel");
  await expect(list.locator(".action-project-assessment-selectors select").first()).toHaveValue(testProject.id);
  await expect(list.locator(".action-project-assessment-selectors select").last()).toHaveValue(type === "FMEA" ? fmeaRecord.id : rulaRecord.id);
  await expect(list.locator(".action-list-filters select").first()).toHaveValue("OPEN");
  await expect(list.locator(".action-list-filters select").last()).toHaveValue("HIGH");
}

async function setListFilters(page: Page) {
  await choose(page.locator("#action-list-panel .action-list-filters .styled-select").first(), 1);
  await choose(page.locator("#action-list-panel .action-list-filters .styled-select").last(), 2);
}

for (const type of ["FMEA", "RULA"] as const) {
  test(`${type} creation clears native and custom fields only after confirmed success`, async ({ page }) => {
    let finish!: () => void;
    const responseReady = new Promise<void>((resolve) => { finish = resolve; });
    const writes: Submission[] = [];
    const panel = await openCreation(page, type, async (submission) => {
      writes.push(submission);
      await responseReady;
      return { status: 201, body: { data: { id: `created-${type.toLowerCase()}` } } };
    }, false, `&${type === "FMEA" ? "fmeaId" : "rulaId"}=${type === "FMEA" ? fmeaRecord.id : rulaRecord.id}`);
    await setListFilters(page);
    const form = await enterAction(panel, type);
    const selectedDate = await form.locator('[name="dueDate"]').inputValue();
    await form.locator('button[type="submit"]').click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].payload.dueDate).toBe(selectedDate);
    await expect(form.locator('button[type="submit"]')).toBeDisabled();
    await expect(form.locator('[name="title"]')).toHaveValue(`Synthetic ${type} action`);
    await form.dispatchEvent("submit");
    expect(writes).toHaveLength(1);
    finish();
    await expect(page.locator(".alert.success")).toContainText("Corrective action registered.");
    await expectClearedContext(panel);
    await expectListContext(page, type);
    await page.locator(`#action-create-tab-${type === "FMEA" ? "rula" : "fmea"}`).click();
    await page.locator(`#action-create-tab-${type.toLowerCase()}`).click();
    await expectClearedContext(panel);
    await expectListContext(page, type);
    const draftKey = `nivasafe-form-draft:v1:action-create-${type}:${type === "FMEA" ? fmeaRecord.id : rulaRecord.id}:${testSession.user.id}:org-e2e-1`;
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
    await selectCreationContext(panel);
    await expectEmptyAction(panel, type);
    await page.reload();
    await expectEmptyAction(page.locator(`#action-create-${type.toLowerCase()}`), type);
    expect(writes).toHaveLength(1);
  });

  test(`${type} failed creation retains all entered values and retry identity`, async ({ page }) => {
    const writes: Submission[] = [];
    const panel = await openCreation(page, type, async (submission) => {
      writes.push(submission);
      return writes.length === 1
        ? { status: 503, body: { error: { code: "TEST_UNAVAILABLE", message: "Synthetic temporary failure" } } }
        : { status: 201, body: { data: { id: `created-${type.toLowerCase()}` } } };
    });
    const form = await enterAction(panel, type);
    await setListFilters(page);
    const fields = await form.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)));
    await form.locator('button[type="submit"]').click();
    await expect(page.locator(".alert.error")).toContainText("Synthetic temporary failure");
    await expect(form.locator('button[type="submit"]')).toBeEnabled();
    expect(await form.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)))).toEqual(fields);
    await expect(form.locator('[name="title"]')).toHaveValue(`Synthetic ${type} action`);
    await expect(panel.locator(".action-project-assessment-selectors select").first()).toHaveValue(testProject.id);
    await expect(panel.locator(".action-project-assessment-selectors select").last()).toHaveValue(type === "FMEA" ? fmeaRecord.id : rulaRecord.id);
    await expectListContext(page, type);
    await form.locator('button[type="submit"]').click();
    await expect(page.locator(".alert.success")).toBeVisible();
    await expectClearedContext(panel);
    await expectListContext(page, type);
    await selectCreationContext(panel);
    await expectEmptyAction(panel, type);
    expect(writes).toHaveLength(2);
    expect(writes[0].payload.dueDate).toBe(fields.dueDate);
    expect(writes[1]).toEqual(writes[0]);
  });

  test(`${type} pending creation never clears a different assessment draft`, async ({ page }) => {
    let finish!: () => void;
    const responseReady = new Promise<void>((resolve) => { finish = resolve; });
    const writes: Submission[] = [];
    const panel = await openCreation(page, type, async (submission) => {
      writes.push(submission);
      await responseReady;
      return { status: 201, body: { data: { id: "created-first-assessment" } } };
    }, true);
    const firstForm = await enterAction(panel, type);
    await firstForm.locator('button[type="submit"]').click();
    await expect.poll(() => writes.length).toBe(1);
    await choose(panel.locator(".action-project-assessment-selectors .styled-select").nth(1), 2);
    const nextForm = await enterAction(panel, type);
    await nextForm.locator('[name="title"]').fill("Different assessment unsaved action");
    const nextFields = await nextForm.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)));
    finish();
    await expect(page.locator(".alert.success")).toBeVisible();
    await expect(nextForm.locator('button[type="submit"]')).toBeEnabled();
    expect(await nextForm.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)))).toEqual(nextFields);
    await expect(nextForm.locator('[name="title"]')).toHaveValue("Different assessment unsaved action");
    await expect(panel.locator(".action-project-assessment-selectors select").last()).toHaveValue(`${type.toLowerCase()}-second-assessment`);
    expect(writes).toHaveLength(1);
  });

  test(`${type} success preserves the other tab's unsent action and selections`, async ({ page }) => {
    const opposite = type === "FMEA" ? "RULA" : "FMEA";
    const panel = await openCreation(page, type, async () => ({ status: 201, body: { data: { id: "created-current-tab" } } }));
    const other = page.locator(`#action-create-${opposite.toLowerCase()}`);
    await page.locator(`#action-create-tab-${opposite.toLowerCase()}`).click();
    const otherForm = await enterAction(other, opposite);
    await otherForm.locator('[name="title"]').fill("Unsubmitted action in the other tab");
    const otherFields = await otherForm.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)));
    const otherDraftKey = `nivasafe-form-draft:v1:action-create-${opposite}:${opposite === "FMEA" ? fmeaRecord.id : rulaRecord.id}:${testSession.user.id}:org-e2e-1`;
    const otherDraft = await page.evaluate((key) => localStorage.getItem(key), otherDraftKey);
    expect(otherDraft).not.toBeNull();
    await page.locator(`#action-create-tab-${type.toLowerCase()}`).click();
    const form = await enterAction(panel, type);
    await form.locator('button[type="submit"]').click();
    await expect(page.locator(".alert.success")).toBeVisible();
    await expectClearedContext(panel);
    expect(await page.evaluate((key) => localStorage.getItem(key), otherDraftKey)).toBe(otherDraft);
    await page.locator(`#action-create-tab-${opposite.toLowerCase()}`).click();
    await expect(other.locator(".action-project-assessment-selectors select").first()).toHaveValue(testProject.id);
    await expect(other.locator(".action-project-assessment-selectors select").last()).toHaveValue(opposite === "FMEA" ? fmeaRecord.id : rulaRecord.id);
    await expect(otherForm.locator('[name="title"]')).toHaveValue("Unsubmitted action in the other tab");
    expect(await otherForm.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)))).toEqual(otherFields);
    await expect(otherForm.locator(".localized-date-trigger")).not.toContainText("Choose date");
  });

  test(`${type} success after switching tabs resets only the submitted hidden form`, async ({ page }) => {
    let finish!: () => void;
    const responseReady = new Promise<void>((resolve) => { finish = resolve; });
    const writes: Submission[] = [];
    const panel = await openCreation(page, type, async (submission) => {
      writes.push(submission);
      await responseReady;
      return { status: 201, body: { data: { id: "created-hidden-form" } } };
    });
    const form = await enterAction(panel, type);
    await form.locator('button[type="submit"]').click();
    await expect.poll(() => writes.length).toBe(1);
    const opposite = type === "FMEA" ? "RULA" : "FMEA";
    await page.locator(`#action-create-tab-${opposite.toLowerCase()}`).click();
    const other = page.locator(`#action-create-${opposite.toLowerCase()}`);
    const otherForm = await enterAction(other, opposite);
    await otherForm.locator('[name="title"]').fill("Other tab edited while the request is pending");
    const otherFields = await otherForm.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)));
    const otherDraftKey = `nivasafe-form-draft:v1:action-create-${opposite}:${opposite === "FMEA" ? fmeaRecord.id : rulaRecord.id}:${testSession.user.id}:org-e2e-1`;
    const otherDraft = await page.evaluate((key) => localStorage.getItem(key), otherDraftKey);
    finish();
    await expect(page.locator(".alert.success")).toBeVisible();
    await expect(otherForm.locator('button[type="submit"]')).toBeEnabled();
    expect(await otherForm.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)))).toEqual(otherFields);
    expect(await page.evaluate((key) => localStorage.getItem(key), otherDraftKey)).toBe(otherDraft);
    await page.locator(`#action-create-tab-${type.toLowerCase()}`).click();
    await expectClearedContext(panel);
    expect(writes).toHaveLength(1);
  });

  test(`${type} detached success preserves a newer draft after returning to the submitted assessment`, async ({ page }) => {
    let finish!: () => void;
    const responseReady = new Promise<void>((resolve) => { finish = resolve; });
    const writes: Submission[] = [];
    const panel = await openCreation(page, type, async (submission) => {
      writes.push(submission);
      await responseReady;
      return { status: 201, body: { data: { id: "created-earlier-form-instance" } } };
    }, true);
    const firstForm = await enterAction(panel, type);
    await firstForm.locator('button[type="submit"]').click();
    await expect.poll(() => writes.length).toBe(1);
    await choose(panel.locator(".action-project-assessment-selectors .styled-select").nth(1), 2);
    await choose(panel.locator(".action-project-assessment-selectors .styled-select").nth(1), 1);
    const newForm = await enterAction(panel, type);
    await newForm.locator('[name="title"]').fill("New draft after returning to the original assessment");
    const newFields = await newForm.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)));
    const draftKey = `nivasafe-form-draft:v1:action-create-${type}:${type === "FMEA" ? fmeaRecord.id : rulaRecord.id}:${testSession.user.id}:org-e2e-1`;
    const newDraft = await page.evaluate((key) => localStorage.getItem(key), draftKey);
    expect(newDraft).not.toBeNull();
    finish();
    await expect(page.locator(".alert.success")).toBeVisible();
    await expect(newForm.locator('button[type="submit"]')).toBeEnabled();
    expect(await newForm.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)))).toEqual(newFields);
    expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBe(newDraft);
    await page.reload();
    await expect(panel.locator('[name="title"]')).toHaveValue("New draft after returning to the original assessment");
    expect(await panel.locator("form.action-create-form").evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement)))).toEqual(newFields);
    expect(writes).toHaveLength(1);
  });
}
