import { describe, expect, it } from "vitest";
import { chatProviderUnavailableMessage, conversationTitleFromMessage, isGenericConversationTitle, normaliseChatAnswer } from "./chat-text.js";

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

  it("provides a localized, stable message when the chat model is unavailable", () => {
    expect(chatProviderUnavailableMessage("fa")).toBe("سلام من دستیار هوشمند NIVASafe جهت مدیریت ایمنی و بهداشت حرفه‌ای هستم.\nدرحال حاضر امکان برقراری ارتباط با سرور را ندارم؛ اما به محض برقراری ارتباط پاسخگوی شما خواهم بود.");
    expect(chatProviderUnavailableMessage("en")).toBe("Hello, I am the NIVASafe intelligent assistant for occupational health and safety management.\nThe server is currently unavailable; I will be ready to respond as soon as the connection is restored.");
  });
});
