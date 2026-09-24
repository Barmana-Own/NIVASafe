import { describe, expect, it } from "vitest";
import { assertRulaActionBodySide, correctiveActionBodySchema } from "./modules/actions.js";

const baseAction = {
  projectId: "00000000-0000-4000-8000-000000000001",
  title: "Adjust workstation",
  description: "Raise the workstation to reduce shoulder flexion",
};

describe("corrective-action body-side rules", () => {
  it("accepts an explicit side for an action payload", () => {
    expect(correctiveActionBodySchema.parse({ ...baseAction, bodySide: "LEFT" }).bodySide).toBe("LEFT");
    expect(correctiveActionBodySchema.parse({ ...baseAction, bodySide: "BOTH" }).bodySide).toBe("BOTH");
  });

  it("requires a side for actions linked to a RULA assessment", () => {
    expect(() => assertRulaActionBodySide(undefined, "RIGHT")).toThrow("body side");
    expect(() => assertRulaActionBodySide(null, "BOTH")).toThrow("body side");
  });

  it("does not allow an action to target a side absent from a single-side assessment", () => {
    expect(() => assertRulaActionBodySide("LEFT", "RIGHT")).toThrow("match");
    expect(() => assertRulaActionBodySide("RIGHT", "RIGHT")).not.toThrow();
    expect(() => assertRulaActionBodySide("LEFT", "BOTH")).not.toThrow();
  });
});
