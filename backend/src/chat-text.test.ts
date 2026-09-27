import { describe, expect, it } from "vitest";
import { conversationTitleFromMessage, isGenericConversationTitle, normaliseChatAnswer } from "./chat-text.js";

describe("chat text helpers", () => {
  it("creates a bounded topic from the first user message", () => {
    expect(conversationTitleFromMessage("  کنترل دستگاه\nجزئیات بیشتر  ")).toBe("کنترل دستگاه");
    expect(conversationTitleFromMessage("x".repeat(80))).toHaveLength(73);
    expect(conversationTitleFromMessage("گفتگو\n")).toBe("گفتگو");
  });

  it("recognises generated date-based conversation titles without treating custom titles as placeholders", () => {
    expect(isGenericConversationTitle("گفتگوی جدید ۱۴۰۵/۰۷/۰۵")).toBe(true);
    expect(isGenericConversationTitle("Conversation 2026-09-27")).toBe(true);
    expect(isGenericConversationTitle("کنترل ایمنی دستگاه پرس")).toBe(false);
  });

  it("repairs common concatenated Persian chat introductions while preserving normal text", () => {
    expect(normaliseChatAnswer("سلاممنچتبات NIVASafe هستم.")).toBe("سلام، من چت‌بات NIVASafe هستم.");
    expect(normaliseChatAnswer("پاسخ عادی با فاصله")).toBe("پاسخ عادی با فاصله");
  });
});
