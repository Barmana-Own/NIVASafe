import { describe, expect, it } from "vitest";
import { normalizeMemberRequestIdentifiers, resolveMemberRequestApprovalEmail } from "./member-request.js";
import { memberRequestInput } from "./modules/users.js";

const validRequest = { displayName: "کاربر آزمایشی", role: "HSE_OFFICER" };

describe("organization member request identity", () => {
  it("accepts a username without requiring an email", () => {
    expect(memberRequestInput.safeParse({ ...validRequest, username: "ali.hse" }).success).toBe(true);
    expect(normalizeMemberRequestIdentifiers({ username: "ali.hse" })).toEqual({ username: "ali.hse", email: null });
  });

  it("accepts an email without requiring a username", () => {
    expect(memberRequestInput.safeParse({ ...validRequest, email: "HSE@example.com" }).success).toBe(true);
    expect(normalizeMemberRequestIdentifiers({ email: "  HSE@example.com " })).toEqual({ username: null, email: "hse@example.com" });
  });

  it("requires at least one identifier", () => {
    expect(memberRequestInput.safeParse(validRequest).success).toBe(false);
    expect(memberRequestInput.safeParse({ ...validRequest, username: null, email: null }).success).toBe(false);
    expect(() => normalizeMemberRequestIdentifiers({})).toThrowError(expect.objectContaining({ code: "MEMBER_IDENTITY_REQUIRED" }));
    expect(() => normalizeMemberRequestIdentifiers({ username: "  ", email: null })).toThrowError(expect.objectContaining({ code: "MEMBER_IDENTITY_REQUIRED" }));
  });

  it("validates any identifier that is supplied", () => {
    expect(() => normalizeMemberRequestIdentifiers({ username: "نام کاربری" })).toThrowError(expect.objectContaining({ code: "INVALID_USERNAME" }));
    expect(() => normalizeMemberRequestIdentifiers({ email: "not-an-email" })).toThrowError(expect.objectContaining({ code: "INVALID_EMAIL" }));
  });
});

describe("member request approval email", () => {
  it("uses the email already supplied on the request", () => {
    expect(resolveMemberRequestApprovalEmail("person@example.com")).toBe("person@example.com");
  });

  it("requires the Super Admin to supply an email for a username-only request", () => {
    expect(() => resolveMemberRequestApprovalEmail(null)).toThrowError(expect.objectContaining({ code: "EMAIL_REQUIRED" }));
    expect(resolveMemberRequestApprovalEmail(null, " Person@example.com ")).toBe("person@example.com");
  });
});
