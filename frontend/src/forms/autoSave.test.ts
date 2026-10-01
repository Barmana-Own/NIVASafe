import { describe, expect, it } from "vitest";
import { assessmentDraftKey, readStoredDraft, sanitizeDraft, writeStoredDraft, type AutoSaveStorage } from "./autoSave";

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

  it("keeps security exclusions when a form adds its own excluded fields", () => {
    expect(sanitizeDraft({ title: "عنوان", password: "secret", accessToken: "token", file: "binary", published: true }, ["title"]))
      .toEqual({ published: true });
  });

  it("removes sensitive values from drafts that were stored before sanitization", () => {
    const target = storage();
    target.setItem("legacy", JSON.stringify({ title: "عنوان", password: "secret", refreshToken: "token", file: "binary" }));
    expect(readStoredDraft(target, "legacy")).toEqual({ title: "عنوان" });
  });

  it("sanitizes at the storage boundary as well as during snapshot and restore", () => {
    const target = storage();
    expect(writeStoredDraft(target, "secure", { title: "عنوان", password: "secret", token: "token" })).toBe(true);
    expect(target.getItem("secure")).toBe(JSON.stringify({ title: "عنوان" }));
  });

  it("keeps FMEA and RULA drafts isolated by user and organization", () => {
    expect(assessmentDraftKey("fmea", "user-1", "org-1")).toBe("nivasafe-draft:v1:fmea:user-1:org-1");
    expect(assessmentDraftKey("rula", null, "")).toBe("nivasafe-draft:v1:rula:guest:none");
  });
});
