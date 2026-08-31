import { describe, expect, it } from "vitest";
import { readStoredDraft, sanitizeDraft, writeStoredDraft, type AutoSaveStorage } from "./autoSave";

function storage(): AutoSaveStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe("form auto-save persistence", () => {
  it("round-trips drafts and tolerates malformed storage", () => {
    const target = storage();
    expect(writeStoredDraft(target, "draft", { title: "حرف اول", published: true })).toBe(true);
    expect(readStoredDraft(target, "draft")).toEqual({ title: "حرف اول", published: true });
    target.setItem("broken", "not-json");
    expect(readStoredDraft(target, "broken")).toBeNull();
  });

  it("sanitizes a one-character draft while excluding credentials and files", () => {
    expect(sanitizeDraft({ title: "ح", content: "یک عبارت", password: "secret", file: "ignored", published: true }, ["password", "file"])).toEqual({ title: "ح", content: "یک عبارت", published: true });
  });
});
