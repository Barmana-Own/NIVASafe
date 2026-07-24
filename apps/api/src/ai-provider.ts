import { prisma } from "./core.js";

export interface AIProviderResult {
  provider: string;
  answer: string;
  citations: Array<{ id: string; title: string }>;
  confidence: number;
}

export interface AIProvider {
  readonly name: string;
  available(): boolean;
  unavailableReason(): string | null;
  analyze(input: { organizationId: string; message: string }): Promise<AIProviderResult>;
}

type KnowledgeDocumentRow = { id: string; title: string; content: string };

type KnowledgeContext = {
  context: string;
  citations: Array<{ id: string; title: string }>;
};

const systemInstruction = [
  "You are NIVASafe, a professional HSE assistant.",
  "Answer in the same language as the user.",
  "Prioritize elimination, substitution, engineering controls, administrative controls, and PPE in that order.",
  "Clearly distinguish general guidance from decisions that require a qualified HSE professional.",
  "Use the supplied organization knowledge when relevant and do not invent organization-specific facts.",
].join(" ");

async function loadKnowledge(organizationId: string, message: string): Promise<KnowledgeContext> {
  const terms = message.split(/\s+/).map((term) => term.trim()).filter((term) => term.length > 3).slice(0, 8);
  const documents: KnowledgeDocumentRow[] = await prisma.knowledgeDocument.findMany({
    where: {
      organizationId,
      published: true,
      deletedAt: null,
      ...(terms.length ? { OR: terms.flatMap((term) => [{ title: { contains: term } }, { content: { contains: term } }]) } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  return {
    context: documents.map((document, index) => `[${index + 1}] ${document.title}\n${document.content.slice(0, 1600)}`).join("\n\n"),
    citations: documents.map((document) => ({ id: document.id, title: document.title })),
  };
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let payload: unknown = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
    if (!response.ok) {
      const value = payload as { error?: { message?: string }; message?: string };
      throw Object.assign(new Error(value.error?.message ?? value.message ?? `AI provider returned HTTP ${response.status}`), {
        statusCode: response.status,
        code: "PROVIDER_REQUEST_FAILED",
      });
    }
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw Object.assign(new Error("AI provider request timed out"), { code: "PROVIDER_TIMEOUT" });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

class KnowledgeFallbackProvider implements AIProvider {
  readonly name = "fallback";
  available() { return true; }
  unavailableReason() { return null; }
  async analyze(input: { organizationId: string; message: string }): Promise<AIProviderResult> {
    const knowledge = await loadKnowledge(input.organizationId, input.message);
    const documents = knowledge.context.split("\n\n").filter(Boolean);
    const answer = documents.length
      ? `بر اساس پایگاه دانش سازمان:\n${documents.map((document) => document.split("\n").slice(1).join("\n").slice(0, 320)).join("\n")}`
      : "راهنمای پایه: خطر را شناسایی کنید، شدت و احتمال را بسنجید، کنترل‌های موجود را ثبت کنید، اقدام اصلاحی دارای مسئول و مهلت بسازید و نتیجه را به تأیید متخصص HSE برسانید.";
    return { provider: this.name, answer, confidence: documents.length ? 0.72 : 0.45, citations: knowledge.citations };
  }
}

abstract class HttpProvider implements AIProvider {
  abstract readonly name: string;
  constructor(protected readonly key: string | undefined, protected readonly model: string | undefined) {}
  available() { return process.env.AI_ENABLED === "true" && Boolean(this.key?.trim() && this.model?.trim()); }
  unavailableReason() {
    if (process.env.AI_ENABLED !== "true") return "AI_ENABLED is not true";
    if (!this.key?.trim()) return `${this.name.toUpperCase()} API key is missing`;
    if (!this.model?.trim()) return `${this.name.toUpperCase()} model is missing`;
    return null;
  }
  protected async prompt(input: { organizationId: string; message: string }) {
    const knowledge = await loadKnowledge(input.organizationId, input.message);
    const userText = knowledge.context
      ? `Organization knowledge:\n${knowledge.context}\n\nUser request:\n${input.message}`
      : input.message;
    return { userText, citations: knowledge.citations };
  }
  abstract analyze(input: { organizationId: string; message: string }): Promise<AIProviderResult>;
}

class OpenAIProvider extends HttpProvider {
  readonly name = "openai";
  async analyze(input: { organizationId: string; message: string }): Promise<AIProviderResult> {
    const { userText, citations } = await this.prompt(input);
    const payload = await fetchJson<{
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    }>("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, store: false, instructions: systemInstruction, input: userText }),
    });
    const answer = payload.output_text?.trim() || payload.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("\n").trim();
    if (!answer) throw Object.assign(new Error("OpenAI returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    return { provider: this.name, answer, confidence: 0.82, citations };
  }
}

class GeminiProvider extends HttpProvider {
  readonly name = "gemini";
  async analyze(input: { organizationId: string; message: string }): Promise<AIProviderResult> {
    const { userText, citations } = await this.prompt(input);
    const payload = await fetchJson<{
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }>(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model!)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": this.key!, "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: systemInstruction }] }, contents: [{ role: "user", parts: [{ text: userText }] }] }),
    });
    const answer = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
    if (!answer) throw Object.assign(new Error("Gemini returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    return { provider: this.name, answer, confidence: 0.8, citations };
  }
}

class AnthropicProvider extends HttpProvider {
  readonly name = "anthropic";
  async analyze(input: { organizationId: string; message: string }): Promise<AIProviderResult> {
    const { userText, citations } = await this.prompt(input);
    const payload = await fetchJson<{ content?: Array<{ type?: string; text?: string }> }>("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": this.key!, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, max_tokens: 1400, system: systemInstruction, messages: [{ role: "user", content: userText }] }),
    });
    const answer = payload.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n").trim();
    if (!answer) throw Object.assign(new Error("Anthropic returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    return { provider: this.name, answer, confidence: 0.8, citations };
  }
}

const providers: Record<string, AIProvider> = {
  fallback: new KnowledgeFallbackProvider(),
  openai: new OpenAIProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_CHAT_MODEL),
  gemini: new GeminiProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_CHAT_MODEL),
  anthropic: new AnthropicProvider(process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_CHAT_MODEL),
};

export function getAIProvider(name = process.env.AI_DEFAULT_PROVIDER ?? "fallback") {
  return providers[name] ?? providers.fallback!;
}

export function getAvailableAIProvider(name = process.env.AI_DEFAULT_PROVIDER ?? "fallback") {
  const selected = getAIProvider(name);
  return selected.available() ? selected : providers.fallback!;
}

export function listAIProviders() {
  return Object.values(providers).map((provider) => ({ name: provider.name, available: provider.available(), reason: provider.unavailableReason() }));
}
