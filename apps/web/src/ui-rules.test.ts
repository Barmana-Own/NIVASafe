import { describe, expect, it } from "vitest";
import { calculateRpn } from "@nivasafe/domain";

describe("FMEA live preview", () => {
  it("uses the same shared rule as the API", () => {
    expect(calculateRpn(7, 4, 5)).toBe(140);
  });
});
