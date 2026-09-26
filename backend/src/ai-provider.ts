import { Prisma } from "@prisma/client";
import { prisma } from "./core.js";

export interface AIProviderResult {
  provider: string;
  answer: string;
  citations: Array<{ id: string; title: string }>;
  confidence: number;
  usedFallback?: boolean;
  model?: string;
  usage?: AIUsage;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type AIConversationTurn = { role: "user" | "assistant"; content: string };
export type AIProviderInput = { organizationId: string; userId?: string; message: string; history?: AIConversationTurn[]; image?: { mimeType: string; base64: string } };

export interface AIProvider {
  readonly name: string;
  available(): boolean;
  unavailableReason(): string | null;
  supportsImages(): boolean;
  analyze(input: AIProviderInput): Promise<AIProviderResult>;
}

export type AIUseCase = "risk" | "chat";

type KnowledgeDocumentRow = { id: string; title: string; content: string; visibility: string; visibleUserIds: unknown; visibleOrganizationIds: unknown; isGlobal: boolean; aiOnly: boolean };

type KnowledgeContext = {
  context: string;
  citations: Array<{ id: string; title: string }>;
};

const MAX_DATABASE_INT = 2_147_483_647;
const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;
const MIN_PROVIDER_TIMEOUT_MS = 5_000;
const MAX_PROVIDER_TIMEOUT_MS = 60_000;
const DEFAULT_PROVIDER_MAX_ATTEMPTS = 2;
const MAX_PROVIDER_MAX_ATTEMPTS = 3;
const DEFAULT_PROVIDER_RETRY_DELAY_MS = 250;
const MAX_PROVIDER_RETRY_DELAY_MS = 5_000;
const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_CHARS_PER_TURN = 800;
const transientProviderStatusCodes = new Set([408, 425, 429, 500, 502, 503, 504]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function tokenCount(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= MAX_DATABASE_INT ? parsed : null;
}

function firstDefined(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

export function normaliseAIUsage(value: unknown): AIUsage | undefined {
  const source = asRecord(value);
  if (!source) return undefined;
  const inputTokens = tokenCount(firstDefined(source, ["input_tokens", "prompt_tokens", "promptTokenCount"]));
  const outputTokens = tokenCount(firstDefined(source, ["output_tokens", "completion_tokens", "candidatesTokenCount"]));
  const reportedTotal = tokenCount(firstDefined(source, ["total_tokens", "totalTokenCount"]));
  if (inputTokens === null && outputTokens === null && reportedTotal === null) return undefined;
  const safeInput = inputTokens ?? 0;
  const safeOutput = outputTokens ?? 0;
  return {
    inputTokens: safeInput,
    outputTokens: safeOutput,
    totalTokens: reportedTotal ?? Math.min(MAX_DATABASE_INT, safeInput + safeOutput),
  };
}

function normaliseModel(value: unknown, fallback?: string) {
  const candidate = typeof value === "string" && value.trim() ? value.trim() : fallback?.trim();
  return candidate ? candidate.slice(0, 128) : undefined;
}

function boundedEnvironmentInteger(name: string, fallback: number, minimum: number, maximum: number) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? Math.min(Math.max(parsed, minimum), maximum) : fallback;
}

function providerTimeoutMs() {
  return boundedEnvironmentInteger("AI_PROVIDER_TIMEOUT_MS", DEFAULT_PROVIDER_TIMEOUT_MS, MIN_PROVIDER_TIMEOUT_MS, MAX_PROVIDER_TIMEOUT_MS);
}

function providerMaxAttempts() {
  return boundedEnvironmentInteger("AI_PROVIDER_MAX_ATTEMPTS", DEFAULT_PROVIDER_MAX_ATTEMPTS, 1, MAX_PROVIDER_MAX_ATTEMPTS);
}

function providerRetryDelayMs() {
  return boundedEnvironmentInteger("AI_PROVIDER_RETRY_DELAY_MS", DEFAULT_PROVIDER_RETRY_DELAY_MS, 0, MAX_PROVIDER_RETRY_DELAY_MS);
}

type ProviderRequestError = Error & { statusCode?: number; code?: string; retryable?: boolean; retryAfterMs?: number };

function retryAfterMilliseconds(value: string | null) {
  if (!value?.trim()) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.trunc(seconds * 1_000), MAX_PROVIDER_RETRY_DELAY_MS);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.min(Math.max(timestamp - Date.now(), 0), MAX_PROVIDER_RETRY_DELAY_MS) : null;
}

function retryDelayMs(attempt: number, retryAfterMs: number | undefined) {
  if (retryAfterMs !== undefined) return Math.min(Math.max(retryAfterMs, 0), MAX_PROVIDER_RETRY_DELAY_MS);
  return Math.min(MAX_PROVIDER_RETRY_DELAY_MS, providerRetryDelayMs() * (2 ** Math.max(0, attempt - 1)));
}

function sleep(milliseconds: number) {
  return milliseconds > 0 ? new Promise<void>((resolve) => setTimeout(resolve, milliseconds)) : Promise.resolve();
}

function isRetryableProviderError(error: unknown) {
  const value = error as ProviderRequestError;
  if (value?.retryable !== undefined) return value.retryable;
  if (typeof value?.statusCode === "number") return transientProviderStatusCodes.has(value.statusCode);
  const cause = value instanceof Error ? (value as Error & { cause?: unknown }).cause : undefined;
  const causeCode = cause && typeof cause === "object" && "code" in cause
    ? String((cause as { code?: unknown }).code ?? "")
    : "";
  return value instanceof Error && (
    value.name === "TypeError"
    || ["PROVIDER_TIMEOUT", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(value.code ?? "")
    || ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(causeCode)
  );
}

export function describeAIProviderError(error: unknown) {
  const value = error as ProviderRequestError;
  if (value?.code === "PROVIDER_TIMEOUT") return "AI provider request timed out";
  if (value?.statusCode === 429) return "AI provider rate limit reached";
  if (typeof value?.statusCode === "number" && value.statusCode >= 500) return "AI provider is temporarily unavailable";
  return "AI provider is unavailable";
}

function systemInstruction(useCase: AIUseCase) {
  return [
    "You are the NIVASafe intelligent assistant for workplace safety and occupational health management (HSE).",
    useCase === "chat"
      ? "Introduce yourself as the NIVASafe intelligent assistant only when the user greets you or asks who you are."
      : "This is an assessment or risk-suggestion request. Do not introduce yourself, describe your identity as an assistant, or add a generic introductory preamble; start directly with the requested result.",
    "Answer in the same language as the user.",
    "Prioritize elimination, substitution, engineering controls, administrative controls, and PPE in that order.",
    "Clearly distinguish general guidance from decisions that require a qualified HSE professional.",
    "Use the supplied organization knowledge when relevant and do not invent organization-specific facts.",
  ].join(" ");
}

const knowledgeLimits = {
  chat: { maxDocuments: 3, maxCharsPerDocument: 900 },
  risk: { maxDocuments: 5, maxCharsPerDocument: 1600 },
} as const;

function outputTokenLimit(useCase: AIUseCase) {
  const environmentKey = useCase === "chat" ? "AI_CHAT_MAX_OUTPUT_TOKENS" : "AI_MAX_OUTPUT_TOKENS";
  const defaultLimit = useCase === "chat" ? 900 : 1600;
  const rawValue = process.env[environmentKey]?.trim();
  const configured = rawValue ? Number(rawValue) : defaultLimit;
  return Number.isFinite(configured) ? Math.min(Math.max(Math.trunc(configured), 128), 8000) : defaultLimit;
}

async function loadKnowledge(organizationId: string, message: string, userId: string | undefined, useCase: AIUseCase): Promise<KnowledgeContext> {
  const terms = message.split(/\s+/).map((term) => term.trim()).filter((term) => term.length > 3).slice(0, 8);
  const conditions: Prisma.KnowledgeDocumentWhereInput[] = [
    { OR: [{ organizationId }, { isGlobal: true }] },
    { deletedAt: null },
    { published: true },
    { aiReadable: true },
  ];
  if (terms.length) conditions.push({ OR: terms.flatMap((term) => [{ title: { contains: term } }, { content: { contains: term } }]) });
  const candidates: KnowledgeDocumentRow[] = await prisma.knowledgeDocument.findMany({
    where: { AND: conditions },
    orderBy: { updatedAt: "desc" },
    take: knowledgeLimits[useCase].maxDocuments,
    select: { id: true, title: true, content: true, visibility: true, visibleUserIds: true, visibleOrganizationIds: true, isGlobal: true, aiOnly: true },
  });
  const documents = candidates.filter((document) => {
    const organizationVisible = !document.isGlobal || !Array.isArray(document.visibleOrganizationIds) || document.visibleOrganizationIds.length === 0 || document.visibleOrganizationIds.includes(organizationId);
    const userVisible = document.visibility !== "SELECTED" || (Boolean(userId) && Array.isArray(document.visibleUserIds) && document.visibleUserIds.some((id) => id === userId));
    return organizationVisible && userVisible;
  });
  return {
    context: documents.map((document, index) => `[${index + 1}] ${document.title}\n${document.content.slice(0, knowledgeLimits[useCase].maxCharsPerDocument)}`).join("\n\n"),
    citations: documents.map((document) => ({ id: document.id, title: document.title })),
  };
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const maxAttempts = providerMaxAttempts();
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), providerTimeoutMs());
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const text = await response.text();
      let payload: unknown = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
      if (!response.ok) {
        const error = Object.assign(new Error(`AI provider returned HTTP ${response.status}`), {
          statusCode: response.status,
          code: "PROVIDER_REQUEST_FAILED",
          retryable: transientProviderStatusCodes.has(response.status),
          retryAfterMs: retryAfterMilliseconds(response.headers.get("retry-after")) ?? undefined,
        });
        if (attempt < maxAttempts && error.retryable) {
          await sleep(retryDelayMs(attempt, error.retryAfterMs));
          lastError = error;
          continue;
        }
        throw error;
      }
      return payload as T;
    } catch (error) {
      const normalized = error instanceof Error && error.name === "AbortError"
        ? Object.assign(new Error("AI provider request timed out"), { code: "PROVIDER_TIMEOUT", retryable: true })
        : error;
      lastError = normalized;
      if (attempt < maxAttempts && isRetryableProviderError(normalized)) {
        await sleep(retryDelayMs(attempt, (normalized as ProviderRequestError).retryAfterMs));
        continue;
      }
      throw normalized;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : Object.assign(new Error("AI provider is unavailable"), { code: "PROVIDER_UNAVAILABLE" });
}

class KnowledgeFallbackProvider implements AIProvider {
  readonly name = "fallback";
  constructor(private readonly useCase: AIUseCase = "chat") {}
  available() { return true; }
  unavailableReason() { return null; }
  supportsImages() { return false; }
  async analyze(input: AIProviderInput): Promise<AIProviderResult> {
    const knowledge = await loadKnowledge(input.organizationId, input.message, input.userId, this.useCase);
    const documents = knowledge.context.split("\n\n").filter(Boolean);
    const introduction = this.useCase === "chat" ? "من دستیار هوشمند سامانه NIVASafe برای مدیریت ایمنی و بهداشت حرفه‌ای هستم.\n\n" : "";
    const answer = documents.length
      ? `${introduction}بر اساس پایگاه دانش سازمان:\n${documents.map((document) => document.split("\n").slice(1).join("\n").slice(0, 320)).join("\n")}`
      : `${introduction}راهنمای پایه: خطر را شناسایی کنید، شدت و احتمال را بسنجید، کنترل‌های موجود را ثبت کنید، اقدام اصلاحی دارای مسئول و مهلت بسازید و نتیجه را به تأیید متخصص HSE برسانید.`;
    return { provider: this.name, answer, confidence: documents.length ? 0.72 : 0.45, citations: knowledge.citations };
  }
}

abstract class HttpProvider implements AIProvider {
  abstract readonly name: string;
  constructor(protected readonly key: string | undefined, protected readonly model: string | undefined, protected readonly useCase: AIUseCase) {}
  available() { return process.env.AI_ENABLED === "true" && Boolean(this.key?.trim() && this.model?.trim()); }
  supportsImages() { return false; }
  unavailableReason() {
    if (process.env.AI_ENABLED !== "true") return "AI_ENABLED is not true";
    if (!this.key?.trim()) return `${this.name.toUpperCase()} API key is missing`;
    if (!this.model?.trim()) return `${this.name.toUpperCase()} model is missing`;
    return null;
  }
  protected async prompt(input: AIProviderInput) {
    const knowledge = await loadKnowledge(input.organizationId, input.message, input.userId, this.useCase);
    const history = (input.history ?? []).slice(-MAX_HISTORY_TURNS).map((turn) => {
      const content = turn.content.trim().slice(0, MAX_HISTORY_CHARS_PER_TURN);
      return content ? `${turn.role === "assistant" ? "Assistant" : "User"}: ${content}` : "";
    }).filter(Boolean).join("\n");
    const sections = [
      knowledge.context ? `Organization knowledge (reference only):\n${knowledge.context}` : "",
      history ? `Recent conversation history (reference only):\n${history}` : "",
      `Current user request:\n${input.message}`,
    ].filter(Boolean);
    const userText = sections.join("\n\n");
    return { userText, citations: knowledge.citations };
  }
  abstract analyze(input: AIProviderInput): Promise<AIProviderResult>;
}

type ChatCompletionMessage = {
  content?: string | Array<{ text?: string }> | null;
};

type ChatCompletionPayload = {
  choices?: Array<{ message?: ChatCompletionMessage }>;
  model?: unknown;
  usage?: unknown;
};

function extractChatCompletionText(payload: ChatCompletionPayload) {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("\n").trim();
  return "";
}

const assessmentIntroductionPatterns = [
  /^\s*من دستیار هوشمند(?: سامانه)? NIVASafe[^.\n]*(?:[.!؟]\s*)+/iu,
  /^\s*I am(?: the)? NIVASafe(?: intelligent)? assistant[^.\n]*(?:[.!?]\s*)+/i,
];

function normaliseAIAnswer(answer: string, useCase: AIUseCase) {
  if (useCase !== "risk") return answer.trim();
  return assessmentIntroductionPatterns.reduce((result, pattern) => result.replace(pattern, ""), answer).trim();
}

function normaliseBaseUrl(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !localDevelopment) || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

class ArvanCloudProvider extends HttpProvider {
  readonly name = "arvancloud";
  private readonly baseUrl: string | null;

  constructor(key: string | undefined, model: string | undefined, baseUrl: string | undefined, useCase: AIUseCase) {
    super(key, model, useCase);
    this.baseUrl = normaliseBaseUrl(baseUrl);
  }

  available() {
    return super.available() && Boolean(this.baseUrl);
  }

  unavailableReason() {
    const reason = super.unavailableReason();
    if (reason) return reason;
    return this.baseUrl ? null : "ARVAN_BASE_URL is invalid";
  }

  async analyze(input: AIProviderInput): Promise<AIProviderResult> {
    const { userText, citations } = await this.prompt(input);
    const messageContent = input.image ? [
      { type: "text", text: userText },
      { type: "image_url", image_url: { url: `data:${input.image.mimeType};base64,${input.image.base64}` } },
    ] : userText;
    const payload = await fetchJson<ChatCompletionPayload>(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "system", content: systemInstruction(this.useCase) }, { role: "user", content: messageContent }],
        max_tokens: outputTokenLimit(this.useCase),
      }),
    });
    const answer = normaliseAIAnswer(extractChatCompletionText(payload), this.useCase);
    if (!answer) throw Object.assign(new Error("ArvanCloud AI returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    const model = normaliseModel(payload.model, this.model);
    const usage = normaliseAIUsage(payload.usage);
    return { provider: this.name, answer, confidence: 0.82, citations, ...(model ? { model } : {}), ...(usage ? { usage } : {}) };
  }

  supportsImages() { return true; }
}

class OpenAIProvider extends HttpProvider {
  readonly name = "openai";
  constructor(key: string | undefined, model: string | undefined, useCase: AIUseCase) { super(key, model, useCase); }
  async analyze(input: AIProviderInput): Promise<AIProviderResult> {
    const { userText, citations } = await this.prompt(input);
    const payload = await fetchJson<{
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
      model?: unknown;
      usage?: unknown;
    }>("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, store: false, instructions: systemInstruction(this.useCase), input: userText, max_output_tokens: outputTokenLimit(this.useCase) }),
    });
    const answer = normaliseAIAnswer(payload.output_text?.trim() || payload.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("\n").trim() || "", this.useCase);
    if (!answer) throw Object.assign(new Error("OpenAI returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    const model = normaliseModel(payload.model, this.model);
    const usage = normaliseAIUsage(payload.usage);
    return { provider: this.name, answer, confidence: 0.82, citations, ...(model ? { model } : {}), ...(usage ? { usage } : {}) };
  }
}

class GeminiProvider extends HttpProvider {
  readonly name = "gemini";
  constructor(key: string | undefined, model: string | undefined, useCase: AIUseCase) { super(key, model, useCase); }
  async analyze(input: AIProviderInput): Promise<AIProviderResult> {
    const { userText, citations } = await this.prompt(input);
    const payload = await fetchJson<{
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      model?: unknown;
      usageMetadata?: unknown;
    }>(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model!)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": this.key!, "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: systemInstruction(this.useCase) }] }, contents: [{ role: "user", parts: [{ text: userText }] }], generationConfig: { maxOutputTokens: outputTokenLimit(this.useCase) } }),
    });
    const answer = normaliseAIAnswer(payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() || "", this.useCase);
    if (!answer) throw Object.assign(new Error("Gemini returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    const model = normaliseModel(payload.model, this.model);
    const usage = normaliseAIUsage(payload.usageMetadata);
    return { provider: this.name, answer, confidence: 0.8, citations, ...(model ? { model } : {}), ...(usage ? { usage } : {}) };
  }
}

class AnthropicProvider extends HttpProvider {
  readonly name = "anthropic";
  constructor(key: string | undefined, model: string | undefined, useCase: AIUseCase) { super(key, model, useCase); }
  async analyze(input: AIProviderInput): Promise<AIProviderResult> {
    const { userText, citations } = await this.prompt(input);
    const payload = await fetchJson<{ content?: Array<{ type?: string; text?: string }>; model?: unknown; usage?: unknown }>("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": this.key!, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, max_tokens: outputTokenLimit(this.useCase), system: systemInstruction(this.useCase), messages: [{ role: "user", content: userText }] }),
    });
    const answer = normaliseAIAnswer(payload.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n").trim() || "", this.useCase);
    if (!answer) throw Object.assign(new Error("Anthropic returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    const model = normaliseModel(payload.model, this.model);
    const usage = normaliseAIUsage(payload.usage);
    return { provider: this.name, answer, confidence: 0.8, citations, ...(model ? { model } : {}), ...(usage ? { usage } : {}) };
  }
}

class FailoverProvider implements AIProvider {
  name: string;

  constructor(private readonly candidates: AIProvider[]) {
    this.name = candidates[0]?.name ?? "fallback";
  }

  available() { return this.candidates.some((candidate) => candidate.available()); }

  unavailableReason() { return this.candidates.find((candidate) => candidate.available()) ? null : this.candidates.map((candidate) => candidate.unavailableReason()).filter(Boolean).join("; ") || "No AI provider is available"; }
  supportsImages() { return this.candidates.some((candidate) => candidate.available() && candidate.supportsImages()); }

  async analyze(input: AIProviderInput): Promise<AIProviderResult> {
    let lastError: unknown;
    for (const [index, candidate] of this.candidates.entries()) {
      if (!candidate.available()) continue;
      if (input.image && !candidate.supportsImages()) continue;
      try {
        const result = await candidate.analyze(input);
        this.name = candidate.name;
        return index === 0 ? result : { ...result, usedFallback: true };
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError instanceof Error) throw lastError;
    throw Object.assign(new Error("No AI provider is available"), { code: "PROVIDER_UNAVAILABLE" });
  }
}

const providerNames = ["fallback", "arvancloud", "openai", "gemini", "anthropic"] as const;

function configuredProviderName(useCase: AIUseCase) {
  const configured = useCase === "risk" ? process.env.AI_RISK_PROVIDER : process.env.AI_CHAT_PROVIDER;
  return (configured ?? process.env.AI_DEFAULT_PROVIDER ?? "fallback").trim().toLowerCase();
}

function modelFor(provider: "openai" | "gemini" | "anthropic", useCase: AIUseCase) {
  const roleModel = useCase === "risk" ? process.env.AI_RISK_MODEL : process.env.AI_CHAT_MODEL;
  if (provider === "openai") return roleModel ?? process.env.OPENAI_CHAT_MODEL;
  if (provider === "gemini") return roleModel ?? process.env.GEMINI_CHAT_MODEL;
  return roleModel ?? process.env.ANTHROPIC_CHAT_MODEL;
}

function configuredRiskFallbackProviderName() {
  const configured = (process.env.AI_RISK_FALLBACK_PROVIDER ?? "arvancloud").trim().toLowerCase();
  return providerNames.includes(configured as (typeof providerNames)[number]) ? configured : "arvancloud";
}

function createProvider(name: string, useCase: AIUseCase, modelOverride?: string): AIProvider {
  switch (name) {
    case "arvancloud": return new ArvanCloudProvider(process.env.ARVAN_API_KEY, modelOverride ?? (useCase === "risk" ? process.env.AI_RISK_MODEL : process.env.AI_CHAT_MODEL), process.env.ARVAN_BASE_URL ?? "https://api.arvancloudai.ir/v1", useCase);
    case "openai": return new OpenAIProvider(process.env.OPENAI_API_KEY, modelOverride ?? modelFor("openai", useCase), useCase);
    case "gemini": return new GeminiProvider(process.env.GEMINI_API_KEY, modelOverride ?? modelFor("gemini", useCase), useCase);
    case "anthropic": return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, modelOverride ?? modelFor("anthropic", useCase), useCase);
    default: return new KnowledgeFallbackProvider(useCase);
  }
}

export function getConfiguredAIProviderName(useCase: AIUseCase = "chat") {
  const name = configuredProviderName(useCase);
  return providerNames.includes(name as (typeof providerNames)[number]) ? name : "fallback";
}

export function getAIProvider(name = getConfiguredAIProviderName("chat"), useCase: AIUseCase = "chat", modelOverride?: string) {
  return createProvider(name, useCase, modelOverride);
}

export const ASSESSMENT_AI_MODEL = "GPT-5-Mini";

export function getAvailableAIProvider(useCase: AIUseCase = "chat", modelOverride?: string) {
  const selected = getAIProvider(getConfiguredAIProviderName(useCase), useCase, modelOverride);
  const fallback = getAIProvider("fallback", useCase);
  const candidates: AIProvider[] = [selected];
  if (useCase === "risk" && process.env.AI_RISK_FALLBACK_MODEL?.trim()) {
    const fallbackProviderName = configuredRiskFallbackProviderName();
    if (fallbackProviderName !== "fallback") candidates.push(getAIProvider(fallbackProviderName, useCase, modelOverride ?? process.env.AI_RISK_FALLBACK_MODEL));
  }
  if (selected.name !== fallback.name) candidates.push(fallback);
  return new FailoverProvider(candidates);
}

export function getAvailableAssessmentAIProvider() {
  return getAvailableAIProvider("risk", ASSESSMENT_AI_MODEL);
}

export function getRoutedAIProvider(useCase: AIUseCase, requestedProvider?: string) {
  const configured = getConfiguredAIProviderName(useCase);
  const requested = requestedProvider?.trim().toLowerCase();
  if (useCase === "risk" && (!requested || requested === configured)) return getAvailableAIProvider("risk");
  return getAIProvider(requested || configured, useCase);
}

export function listAIProviders() {
  const configuredRisk = getConfiguredAIProviderName("risk");
  const configuredChat = getConfiguredAIProviderName("chat");
  return providerNames.map((name) => {
    const risk = getAIProvider(name, "risk");
    const chat = getAIProvider(name, "chat");
    return {
      name,
      available: risk.available() || chat.available(),
      reason: chat.available() || risk.available() ? null : chat.unavailableReason() ?? risk.unavailableReason(),
      riskModel: name === "arvancloud" ? process.env.AI_RISK_MODEL ?? null : null,
      chatModel: name === "arvancloud" ? process.env.AI_CHAT_MODEL ?? null : null,
      riskFallbackProvider: name === configuredRisk ? configuredRiskFallbackProviderName() : null,
      riskFallbackModel: name === configuredRisk ? process.env.AI_RISK_FALLBACK_MODEL ?? null : null,
      configuredForRisk: configuredRisk === name,
      configuredForChat: configuredChat === name,
    };
  });
}
