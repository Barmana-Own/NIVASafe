import { describe, expect, it } from "vitest";
import { chatHistory, chatMessageSchema } from "./chat-input.js";

describe("chat input and context boundaries", () => {
  it("accepts long prompts without truncating their end and rejects excessive input", () => {
    const content = "الف".repeat(10_000) + " END";
    expect(chatMessageSchema.parse({ content }).content).toBe(content);
    expect(chatMessageSchema.safeParse({ content: "a".repeat(32_001) }).success).toBe(false);
  });
  it("keeps only this supplied conversation and excludes offline answers", () => {
    expect(chatHistory([{ role: "assistant", content: "offline", provider: "fallback" }, { role: "user", content: "new question" }, { role: "assistant", content: "previous answer", provider: "gapgpt" }])).toEqual([{ role: "assistant", content: "previous answer" }, { role: "user", content: "new question" }]);
  });
  it("bounds context while prioritizing the newest turns", () => {
    const result = chatHistory(Array.from({ length: 12 }, (_, id) => ({ role: "user", content: `${id}:` + "x".repeat(10_000) })));
    expect(result.reduce((total, item) => total + item.content.length, 0)).toBe(24_000);
    expect(result.at(-1)?.content.startsWith("0:")).toBe(true);
  });
});
