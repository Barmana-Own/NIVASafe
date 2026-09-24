import { describe, expect, it } from "vitest";
import { parseRegistrationInput, validateRegistrationIdentity } from "./modules/auth.js";

const validPersonalPayload = {
  email: "person@example.com",
  password: "Longer-Secure9!",
  displayName: "علی رضایی",
  registrationKind: "personal" as const,
  locale: "fa" as const,
  phone: null,
  jobTitle: null,
  companyName: null,
  activityArea: "ایمنی",
  industry: null,
  employeeCount: null,
  nationalId: null,
  subscriptionPlan: "STARTER" as const,
};

describe("registration security boundary", () => {
  it("normalizes valid contact values and rejects a mismatched contact type", () => {
    expect(validateRegistrationIdentity({ email: " Person@Example.com ", displayName: " علی  رضایی ", phone: "۰۹۱۲۱۲۳۴۵۶۷" })).toEqual({
      email: "person@example.com",
      displayName: "علی رضایی",
      phone: "09121234567",
    });
    expect(() => validateRegistrationIdentity({ email: "09121234567", displayName: "علی رضایی" })).toThrow("ایمیل معتبر");
    expect(() => validateRegistrationIdentity({ email: "person@example.com", displayName: "علی رضایی", phone: "0912123456" })).toThrow("شماره تلفن معتبر");
    expect(validateRegistrationIdentity({ email: "person@example.com", displayName: "ignored", firstName: " علی ", lastName: " رضایی " })).toMatchObject({ displayName: "علی رضایی", firstName: "علی", lastName: "رضایی" });
  });

  it("rejects reserved or invalid usernames at the server boundary", () => {
    expect(() => validateRegistrationIdentity({ email: "person@example.com", displayName: "admin-operator" })).toThrow("نام کاربری");
    expect(() => validateRegistrationIdentity({ email: "person@example.com", displayName: "<script>" })).toThrow("نام کاربری");
  });

  it("rejects unknown registration fields and incomplete organization details", () => {
    expect(() => parseRegistrationInput({ ...validPersonalPayload, unexpected: "value" })).toThrow();
    expect(() => parseRegistrationInput({ ...validPersonalPayload, registrationKind: "organization", phone: "09121234567", companyName: null, industry: null })).toThrow();
    expect(() => parseRegistrationInput({ ...validPersonalPayload, firstName: "علی" })).toThrow();
  });

  it("accepts complete name parts and rejects malformed company identifiers", () => {
    expect(parseRegistrationInput({ ...validPersonalPayload, firstName: "علی", lastName: "رضایی" })).toMatchObject({ firstName: "علی", lastName: "رضایی" });
    expect(() => parseRegistrationInput({ ...validPersonalPayload, registrationKind: "organization", phone: "09121234567", companyName: "شرکت ایمن", industry: "تولید", firstName: "علی", lastName: "رضایی", nationalId: "12563254807" })).toThrow();
    expect(parseRegistrationInput({ ...validPersonalPayload, registrationKind: "organization", phone: "09121234567", companyName: "شرکت ایمن", industry: "تولید", firstName: "علی", lastName: "رضایی", nationalId: "۱۲۵۶۳۲۵۴۸۰۶" })).toMatchObject({ nationalId: "۱۲۵۶۳۲۵۴۸۰۶" });
  });
});
