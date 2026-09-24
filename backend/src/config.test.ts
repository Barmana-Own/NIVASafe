import { afterEach, describe, expect, it } from "vitest";
import { getLoginRateLimit } from "./config.js";

const originalLoginRateLimitMax = process.env.LOGIN_RATE_LIMIT_MAX;

afterEach(() => {
  if (originalLoginRateLimitMax === undefined) delete process.env.LOGIN_RATE_LIMIT_MAX;
  else process.env.LOGIN_RATE_LIMIT_MAX = originalLoginRateLimitMax;
});

describe("login rate-limit configuration", () => {
  it("uses a forgiving but bounded default", () => {
    delete process.env.LOGIN_RATE_LIMIT_MAX;
    expect(getLoginRateLimit()).toEqual({ max: 60, timeWindow: "15 minutes" });
  });

  it("accepts a positive configured value up to the production ceiling", () => {
    process.env.LOGIN_RATE_LIMIT_MAX = "45";
    expect(getLoginRateLimit()).toEqual({ max: 45, timeWindow: "15 minutes" });
  });

  it("rejects invalid or unsafe values", () => {
    process.env.LOGIN_RATE_LIMIT_MAX = "0";
    expect(() => getLoginRateLimit()).toThrow("LOGIN_RATE_LIMIT_MAX");
    process.env.LOGIN_RATE_LIMIT_MAX = "61";
    expect(() => getLoginRateLimit()).toThrow("LOGIN_RATE_LIMIT_MAX");
  });
});
