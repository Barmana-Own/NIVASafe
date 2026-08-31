import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { calculateRpn } from "@nivasafe/domain";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const appLayoutSource = readFileSync(new URL("./layout/AppLayout.tsx", import.meta.url), "utf8");
const generalPagesSource = readFileSync(new URL("./features/general/GeneralPages.tsx", import.meta.url), "utf8");
const accountPagesSource = readFileSync(new URL("./features/account/AccountPages.tsx", import.meta.url), "utf8");
const autoSaveSource = readFileSync(new URL("./forms/AutoSaveForm.tsx", import.meta.url), "utf8");
const autoSaveRulesSource = readFileSync(new URL("./forms/autoSave.ts", import.meta.url), "utf8");

describe("FMEA live preview", () => {
  it("uses the same shared rule as the API", () => {
    expect(calculateRpn(7, 4, 5)).toBe(140);
  });
});

describe("first-run assessment navigation", () => {
  it("keeps the route inside the authenticated application shell", () => {
    expect(appSource).toContain('<Route path="choose-path" element={<PathSelectionPage />} />');
    expect(appSource).not.toContain('<Route path="/choose-path" element={<PathSelectionPage />} />');
  });
});

describe("organization navigation wording", () => {
  it("uses the company-only label without CRM wording", () => {
    expect(appLayoutSource).toContain('label: "شرکت‌ها"');
    expect(appLayoutSource).not.toContain('label: "شرکت‌ها و CRM"');
    expect(generalPagesSource).toContain('eyebrow="مدیریت سازمان"');
    expect(generalPagesSource).not.toContain('eyebrow="CRM و مدیریت سازمان"');
  });
});

describe("production login safety", () => {
  it("does not ship demo credentials or demo guidance in the login form", () => {
    expect(accountPagesSource).not.toContain("admin@nivasafe.local");
    expect(accountPagesSource).not.toContain("Demo123!");
    expect(accountPagesSource).not.toContain("login-hint");
    expect(accountPagesSource).not.toContain('placeholder="••••••••"');
    expect(accountPagesSource).toContain('autoComplete="username"');
    expect(accountPagesSource).toContain('autoComplete="current-password"');
  });
});

describe("phone input contract", () => {
  it("normalizes mobile digits in every editable phone field and enforces the local format", () => {
    expect(accountPagesSource).toContain("function normalizePhoneField");
    expect(accountPagesSource).toContain('onChange={normalizePhoneField}');
    expect(accountPagesSource).toContain('maxLength={11} pattern="09[0-9]{9}"');
    const registrationSource = readFileSync(new URL("./features/account/RegistrationPage.tsx", import.meta.url), "utf8");
    expect(registrationSource).toContain('onChange={(event) => update("phone", normalizePhone(event.target.value))}');
    expect(registrationSource).toContain('phone: typeof draft.phone === "string" ? normalizePhone(draft.phone) : ""');
  });
});

describe("form auto-save contract", () => {
  it("persists every input and restores drafts without storing credentials or files", () => {
    expect(autoSaveSource).toContain('form.addEventListener("input", persist)');
    expect(autoSaveSource).toContain('form.addEventListener("change", persist)');
    expect(autoSaveRulesSource).toContain('"password"');
    expect(autoSaveRulesSource).toContain('"file"');
    expect(autoSaveSource).toContain("restoreForm");
    expect(readFileSync(new URL("./features/general/GeneralPages.tsx", import.meta.url), "utf8")).toContain("<AutoSaveForm");
    expect(readFileSync(new URL("./features/assistant/AssistantPage.tsx", import.meta.url), "utf8")).toContain("<AutoSaveForm");
  });
});
