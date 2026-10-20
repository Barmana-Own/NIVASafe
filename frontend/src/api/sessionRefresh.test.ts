import { describe, expect, it } from "vitest";
import { accessTokenNeedsRefresh } from "./sessionRefresh";

const token = (payload: unknown) => `e30.${btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}.synthetic`;
describe("access-token renewal hint (server remains authoritative)", () => {
  it("renews expired and soon-to-expire tokens before protected calls", () => {
    expect(accessTokenNeedsRefresh(token({ exp: 999 }), 1_000_000)).toBe(true);
    expect(accessTokenNeedsRefresh(token({ exp: 1060 }), 1_000_000)).toBe(true);
    expect(accessTokenNeedsRefresh(token({ exp: 1061 }), 1_000_000)).toBe(false);
  });
  it.each(["opaque", "a.!.b", "a.e30.b", token({ exp: "0" }), token({ exp: null }), token({ exp: -1 }), `a.${"A".repeat(8192)}.b`])("leaves unsupported tokens to server validation: %s", value => {
    expect(accessTokenNeedsRefresh(value, 1_000_000)).toBe(false);
  });
});
