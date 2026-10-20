import { describe, expect, it } from "vitest";
import { ActionCreateIdempotency } from "./actionCreateIdempotency";

describe("action create idempotency", () => {
  it("reuses a key for the same pending payload and creates a new key after success", () => {
    let sequence = 0;
    const keys = new ActionCreateIdempotency(() => `attempt-${++sequence}`);
    const payload = { title: "Inspect machine", projectId: "project-1" };

    const first = keys.keyFor("action-form", payload);
    expect(keys.keyFor("action-form", payload)).toBe(first);

    keys.complete("action-form", payload);
    expect(keys.keyFor("action-form", payload)).not.toBe(first);
  });

  it("uses a new key when a pending payload changes and isolates request scopes", () => {
    let sequence = 0;
    const keys = new ActionCreateIdempotency(() => `attempt-${++sequence}`);
    const first = keys.keyFor("action-form", { title: "First" });

    const second = keys.keyFor("action-form", { title: "Second" });
    expect(second).not.toBe(first);
    expect(keys.keyFor("action-form", { title: "First" })).toBe(first);
    expect(keys.keyFor("rula-suggestion-1", { title: "First" })).not.toBe(first);
  });
});
