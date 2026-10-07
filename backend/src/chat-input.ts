import { z } from "zod";

export const CHAT_MESSAGE_MAX_LENGTH = 32_000;
export const chatMessageSchema = z.object({ content: z.string().trim().min(2).max(CHAT_MESSAGE_MAX_LENGTH), locale: z.enum(["fa", "en"]).default("fa") });

// Failed offline answers are not useful model context; bound the remaining history.
export function chatHistory(messages: Array<{ role: string; content: string; provider?: string | null }>) {
  let remaining = 24_000;
  return messages.filter((item) => item.provider !== "fallback" && ["user", "assistant"].includes(item.role)).slice(0, 12).map((item) => {
    const content = item.content.slice(0, Math.min(8_000, remaining));
    remaining -= content.length;
    return { role: item.role as "user" | "assistant", content };
  }).filter((item) => item.content).reverse();
}
