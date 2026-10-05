import { describe, expect, it } from "vitest";
import { validateMemberRequestIdentity } from "./memberRequestIdentity";

describe("member request identity validation", () => {
  it("accepts either username or email independently", () => {
    expect(validateMemberRequestIdentity({ username: "ali.hse", email: "" })).toEqual({
      identity: { username: "ali.hse", email: null },
      error: null,
    });
    expect(validateMemberRequestIdentity({ username: "", email: " HSE@example.com " })).toEqual({
      identity: { username: null, email: "hse@example.com" },
      error: null,
    });
  });

  it("requires at least one identifier and validates each provided value", () => {
    expect(validateMemberRequestIdentity({ username: "", email: " " }).error).toBe("required");
    expect(validateMemberRequestIdentity({ username: "نام کاربری", email: "" }).error).toBe("invalidUsername");
    expect(validateMemberRequestIdentity({ username: "", email: "invalid" }).error).toBe("invalidEmail");
  });
});
