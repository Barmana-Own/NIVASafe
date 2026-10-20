import { describe, expect, it } from "vitest";
import { buildRulaEvaluationRows } from "./rulaEvaluationRows";

describe("RULA unified evaluation rows", () => {
  it("keeps each action independent and preserves postures without actions", () => {
    const actions = [{ id: "a", affectedParts: ["neck"] }, { id: "b", affectedParts: ["neck"] }];
    const rows = buildRulaEvaluationRows([{ key: "neck" }, { key: "trunk" }], actions);
    expect(rows.map(row => [row.posture?.key, row.action?.id])).toEqual([["neck", "a"], ["neck", "b"], ["trunk", undefined]]);
    expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
  });
  it("includes general actions independently without losing multi-factor mappings", () => {
    const rows = buildRulaEvaluationRows([{ key: "neck" }, { key: "trunk" }], [
      { id: "shared", affectedParts: ["neck", "trunk"] },
      { id: "general1", affectedParts: [] }, { id: "general2", affectedParts: ["force"] },
    ]);
    expect(rows.map(row => row.action?.id)).toEqual(["shared", "shared", "general1", "general2"]);
    expect(rows.slice(2).every(row => row.posture === null)).toBe(true);
    expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
  });
  it("retains completed, unselected and persisted action identities for row controls", () => {
    const actions = [{ id: "draft", persistedId: "saved", affectedParts: ["neck"], status: "COMPLETED", progress: 100 }, { id: "pending", affectedParts: [], status: "UNSELECTED", progress: 0 }];
    const rows = buildRulaEvaluationRows([{ key: "neck" }], actions);
    expect(rows[0]?.id).toBe("neck:saved");
    expect(rows.map(row => row.action)).toEqual(actions);
  });
});
