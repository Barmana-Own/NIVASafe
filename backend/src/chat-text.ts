const genericConversationTitlePattern = /^(?:گفتگوی?\s*(?:جدید)?|new\s+conversation|conversation)(?:\s+[\d۰-۹٠-٩\s/._:-]+)?$/iu;

const concatenatedChatPhrases: Array<[RegExp, string]> = [
  [/سلام\s*من\s*چت\s*بات/giu, "سلام، من چت‌بات"],
  [/من\s*چت\s*بات/giu, "من چت‌بات"],
  [/دستیار\s*هوشمند/giu, "دستیار هوشمند"],
];

export function chatProviderUnavailableMessage(locale: "fa" | "en" = "fa"): string {
  return locale === "en"
    ? "Hello, I am the NIVASafe intelligent assistant for occupational health and safety management.\nThe server is currently unavailable; I will be ready to respond as soon as the connection is restored."
    : "سلام من دستیار هوشمند NIVASafe جهت مدیریت ایمنی و بهداشت حرفه‌ای هستم.\nدرحال حاضر امکان برقراری ارتباط با سرور را ندارم؛ اما به محض برقراری ارتباط پاسخگوی شما خواهم بود.";
}

export function conversationTitleFromMessage(content: string): string {
  const firstLine = content.replace(/\r\n?/gu, "\n").split("\n", 1)[0] ?? "";
  const normalized = firstLine.replace(/\s+/gu, " ").trim();
  if (!normalized) return "گفتگوی جدید";
  const characters = Array.from(normalized);
  return characters.length > 72 ? `${characters.slice(0, 72).join("").trimEnd()}…` : normalized;
}

export function isGenericConversationTitle(title: string): boolean {
  return genericConversationTitlePattern.test(title.replace(/\s+/gu, " ").trim());
}

export function normaliseChatAnswer(answer: string): string {
  const normalized = answer.normalize("NFKC").replace(/\r\n?/gu, "\n").replace(/[ \t]+$/gmu, "").trim();
  return concatenatedChatPhrases.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), normalized);
}
