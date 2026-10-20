import { Prisma } from "@prisma/client";
import { prisma } from "./core.js";
import { isAIAccessError, withAIAllowance } from "./ai-access.js";
import { chatProviderUnavailableMessage, normaliseChatAnswer } from "./chat-text.js";

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
export type AIImagePurpose = "fmea-process" | "rula-posture";
export type AIProviderInput = { organizationId: string; userId?: string; message: string; locale?: "fa" | "en"; history?: AIConversationTurn[]; imagePurpose?: AIImagePurpose; textPurpose?: "fmea-action-suggestions"; image?: { mimeType: string; base64: string }; includeKnowledge?: boolean; maxOutputTokens?: number; structuredOutput?: boolean };

export interface AIProvider {
  readonly name: string;
  available(): boolean;
  unavailableReason(): string | null;
  supportsImages(input?: Pick<AIProviderInput, "imagePurpose">): boolean;
  analyze(input: AIProviderInput): Promise<AIProviderResult>;
}

export type AIUseCase = "risk" | "chat";

export const ASSESSMENT_AI_MODEL = "GPT-5-Mini";
export const CHAT_AI_MODEL = "DeepSeek-V4-Flash";
export const ASSESSMENT_AI_PROVIDER = "arvancloud";
export const ASSESSMENT_AI_GATEWAY = "https://api.arvancloudai.ir/v1";

function assessmentProviderPolicyError() {
  return Object.assign(new Error("Assessments require the approved ArvanCloud GPT-5-Mini route"), { statusCode: 503, code: "ASSESSMENT_PROVIDER_NOT_APPROVED", retryable: false });
}

type KnowledgeDocumentRow = { id: string; title: string; content: string; tags: unknown; visibility: string; visibleUserIds: unknown; visibleOrganizationIds: unknown; isGlobal: boolean; aiOnly: boolean; updatedAt: Date };

type KnowledgeContext = {
  context: string;
  citations: Array<{ id: string; title: string }>;
};

const MAX_DATABASE_INT = 2_147_483_647;
const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;
const MIN_PROVIDER_TIMEOUT_MS = 5_000;
const MAX_PROVIDER_TIMEOUT_MS = 60_000;
const MAX_RULA_IMAGE_TIMEOUT_MS = 120_000;
const DEFAULT_PROVIDER_MAX_ATTEMPTS = 2;
const MAX_PROVIDER_MAX_ATTEMPTS = 3;
const DEFAULT_PROVIDER_RETRY_DELAY_MS = 250;
const MAX_PROVIDER_RETRY_DELAY_MS = 5_000;
const MAX_HISTORY_TURNS = 12;
const MAX_HISTORY_CHARS_PER_TURN = 8_000;
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

function normaliseModel(value: unknown) {
  const candidate = typeof value === "string" && value.trim() ? value.trim() : undefined;
  return candidate ? candidate.slice(0, 128) : undefined;
}

function matchesConfiguredModel(reported: string, configured: string, provider?: string) {
  const actual = reported.trim().toLowerCase();
  const expected = configured.trim().toLowerCase();
  if (actual === expected) return true;
  // The authenticated Arvan gateway also returns this exact namespace for
  // GPT-5-Mini. Preserve that effective ID; it does not change the request ID
  // or permit another GPT family, namespace, endpoint, or chatbot model.
  if (provider === ASSESSMENT_AI_PROVIDER && expected === "gpt-5-mini" && actual === "openai/gpt-5-mini") return true;
  return expected === "gpt-5-mini" && /^gpt-5-mini-\d{4}-\d{2}-\d{2}$/.test(actual);
}

function providerModel(reported: unknown, configured: string | undefined, provider?: string) {
  const actual = normaliseModel(reported);
  if (actual && configured && !matchesConfiguredModel(actual, configured, provider)) {
    throw Object.assign(new Error("AI provider returned a different model than configured"), { code: "AI_MODEL_MISMATCH" });
  }
  return actual;
}

function outputTokenOptions(model: string | undefined, input: AIProviderInput, useCase: AIUseCase, includeReasoningEffort = true) {
  const maxTokens = outputTokenLimit(useCase, input.maxOutputTokens);
  if (model?.toLowerCase().startsWith("gpt-5")) {
    const structured = Boolean(input.image || input.structuredOutput);
    return {
      max_completion_tokens: maxTokens,
      ...(structured ? {
        ...(includeReasoningEffort ? { reasoning_effort: "low" } : {}),
        response_format: { type: "json_object" },
      } : {}),
    };
  }
  return { max_tokens: maxTokens };
}

function configuredModel(useCase: AIUseCase) {
  return useCase === "risk" ? ASSESSMENT_AI_MODEL : CHAT_AI_MODEL;
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

function rulaImageTimeoutMs() {
  return boundedEnvironmentInteger("RULA_IMAGE_PROVIDER_TIMEOUT_MS", MAX_PROVIDER_TIMEOUT_MS, MAX_PROVIDER_TIMEOUT_MS, MAX_RULA_IMAGE_TIMEOUT_MS);
}

function providerMaxAttempts() {
  return boundedEnvironmentInteger("AI_PROVIDER_MAX_ATTEMPTS", DEFAULT_PROVIDER_MAX_ATTEMPTS, 1, MAX_PROVIDER_MAX_ATTEMPTS);
}

function providerRetryDelayMs() {
  return boundedEnvironmentInteger("AI_PROVIDER_RETRY_DELAY_MS", DEFAULT_PROVIDER_RETRY_DELAY_MS, 0, MAX_PROVIDER_RETRY_DELAY_MS);
}

type ProviderRequestError = Error & { statusCode?: number; code?: string; retryable?: boolean; retryAfterMs?: number; upstreamRequestId?: string; providerErrorCode?: string };

const safeProviderErrorCodes = new Set([
  "access_denied",
  "account_deactivated",
  "authentication_error",
  "billing_hard_limit_reached",
  "insufficient_permissions",
  "insufficient_quota",
  "invalid_api_key",
  "invalid_request_error",
  "model_access_denied",
  "model_not_found",
  "model_not_supported",
  "permission_denied",
  "quota_exceeded",
  "rate_limit_exceeded",
  "unauthorized",
  "unsupported_media_type",
  "unsupported_model",
  "unsupported_parameter",
  "unsupported_value",
  "vision_not_supported",
]);

function safeProviderRequestId(response: Response) {
  for (const header of ["x-request-id", "request-id", "x-correlation-id"]) {
    const value = response.headers.get(header)?.trim();
    if (value && /^(?:req_)?[A-F0-9]{8}-(?:[A-F0-9]{4}-){3}[A-F0-9]{12}$/iu.test(value)) return value;
  }
  return undefined;
}

function safeProviderErrorCode(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const record = payload as { code?: unknown; error?: unknown };
  const error = record.error && typeof record.error === "object" && !Array.isArray(record.error)
    ? record.error as { code?: unknown }
    : undefined;
  const code = error?.code ?? record.code;
  if (typeof code !== "string") return undefined;
  const normalized = code.trim().toLowerCase();
  return safeProviderErrorCodes.has(normalized) ? normalized : undefined;
}

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
    useCase === "chat" ? "Preserve normal word spacing and punctuation; never concatenate separate words. In Persian, use regular spaces between separate words and use a zero-width non-joiner only for true compound words." : "",
    "Prioritize elimination, substitution, engineering controls, administrative controls, and PPE in that order.",
    "Clearly distinguish general guidance from decisions that require a qualified HSE professional.",
    "Use the supplied organization knowledge when relevant and do not invent organization-specific facts.",
  ].join(" ");
}

const knowledgeLimits = {
  chat: { maxDocuments: 3, maxCharsPerDocument: 900, candidateDocuments: 100 },
  risk: { maxDocuments: 5, maxCharsPerDocument: 1600, candidateDocuments: 100 },
} as const;

const knowledgeStopWords = new Set([
  "برای", "درباره", "چیست", "چطور", "چگونه", "شود", "کنید", "است", "این", "آن", "یک", "های", "را", "به", "از", "در", "با", "و", "یا", "که", "the", "and", "for", "with", "what", "how", "are", "this", "that",
]);

function normaliseKnowledgeText(value: string) {
  return value.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/\u200c/g, " ").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function knowledgeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => normaliseKnowledgeText(item)) : [];
}

function knowledgeSearchTerms(message: string) {
  return [...new Set(normaliseKnowledgeText(message).split(/\s+/).filter((term) => term.length >= 3 && !knowledgeStopWords.has(term)))].slice(0, 12);
}

function knowledgeRelevance(document: KnowledgeDocumentRow, terms: string[]) {
  if (!terms.length) return 0;
  const title = normaliseKnowledgeText(document.title);
  const tags = knowledgeStringArray(document.tags).join(" ");
  const content = normaliseKnowledgeText(document.content.slice(0, 20_000));
  return terms.reduce((score, term) => score + (title.includes(term) ? 6 : 0) + (tags.includes(term) ? 4 : 0) + (content.includes(term) ? 1 : 0), 0);
}

function knowledgeUpdatedAt(document: KnowledgeDocumentRow) {
  return document.updatedAt instanceof Date ? document.updatedAt.getTime() : 0;
}

function outputTokenLimit(useCase: AIUseCase, requested?: number) {
  const environmentKey = useCase === "chat" ? "AI_CHAT_MAX_OUTPUT_TOKENS" : "AI_MAX_OUTPUT_TOKENS";
  const defaultLimit = useCase === "chat" ? 900 : 1600;
  const rawValue = process.env[environmentKey]?.trim();
  const configured = requested !== undefined && Number.isFinite(requested) ? requested : rawValue ? Number(rawValue) : defaultLimit;
  return Number.isFinite(configured) ? Math.min(Math.max(Math.trunc(configured), 128), 8000) : defaultLimit;
}

async function loadKnowledge(organizationId: string, message: string, userId: string | undefined, useCase: AIUseCase): Promise<KnowledgeContext> {
  const terms = knowledgeSearchTerms(message);
  const conditions: Prisma.KnowledgeDocumentWhereInput[] = [
    { OR: [{ organizationId }, { isGlobal: true }] },
    { deletedAt: null },
    { published: true },
    { aiReadable: true },
  ];
  const candidates: KnowledgeDocumentRow[] = await prisma.knowledgeDocument.findMany({
    where: { AND: conditions },
    orderBy: { updatedAt: "desc" },
    take: knowledgeLimits[useCase].candidateDocuments,
    select: { id: true, title: true, content: true, tags: true, visibility: true, visibleUserIds: true, visibleOrganizationIds: true, isGlobal: true, aiOnly: true, updatedAt: true },
  });
  const visible = candidates.filter((document) => {
    const organizationVisible = !document.isGlobal || !Array.isArray(document.visibleOrganizationIds) || document.visibleOrganizationIds.length === 0 || document.visibleOrganizationIds.includes(organizationId);
    const userVisible = document.visibility !== "HIDDEN" && (document.visibility !== "SELECTED" || (Boolean(userId) && Array.isArray(document.visibleUserIds) && document.visibleUserIds.some((id) => id === userId)));
    return organizationVisible && userVisible;
  });
  const ranked = visible.map((document) => ({ document, score: knowledgeRelevance(document, terms) })).sort((left, right) => right.score - left.score || knowledgeUpdatedAt(right.document) - knowledgeUpdatedAt(left.document));
  const relevant = terms.length ? ranked.filter((item) => item.score > 0) : [];
  const documents = (relevant.length ? relevant : ranked).slice(0, knowledgeLimits[useCase].maxDocuments).map((item) => item.document);
  return {
    context: documents.map((document, index) => {
      const tags = knowledgeStringArray(document.tags);
      const tagLine = tags.length ? `\nTags: ${tags.join(", ")}` : "";
      return `[${index + 1}] ${document.title}${tagLine}\n${document.content.slice(0, knowledgeLimits[useCase].maxCharsPerDocument)}`;
    }).join("\n\n"),
    citations: documents.map((document) => ({ id: document.id, title: document.title })),
  };
}

async function fetchJson<T>(url: string, init: RequestInit, options?: { maxAttempts: number; timeoutMs: number }): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? providerMaxAttempts();
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? providerTimeoutMs());
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const text = await response.text();
      let payload: unknown = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
      if (!response.ok) {
        const upstreamRequestId = safeProviderRequestId(response);
        const providerErrorCode = safeProviderErrorCode(payload);
        const error = Object.assign(new Error(`AI provider returned HTTP ${response.status}`), {
          statusCode: response.status,
          code: "PROVIDER_REQUEST_FAILED",
          retryable: transientProviderStatusCodes.has(response.status),
          retryAfterMs: retryAfterMilliseconds(response.headers.get("retry-after")) ?? undefined,
          ...(upstreamRequestId ? { upstreamRequestId } : {}),
          ...(providerErrorCode ? { providerErrorCode } : {}),
        });
        if (attempt < maxAttempts && error.retryable) {
          await sleep(retryDelayMs(attempt, error.retryAfterMs));
          if (isAIAccessError(error)) throw error;
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
    if (this.useCase === "chat") {
      return { provider: this.name, answer: chatProviderUnavailableMessage(input.locale), confidence: 0, citations: [] };
    }
    const knowledge = input.includeKnowledge === false ? { context: "", citations: [] } : await loadKnowledge(input.organizationId, input.message, input.userId, this.useCase);
    const documents = knowledge.context.split("\n\n").filter(Boolean);
    const answer = documents.length
      ? `بر اساس پایگاه دانش سازمان:\n${documents.map((document) => document.split("\n").slice(1).join("\n").slice(0, 320)).join("\n")}`
      : "راهنمای پایه: خطر را شناسایی کنید، شدت و احتمال را بسنجید، کنترل‌های موجود را ثبت کنید، اقدام اصلاحی دارای مسئول و مهلت بسازید و نتیجه را به تأیید متخصص HSE برسانید.";
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
    let knowledge: Awaited<ReturnType<typeof loadKnowledge>> = { context: "", citations: [] };
    if (input.includeKnowledge !== false) {
      try {
        knowledge = await loadKnowledge(input.organizationId, input.message, input.userId, this.useCase);
      } catch (error) {
        if (this.useCase !== "chat") throw error;
        // Knowledge is supplementary to chat; do not misreport its outage as model disconnection.
        console.warn(JSON.stringify({ event: "CHAT_KNOWLEDGE_UNAVAILABLE", provider: this.name }));
      }
    }
    let historyBudget = 24_000;
    const history = (input.history ?? []).slice(-MAX_HISTORY_TURNS).reverse().map((turn) => {
      const content = turn.content.trim().slice(0, Math.min(MAX_HISTORY_CHARS_PER_TURN, historyBudget));
      historyBudget -= content.length;
      return content ? `${turn.role === "assistant" ? "Assistant" : "User"}: ${content}` : "";
    }).filter(Boolean).reverse().join("\n");
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
  if (useCase !== "risk") return normaliseChatAnswer(answer);
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
    return super.available() && Boolean(this.baseUrl) && (this.useCase !== "risk" || this.baseUrl === ASSESSMENT_AI_GATEWAY);
  }

  unavailableReason() {
    const reason = super.unavailableReason();
    if (reason) return reason;
    if (this.useCase === "risk" && this.baseUrl !== ASSESSMENT_AI_GATEWAY) return "Assessments require the approved ArvanCloud gateway";
    return this.baseUrl ? null : "ARVAN_BASE_URL is invalid";
  }

  async analyze(input: AIProviderInput): Promise<AIProviderResult> {
    if (this.useCase === "risk" && this.baseUrl !== ASSESSMENT_AI_GATEWAY) throw assessmentProviderPolicyError();
    if (this.useCase === "risk" && !this.available()) throw Object.assign(new Error("Assessment AI is unavailable"), { statusCode: 503, code: "PROVIDER_UNAVAILABLE", retryable: false });
    const { userText, citations } = await this.prompt(input);
    const messageContent = input.image ? [
      { type: "text", text: userText },
      { type: "image_url", image_url: { url: `data:${input.image.mimeType};base64,${input.image.base64}`, ...(input.imagePurpose === "rula-posture" ? {detail:"high"} : {}) } },
    ] : userText;
    const payload = await fetchJson<ChatCompletionPayload>(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "system", content: systemInstruction(this.useCase) }, { role: "user", content: messageContent }],
        ...outputTokenOptions(this.model, input, this.useCase, false),
        ...(this.model?.toLowerCase().startsWith("gpt-5") && (input.image || input.structuredOutput) ? {} : input.image || input.structuredOutput ? { response_format: { type: "json_object" } } : {}),
      }),
    }, input.imagePurpose === "rula-posture" ? { maxAttempts: 1, timeoutMs: rulaImageTimeoutMs() }
      : this.useCase === "chat" ? { maxAttempts: 1, timeoutMs: 60_000 }
      // This automatic report batch has a 90-second client deadline. Allow a
      // slow completion to finish, with five seconds left for error delivery.
      // A single attempt avoids duplicating a paid call after a timeout.
      : input.textPurpose === "fmea-action-suggestions" ? { maxAttempts: 1, timeoutMs: 85_000 } : undefined);
    const answer = normaliseAIAnswer(extractChatCompletionText(payload), this.useCase);
    if (!answer) throw Object.assign(new Error("ArvanCloud AI returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    const model = providerModel(payload.model, this.model, this.name);
    const usage = normaliseAIUsage(payload.usage);
    return { provider: this.name, answer, confidence: 0.82, citations, ...(model ? { model } : {}), ...(usage ? { usage } : {}) };
  }

  supportsImages() { return true; }
}

class GapGptProvider extends HttpProvider {
  readonly name = "gapgpt";
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
    return this.baseUrl ? null : "GAPGPT_BASE_URL is invalid";
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
        ...outputTokenOptions(this.model, input, this.useCase),
      }),
    }, input.imagePurpose === "rula-posture" ? { maxAttempts: 1, timeoutMs: MAX_PROVIDER_TIMEOUT_MS } : this.useCase === "chat" ? { maxAttempts: 1, timeoutMs: 60_000 } : undefined);
    const answer = normaliseAIAnswer(extractChatCompletionText(payload), this.useCase);
    if (!answer) throw Object.assign(new Error("GapGPT returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    const model = providerModel(payload.model, this.model);
    const usage = normaliseAIUsage(payload.usage);
    return { provider: this.name, answer, confidence: 0.82, citations, ...(model ? { model } : {}), ...(usage ? { usage } : {}) };
  }

  supportsImages(input?: Pick<AIProviderInput, "imagePurpose">) { return input?.imagePurpose === "rula-posture"; }
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
      body: JSON.stringify({ model: this.model, store: false, instructions: systemInstruction(this.useCase), input: userText, max_output_tokens: outputTokenLimit(this.useCase, input.maxOutputTokens) }),
    });
    const answer = normaliseAIAnswer(payload.output_text?.trim() || payload.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("\n").trim() || "", this.useCase);
    if (!answer) throw Object.assign(new Error("OpenAI returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    const model = providerModel(payload.model, this.model);
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
      body: JSON.stringify({ system_instruction: { parts: [{ text: systemInstruction(this.useCase) }] }, contents: [{ role: "user", parts: [{ text: userText }] }], generationConfig: { maxOutputTokens: outputTokenLimit(this.useCase, input.maxOutputTokens) } }),
    });
    const answer = normaliseAIAnswer(payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() || "", this.useCase);
    if (!answer) throw Object.assign(new Error("Gemini returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    const model = providerModel(payload.model, this.model);
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
      body: JSON.stringify({ model: this.model, max_tokens: outputTokenLimit(this.useCase, input.maxOutputTokens), system: systemInstruction(this.useCase), messages: [{ role: "user", content: userText }] }),
    });
    const answer = normaliseAIAnswer(payload.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n").trim() || "", this.useCase);
    if (!answer) throw Object.assign(new Error("Anthropic returned no text output"), { code: "EMPTY_PROVIDER_RESPONSE" });
    const model = providerModel(payload.model, this.model);
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
  supportsImages(input?: Pick<AIProviderInput, "imagePurpose">) { return this.candidates.some((candidate) => candidate.available() && candidate.supportsImages(input)); }

  async analyze(input: AIProviderInput): Promise<AIProviderResult> {
    let lastError: unknown;
    for (const [index, candidate] of this.candidates.entries()) {
      if (!candidate.available()) continue;
      if (input.image && !candidate.supportsImages(input)) continue;
      try {
        const result = await candidate.analyze(input);
        this.name = candidate.name;
        return index === 0 ? result : { ...result, usedFallback: true };
      } catch (error) {
        if (isAIAccessError(error)) throw error;
        lastError = error;
      }
    }
    if (lastError instanceof Error) throw lastError;
    throw Object.assign(new Error("No AI provider is available"), { code: "PROVIDER_UNAVAILABLE" });
  }
}

const providerNames = ["fallback", "arvancloud", "gapgpt", "openai", "gemini", "anthropic"] as const;

function configuredProviderName(useCase: AIUseCase) {
  if (useCase === "risk") return ASSESSMENT_AI_PROVIDER;
  const configured = process.env.AI_CHAT_PROVIDER;
  return (configured ?? process.env.AI_DEFAULT_PROVIDER ?? "arvancloud").trim().toLowerCase();
}

function modelFor(_provider: "gapgpt" | "openai" | "gemini" | "anthropic", useCase: AIUseCase) {
  return configuredModel(useCase);
}

function createProvider(name: string, useCase: AIUseCase): AIProvider {
  if (useCase === "risk" && name !== ASSESSMENT_AI_PROVIDER) {
    return {
      name,
      available: () => false,
      unavailableReason: () => "Assessments require the approved ArvanCloud GPT-5-Mini route",
      supportsImages: () => false,
      analyze: async () => { throw assessmentProviderPolicyError(); },
    };
  }
  const model = configuredModel(useCase);
  switch (name) {
    case "arvancloud": return new ArvanCloudProvider(process.env.ARVAN_API_KEY, model, process.env.ARVAN_BASE_URL ?? ASSESSMENT_AI_GATEWAY, useCase);
    case "gapgpt": return new GapGptProvider(process.env.GAPGPT_API_KEY, model, process.env.GAPGPT_BASE_URL, useCase);
    case "openai": return new OpenAIProvider(process.env.OPENAI_API_KEY, model, useCase);
    case "gemini": return new GeminiProvider(process.env.GEMINI_API_KEY, model, useCase);
    case "anthropic": return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, model, useCase);
    default: return new KnowledgeFallbackProvider(useCase);
  }
}

export function getConfiguredAIProviderName(useCase: AIUseCase = "chat") {
  const name = configuredProviderName(useCase);
  return providerNames.includes(name as (typeof providerNames)[number]) ? name : "fallback";
}

export function getAIProvider(name: string | undefined = undefined, useCase: AIUseCase = "chat") {
  const provider = createProvider(name ?? getConfiguredAIProviderName(useCase), useCase);
  return {
    name: provider.name,
    available: () => provider.available(),
    unavailableReason: () => provider.unavailableReason(),
    supportsImages: (input?: Pick<AIProviderInput, "imagePurpose">) => provider.supportsImages(input),
    analyze: (input: AIProviderInput) => {
      if (useCase === "risk" && !provider.available()) return provider.analyze(input);
      return input.userId ? withAIAllowance({ ...input, maxOutputTokens: outputTokenLimit(useCase, input.maxOutputTokens) }, scoped => provider.analyze(scoped), undefined, 16_000) : provider.analyze(input);
    },
  };
}

export function getAvailableAIProvider(useCase: AIUseCase = "chat") {
  const selected = getAIProvider(getConfiguredAIProviderName(useCase), useCase);
  if (useCase === "risk") return selected;
  const fallback = getAIProvider("fallback", useCase);
  const candidates: AIProvider[] = [selected];
  if (selected.name !== fallback.name) candidates.push(fallback);
  return new FailoverProvider(candidates);
}

export function getAvailableAssessmentAIProvider() {
  return getAIProvider(ASSESSMENT_AI_PROVIDER, "risk");
}

export function getAssessmentImageAIProvider() {
  return getAIProvider(getConfiguredAIProviderName("risk"), "risk");
}

export function getRulaPostureImageAIProvider() {
  return getAssessmentImageAIProvider();
}

export function getRoutedAIProvider(useCase: AIUseCase, requestedProvider?: string) {
  const configured = getConfiguredAIProviderName(useCase);
  const requested = requestedProvider?.trim().toLowerCase();
  if (useCase === "risk") return getAvailableAIProvider("risk");
  return getAIProvider(requested || configured, useCase);
}

function imagePurposeReadiness(provider: AIProvider, purpose: AIImagePurpose, scope: "RULA" | "FMEA") {
  const configured = provider.available();
  const privacyApprovalMatches = process.env[`${scope}_IMAGE_PRIVACY_APPROVED_PROVIDER`] === provider.name;
  const capabilityApprovalMatches = process.env[`${scope}_IMAGE_VISION_SUPPORTED_PROVIDER`] === provider.name;
  const adapterAllowsPurpose = provider.supportsImages({ imagePurpose: purpose });
  return {
    configured,
    privacyApprovalMatches,
    capabilityApprovalMatches,
    adapterAllowsPurpose,
    requestGateOpen: configured && privacyApprovalMatches && capabilityApprovalMatches && adapterAllowsPurpose,
    liveReachability: "not-verified" as const,
  };
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
      riskModel: name === ASSESSMENT_AI_PROVIDER ? ASSESSMENT_AI_MODEL : null,
      chatModel: name === "fallback" ? null : modelFor(name === "gapgpt" ? name : "openai", "chat"),
      assessmentImageReadiness: {
        model: ASSESSMENT_AI_MODEL,
        modelIdentityVerifiedByLiveResponse: "not-verified" as const,
        rulaPosture: imagePurposeReadiness(risk, "rula-posture", "RULA"),
        fmeaProcess: imagePurposeReadiness(risk, "fmea-process", "FMEA"),
      },
      riskFallbackProvider: null,
      riskFallbackModel: null,
      configuredForRisk: configuredRisk === name,
      configuredForChat: configuredChat === name,
    };
  });
}
