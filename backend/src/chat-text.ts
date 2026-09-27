const genericConversationTitlePattern = /^(?:گفتگوی?\s*(?:جدید)?|new\s+conversation|conversation)(?:\s+[\d۰-۹٠-٩\s/._:-]+)?$/iu;

const concatenatedChatPhrases: Array<[RegExp, string]> = [
  [/سلام\s*من\s*چت\s*بات/giu, "سلام، من چت‌بات"],
  [/من\s*چت\s*بات/giu, "من چت‌بات"],
  [/دستیار\s*هوشمند/giu, "دستیار هوشمند"],
];

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
