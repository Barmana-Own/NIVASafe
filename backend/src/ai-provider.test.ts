import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const imageTransport = vi.hoisted(() => ({ agent: vi.fn() }));
vi.mock("undici", () => ({ Agent: class {
  constructor(options: unknown) { imageTransport.agent(options); }
} }));
// Transform the provider graph during collection, outside the five-second
// request assertion deadline. Cold Windows transforms otherwise outlive a
// timed-out test and can dispatch into the following test's fetch mock.
import "./ai-provider.js";

vi.mock("./ai-access.js", () => ({ isAIAccessError: (error: { code?: string }) => error?.code?.startsWith("AI_ACCESS_"), withAIAllowance: (input: unknown, run: (input: unknown) => unknown) => run(input) }));
describe("AI provider adapters", () => {
  it("isolates certificate-verified assessment text and image pools without changing chat transport", async () => {
    vi.resetModules();
    imageTransport.agent.mockClear();
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: '{"synthetic":true}' } }] }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "Synthetic posture JSON", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } });
    expect(imageTransport.agent).toHaveBeenCalledExactlyOnceWith({ connect: { timeout: 30_000, rejectUnauthorized: true }, connections: 4, pipelining: 1, keepAliveTimeout: 60_000, keepAliveMaxTimeout: 60_000 });
    expect(fetchMock.mock.calls[0]?.[1]).toHaveProperty("dispatcher");
    const imageDispatcher = fetchMock.mock.calls[0]?.[1].dispatcher;
    await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "Synthetic text", includeKnowledge: false, maxOutputTokens: 1200 });
    const textDispatcher = fetchMock.mock.calls[1]?.[1].dispatcher;
    expect(textDispatcher).toBeDefined();
    expect(textDispatcher).not.toBe(imageDispatcher);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1].body))).toMatchObject({ model: "GPT-5-Mini", max_completion_tokens: 1200 });
    await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "Another synthetic text", includeKnowledge: false });
    expect(fetchMock.mock.calls[2]?.[1].dispatcher).toBe(textDispatcher);
    await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "Another synthetic image", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } });
    expect(fetchMock.mock.calls[3]?.[1].dispatcher).toBe(imageDispatcher);
    await getAIProvider("arvancloud", "chat").analyze({ organizationId: "org", message: "Synthetic chat", includeKnowledge: false });
    expect(fetchMock.mock.calls[4]?.[1]).not.toHaveProperty("dispatcher");
    expect(imageTransport.agent).toHaveBeenCalledTimes(2);
    expect(imageTransport.agent.mock.calls.every(([options]) => options.connect.timeout === 30_000 && options.connect.rejectUnauthorized === true && options.connections === 4 && options.pipelining === 1 && options.keepAliveTimeout === 60_000 && options.keepAliveMaxTimeout === 60_000)).toBe(true);
  });
  it.each(["http://api.arvancloudai.ir/v1", "https://unapproved.example/v1"])("never creates a text connection pool for unapproved gateway %s", async gateway => {
    vi.resetModules();
    imageTransport.agent.mockClear();
    process.env.ARVAN_BASE_URL = gateway;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    await expect(getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "Synthetic text", includeKnowledge: false })).rejects.toMatchObject({ code: "ASSESSMENT_PROVIDER_NOT_APPROVED" });
    expect(imageTransport.agent).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["rula-posture", "fmea-process"] as const)("recovers two provably unsent %s connections before delivering one image", async imagePurpose => {
    const connectFailure = () => Object.assign(new TypeError("fetch failed"), { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } });
    const fetchMock = vi.fn().mockRejectedValueOnce(connectFailure()).mockRejectedValueOnce(connectFailure()).mockResolvedValueOnce(new Response(JSON.stringify({ model: "gpt-5-mini-2025-08-07", choices: [{ message: { content: '{"synthetic":true}' } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const beforeImageTransfer = vi.fn().mockResolvedValue(undefined);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture JSON", includeKnowledge: false, beforeImageTransfer, imagePurpose, image: { mimeType: "image/png", base64: "synthetic" } })).resolves.toMatchObject({ answer: '{"synthetic":true}' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(beforeImageTransfer).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.every(([_url, options]) => options.redirect === "error")).toBe(true);
  });

  it.each(["UND_ERR_CONNECT_TIMEOUT", "EAI_AGAIN", "ECONNREFUSED"])("bounds unsent %s connection recovery at three tries", async code => {
    const fetchMock = vi.fn().mockRejectedValue(Object.assign(new TypeError("fetch failed"), { cause: { code } }));
    vi.stubGlobal("fetch", fetchMock);
    const beforeImageTransfer = vi.fn().mockResolvedValue(undefined);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture JSON", includeKnowledge: false, beforeImageTransfer, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } })).rejects.toMatchObject({ code: "PROVIDER_CONNECT_FAILED", networkErrorCode: code, connectionAttempts: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(beforeImageTransfer).toHaveBeenCalledTimes(3);
  });

  it("rechecks consent after a failed connection and never dispatches after withdrawal", async () => {
    const fetchMock = vi.fn().mockRejectedValue(Object.assign(new TypeError("fetch failed"), { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }));
    vi.stubGlobal("fetch", fetchMock);
    const beforeImageTransfer = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(Object.assign(new Error("Withdrawn"), { code: "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED", statusCode: 403 }));
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture JSON", includeKnowledge: false, beforeImageTransfer, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } })).rejects.toMatchObject({ code: "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(beforeImageTransfer).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, "UND_ERR_SOCKET", "ECONNRESET", "ETIMEDOUT", "UND_ERR_HEADERS_TIMEOUT"])("never replays an image for ambiguous fetch failure %s", async code => {
    const fetchMock = vi.fn().mockRejectedValue(Object.assign(new TypeError("fetch failed"), { ...(code ? { cause: { code } } : {}) }));
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture JSON", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([429, 500, 502, 503, 504])("never replays an image after received HTTP %i", async status => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status }));
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture JSON", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } })).rejects.toMatchObject({ code: "PROVIDER_REQUEST_FAILED", statusCode: status });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("never treats a response-body failure as an unsent connection", async () => {
    const response = new Response("{}");
    vi.spyOn(response, "text").mockRejectedValue(Object.assign(new TypeError("body failed"), { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }));
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture JSON", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } })).rejects.toThrow("body failed");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("shares one 120-second deadline across preconnect recovery and the delivered response", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      calls++;
      options.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
      if (calls < 3) setTimeout(() => reject(Object.assign(new TypeError("fetch failed"), { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } })), 20_000);
    }));
    vi.stubGlobal("fetch", fetchMock);
    const beforeImageTransfer = vi.fn().mockResolvedValue(undefined);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    const pending = getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture JSON", includeKnowledge: false, beforeImageTransfer, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } });
    const assertion = expect(pending).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(119_999);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(beforeImageTransfer).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it.each(["rula-posture", "fmea-process"] as const)("rejects redirects instead of replaying a %s image to another recipient", async imagePurpose => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Redirect rejected"));
    vi.stubGlobal("fetch", fetchMock);
    const beforeImageTransfer = vi.fn().mockResolvedValue(undefined);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture", includeKnowledge: false, imagePurpose, image: { mimeType: "image/png", base64: "synthetic" }, beforeImageTransfer })).rejects.toThrow();
    expect(beforeImageTransfer).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("https://api.arvancloudai.ir/v1/chat/completions", expect.objectContaining({ method: "POST", redirect: "error" }));
  });
  it.each(["rula-posture", "fmea-process"] as const)("fails closed if an internal %s image caller omits the transfer guard", async imagePurpose => {
    const fetchMock = vi.fn();vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture", includeKnowledge: false, imagePurpose, image: { mimeType: "image/png", base64: "synthetic" } })).rejects.toMatchObject({ statusCode: 403, code: "IMAGE_TRANSFER_AUTHORIZATION_REQUIRED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not allow an image caller to evade the guard by omitting image purpose", async () => {
    const fetchMock = vi.fn();vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture", includeKnowledge: false, image: { mimeType: "image/png", base64: "synthetic" } })).rejects.toMatchObject({ code: "IMAGE_TRANSFER_AUTHORIZATION_REQUIRED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["rula-posture", "fmea-process"] as const)("runs fresh authorization for %s at the HTTP boundary and never sends after a rejected guard", async imagePurpose => {
    const fetchMock = vi.fn();vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    const beforeImageTransfer = vi.fn().mockRejectedValue(Object.assign(new Error("Consent withdrawn"), { statusCode: 403, code: "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED", retryable: false }));
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture", includeKnowledge: false, imagePurpose, image: { mimeType: "image/png", base64: "synthetic" }, beforeImageTransfer })).rejects.toMatchObject({ code: "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED" });
    expect(beforeImageTransfer).toHaveBeenCalledOnce();expect(fetchMock).not.toHaveBeenCalled();
  });
  it("lets one bounded FMEA corrective-action request complete after the generic timeout without changing models or retrying", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
      setTimeout(() => resolve(new Response(JSON.stringify({ model: "gpt-5-mini-2025-08-07", choices: [{ message: { content: '{"actions":[]}' } }] }), { status: 200 })), 70_000);
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    const result = getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "JSON corrective actions", includeKnowledge: false, structuredOutput: true, textPurpose: "fmea-action-suggestions" });
    const assertion = expect(result).resolves.toMatchObject({ model: "gpt-5-mini-2025-08-07" });
    await vi.advanceTimersByTimeAsync(70_001);await assertion;
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ model: "GPT-5-Mini", response_format: { type: "json_object" } });
    vi.useRealTimers();
  });

  it("stops an unresponsive FMEA corrective-action request at 85 seconds with no duplicate provider charge", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
    }));vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    const result = getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "JSON corrective actions", includeKnowledge: false, structuredOutput: true, textPurpose: "fmea-action-suggestions" });
    const assertion = expect(result).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(84_999);expect(fetchMock).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(2);await assertion;expect(fetchMock).toHaveBeenCalledOnce();vi.useRealTimers();
  });

  it("uses GPT-5-Mini for Arvan RULA images and never substitutes another model after failure", async () => {
    vi.resetModules();
    process.env.AI_RISK_PROVIDER = "arvancloud";
    process.env.AI_RISK_MODEL = "GPT-4o-mini";
    process.env.AI_RISK_FALLBACK_MODEL = "GPT-4.1-Mini";
    process.env.ARVAN_API_KEY = "test-arvan";
    process.env.ARVAN_BASE_URL = "https://api.arvancloudai.ir/v1";
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"error":"chat completion failed"}', { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    const input = { organizationId: "org", message: "JSON image posture", beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture" as const, includeKnowledge: false, maxOutputTokens: 3000, image: { mimeType: "image/png", base64: "test" } };
    await expect(getRulaPostureImageAIProvider().analyze(input)).rejects.toMatchObject({ code: "PROVIDER_REQUEST_FAILED" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.model).toBe("GPT-5-Mini");
    expect(body.max_completion_tokens).toBe(3000);
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[1].content[1].image_url.url).toBe("data:image/png;base64,test");
    expect(body.messages[1].content[1].image_url.detail).toBe("high");
    vi.resetModules();
  });

  it.each(["rula-posture", "fmea-process"] as const)("lets one %s image completion finish after sixty seconds without another transfer", async imagePurpose => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
      setTimeout(() => resolve(new Response(JSON.stringify({ model: "gpt-5-mini-2025-08-07", choices: [{ message: { content: '{"synthetic":true}' } }] }), { status: 200 })), 75_000);
    }));
    vi.stubGlobal("fetch", fetchMock);
    const beforeImageTransfer = vi.fn().mockResolvedValue(undefined);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    const pending = getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture JSON", includeKnowledge: false, beforeImageTransfer, imagePurpose, image: { mimeType: "image/png", base64: "synthetic" } });
    const assertion = expect(pending).resolves.toMatchObject({ model: "gpt-5-mini-2025-08-07", answer: '{"synthetic":true}' });
    await vi.advanceTimersByTimeAsync(60_001);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(beforeImageTransfer).toHaveBeenCalledOnce();
  });

  it.each(["rula-posture", "fmea-process"] as const)("keeps %s image requests bounded at 120 seconds with no duplicate attempt", async imagePurpose => {
    vi.resetModules();
    process.env.AI_RISK_PROVIDER = "arvancloud";
    process.env.ARVAN_API_KEY = "test-arvan";
    process.env.ARVAN_BASE_URL = "https://api.arvancloudai.ir/v1";
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    const beforeImageTransfer = vi.fn().mockResolvedValue(undefined);
    const pending = getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture", beforeImageTransfer, imagePurpose, includeKnowledge: false, image: { mimeType: "image/png", base64: "synthetic" } });
    const outcome = pending.then(() => null, error => error);
    await vi.advanceTimersByTimeAsync(119_999);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toMatchObject({ code: "PROVIDER_TIMEOUT", retryable: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(beforeImageTransfer).toHaveBeenCalledOnce();
    vi.useRealTimers();
    vi.resetModules();
  });

  it.each([
    ["rula-posture", "RULA_IMAGE_PROVIDER_TIMEOUT_MS", "1", 60_000],
    ["fmea-process", "FMEA_IMAGE_PROVIDER_TIMEOUT_MS", "90000", 90_000],
    ["rula-posture", "RULA_IMAGE_PROVIDER_TIMEOUT_MS", "999999", 120_000],
    ["fmea-process", "FMEA_IMAGE_PROVIDER_TIMEOUT_MS", "invalid", 120_000],
  ] as const)("bounds %s operator timeout %s=%s at %i milliseconds", async (imagePurpose, setting, configured, deadline) => {
    vi.stubEnv(setting, configured);
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    const pending = getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "Synthetic posture JSON", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose, image: { mimeType: "image/png", base64: "synthetic" } });
    const assertion = expect(pending).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(deadline - 1);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    ["risk", false, 30_000],
    ["chat", false, 60_000],
    ["chat", true, 60_000],
  ] as const)("preserves the %s transport deadline for image=%s at %i milliseconds", async (useCase, image, deadline) => {
    process.env.AI_PROVIDER_MAX_ATTEMPTS = "1";
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    const pending = getAIProvider("arvancloud", useCase).analyze({ organizationId: "org", message: "Synthetic request", includeKnowledge: false, ...(image ? { image: { mimeType: "image/png", base64: "synthetic" } } : {}) });
    const assertion = expect(pending).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(deadline - 1);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fails closed when an upstream reports a model other than the configured assessment model", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: "gpt-4o-mini", choices: [{ message: { content: "Wrong model response" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    await expect(getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "Assessment request", includeKnowledge: false }))
      .rejects.toMatchObject({ code: "AI_MODEL_MISMATCH" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe("GPT-5-Mini");
  });

  it.each(["rula-posture", "fmea-process"] as const)("accepts the authenticated Arvan GPT-5-Mini namespace for %s without changing the requested model", async imagePurpose => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: "openai/gpt-5-mini", choices: [{ message: { content: '{"synthetic":true}' } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "Synthetic alias regression", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose, image: { mimeType: "image/png", base64: "synthetic" } });
    expect(result.model).toBe("openai/gpt-5-mini");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe("GPT-5-Mini");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each(["openai/gpt-5", "openai/gpt-4o-mini", "other/gpt-5-mini", "openai/gpt-5-mini-extra"])("rejects the unapproved response identity %s", async model => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model, choices: [{ message: { content: "Synthetic wrong model" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    await expect(getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "Synthetic", includeKnowledge: false })).rejects.toMatchObject({ code: "AI_MODEL_MISMATCH" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not accept the assessment namespace as a chatbot model", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: "openai/gpt-5-mini", choices: [{ message: { content: "Synthetic" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    await expect(getAIProvider("arvancloud", "chat").analyze({ organizationId: "org", message: "Synthetic", includeKnowledge: false })).rejects.toMatchObject({ code: "AI_MODEL_MISMATCH" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe("DeepSeek-V4-Flash");
  });

  it("does not claim the requested assessment model when the provider omits its model identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "Assessment response" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "Assessment request", includeKnowledge: false });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe("GPT-5-Mini");
    expect(result.model).toBeUndefined();
  });

  it("keeps RULA images on Arvan despite an obsolete alternative-provider configuration", async () => {
    process.env.AI_RISK_PROVIDER = "openai";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    const provider = getRulaPostureImageAIProvider();
    expect(provider.name).toBe("arvancloud");
    expect(provider.supportsImages({ imagePurpose: "rula-posture" })).toBe(true);
    expect(provider.available()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403, 429])("does not fail over image authorization or quota failure %i", async status => {
    vi.resetModules();
    process.env.AI_RISK_PROVIDER = "arvancloud";
    process.env.ARVAN_API_KEY = "test-arvan";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status }));
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "JSON posture", beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", includeKnowledge: false, image: { mimeType: "image/png", base64: "test" } })).rejects.toMatchObject({ statusCode: status });
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.resetModules();
  });

  it("retains only a safe upstream request id from a rejected RULA provider response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("sensitive provider response body", {
      status: 401,
      headers: { "x-request-id": "req_123e4567-e89b-12d3-a456-426614174000", "www-authenticate": "Bearer realm=private" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    let failure: unknown;
    try {
      await getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "JSON posture", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ statusCode: 401, code: "PROVIDER_REQUEST_FAILED", upstreamRequestId: "req_123e4567-e89b-12d3-a456-426614174000" });
    expect((failure as Error).message).not.toContain("sensitive");
    expect((failure as Error & { upstreamRequestId?: string }).upstreamRequestId).not.toContain("private");
  });

  it("retains only an allowlisted provider error code from a rejected RULA response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "invalid_api_key", message: "private provider detail" } }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    let failure: unknown;
    try {
      await getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "JSON posture", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ statusCode: 401, code: "PROVIDER_REQUEST_FAILED", providerErrorCode: "invalid_api_key" });
    expect((failure as Error).message).not.toContain("private provider detail");
  });

  it("drops unsafe upstream request-id header values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("sensitive provider response body", { status: 401, headers: { "x-request-id": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    let failure: unknown;
    try {
      await getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "JSON posture", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ statusCode: 401, code: "PROVIDER_REQUEST_FAILED" });
    expect(failure).not.toHaveProperty("upstreamRequestId");
    expect((failure as Error).message).not.toContain("secret-token");
  });

  it("has safe Arvan defaults for both use cases without embedding a credential", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "Response" } }] }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider, getConfiguredAIProviderName } = await import("./ai-provider.js");
    // The test runtime imports local environment values during module loading.
    // Remove them afterwards to exercise the adapter's missing-config defaults.
    delete process.env.AI_DEFAULT_PROVIDER;
    delete process.env.AI_RISK_PROVIDER;
    delete process.env.AI_CHAT_PROVIDER;
    delete process.env.AI_RISK_MODEL;
    delete process.env.AI_CHAT_MODEL;
    expect(getConfiguredAIProviderName("chat")).toBe("arvancloud");
    for (const useCase of ["chat", "risk"] as const) await getAIProvider(undefined, useCase).analyze({ organizationId: "org", message: "Synthetic example", includeKnowledge: false });
    expect(fetchMock.mock.calls.map(call => JSON.parse(call[1]?.body ?? "{}").model)).toEqual(["DeepSeek-V4-Flash", "GPT-5-Mini"]);
    delete process.env.ARVAN_API_KEY;
    expect(getAIProvider("arvancloud").available()).toBe(false);
  });
  it("uses the fixed GPT-5-Mini model for Arvan vision regardless of risk configuration", async () => {
    process.env.AI_RISK_MODEL = "GPT-4.1-Mini";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"sides":{}}' } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    const provider = getRulaPostureImageAIProvider();
    expect(provider.name).toBe("arvancloud");
    await provider.analyze({ organizationId: "org", message: "JSON posture", includeKnowledge: false, beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: "synthetic" } });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.arvancloudai.ir/v1/chat/completions");
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body ?? "{}").model).toBe("GPT-5-Mini");
  });
  it("requests bounded JSON without the incompatible reasoning parameter for Arvan corrective text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"actions":[]}' } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "Return JSON corrective actions", includeKnowledge: false, maxOutputTokens: 6000, structuredOutput: true });
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body ?? "{}");
    expect(body).toMatchObject({ model: "GPT-5-Mini", max_completion_tokens: 6000, response_format: { type: "json_object" } });
    expect(body).not.toHaveProperty("reasoning_effort");
    expect(body).not.toHaveProperty("max_tokens");
  });
  it("keeps chat connected when supplementary knowledge retrieval fails without exposing the failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "Connected response" } }] }), { status: 200 })));
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockRejectedValue(new Error("private database diagnostic")) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("gapgpt", "chat").analyze({ organizationId: "org", message: "Question" });
    expect(result.answer).toBe("Connected response");
    expect(result.citations).toEqual([]);
    expect(warn).toHaveBeenCalledWith(JSON.stringify({ event: "CHAT_KNOWLEDGE_UNAVAILABLE", provider: "gapgpt" }));
  });
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env.AI_ENABLED = "true";
    process.env.AI_RISK_PROVIDER = "arvancloud";
    process.env.AI_RISK_MODEL = "GPT-5-Mini";
    process.env.AI_RISK_FALLBACK_PROVIDER = "arvancloud";
    process.env.AI_RISK_FALLBACK_MODEL = "";
    process.env.AI_CHAT_PROVIDER = "arvancloud";
    process.env.AI_CHAT_MODEL = "DeepSeek-V4-Flash";
    process.env.AI_CHAT_MAX_OUTPUT_TOKENS = "900";
    process.env.AI_MAX_OUTPUT_TOKENS = "1600";
    process.env.AI_PROVIDER_TIMEOUT_MS = "30000";
    process.env.AI_PROVIDER_MAX_ATTEMPTS = "2";
    process.env.AI_PROVIDER_RETRY_DELAY_MS = "0";
    vi.stubEnv("RULA_IMAGE_PROVIDER_TIMEOUT_MS", "");
    vi.stubEnv("FMEA_IMAGE_PROVIDER_TIMEOUT_MS", "");
    process.env.ARVAN_API_KEY = "test-arvancloud";
    process.env.ARVAN_BASE_URL = "https://api.arvancloudai.ir/v1";
    process.env.GAPGPT_API_KEY = "test-gapgpt";
    process.env.GAPGPT_BASE_URL = "https://api.gapgpt.test/v1";
    process.env.OPENAI_API_KEY = "test-openai";
    process.env.OPENAI_CHAT_MODEL = "test-openai-model";
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.GEMINI_CHAT_MODEL = "test-gemini-model";
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    process.env.ANTHROPIC_CHAT_MODEL = "test-anthropic-model";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("reports configured providers as available", async () => {
    const { listAIProviders } = await import("./ai-provider.js");
    const availability = Object.fromEntries(listAIProviders().map((item) => [item.name, item.available]));
    expect(availability).toEqual({ fallback: true, arvancloud: true, gapgpt: true, openai: true, gemini: true, anthropic: true });
    expect(listAIProviders().find((item) => item.name === "arvancloud")).toMatchObject({ configuredForRisk: true, configuredForChat: true });
  });

  it.each([
    ["arvancloud", { choices: [{ message: { content: "ArvanCloud answer" } }] }, "ArvanCloud answer"],
    ["openai", { output: [{ content: [{ type: "output_text", text: "OpenAI answer" }] }] }, "OpenAI answer"],
    ["gemini", { candidates: [{ content: { parts: [{ text: "Gemini answer" }] } }] }, "Gemini answer"],
    ["anthropic", { content: [{ type: "text", text: "Anthropic answer" }] }, "Anthropic answer"],
  ] as const)("parses %s text responses", async (name, payload, expected) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider(name).analyze({ organizationId: "org", message: "risk guidance" });
    expect(result.answer).toBe(expected);
    expect(result.provider).toBe(name);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([8000, 9000, 64])("bounds the server-selected output budget %i for larger assessment batches", async (requested) => {
    process.env.AI_MAX_OUTPUT_TOKENS = "1600";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "Assessment answer" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAvailableAssessmentAIProvider } = await import("./ai-provider.js");
    await getAvailableAssessmentAIProvider().analyze({ organizationId: "org", message: "FMEA detail hazards", maxOutputTokens: requested });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.max_completion_tokens).toBe(Math.min(8000, Math.max(128, requested)));
  });

  it("pins assessment and chat calls to their approved models despite environment overrides", async () => {
    process.env.AI_RISK_MODEL = "GPT-4o-mini";
    process.env.AI_RISK_FALLBACK_MODEL = "GPT-4.1-Mini";
    process.env.AI_CHAT_MODEL = "some-other-chat-model";
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "Assessment answer" } }] }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAvailableAssessmentAIProvider, getAIProvider } = await import("./ai-provider.js");
    await getAvailableAssessmentAIProvider().analyze({ organizationId: "org", message: "assessment guidance" });
    await getAIProvider("arvancloud", "chat").analyze({ organizationId: "org", message: "chat guidance" });
    expect(fetchMock.mock.calls.map(call => JSON.parse(String(call[1]?.body)).model)).toEqual(["GPT-5-Mini", "DeepSeek-V4-Flash"]);
  });

  it("keeps stale or caller-selected risk provider names on the configured assessment route", async () => {
    process.env.AI_RISK_PROVIDER = "arvancloud";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getRoutedAIProvider } = await import("./ai-provider.js");
    const provider = getRoutedAIProvider("risk", "gapgpt");
    expect(provider.name).toBe("arvancloud");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("can omit organization knowledge from a narrowly scoped assessment prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "RULA task response" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const findMany = vi.fn().mockResolvedValue([{ id: "private-doc", title: "Private title", content: "Private organization context", tags: [], visibility: "ALL", visibleUserIds: null, visibleOrganizationIds: null, isGlobal: false, aiOnly: false, updatedAt: new Date() }]);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("arvancloud", "risk").analyze({
      organizationId: "org",
      userId: "user",
      message: "RULA job title and task description",
      includeKnowledge: false,
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(findMany).not.toHaveBeenCalled();
    expect(body.messages[1].content).toContain("RULA job title and task description");
    expect(body.messages[1].content).not.toContain("Private organization context");
    expect(result.citations).toEqual([]);
  });

  it("uses role-specific ArvanCloud models through the chat completions endpoint", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "Role-aware answer" } }] }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");

    await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "risk guidance" });
    const riskBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.arvancloudai.ir/v1/chat/completions");
    expect(riskBody.model).toBe("GPT-5-Mini");
    expect(riskBody.max_completion_tokens).toBe(1600);
    expect(riskBody.max_tokens).toBeUndefined();
    expect(riskBody.messages[0].content).toContain("Do not introduce yourself");
    expect(riskBody.messages[0].content).not.toContain("Introduce yourself as the NIVASafe intelligent assistant");

    await getAIProvider("arvancloud", "chat").analyze({ organizationId: "org", message: "chat guidance", history: [{ role: "user", content: "Earlier question" }, { role: "assistant", content: "Earlier answer" }] });
    const chatBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(chatBody.model).toBe("DeepSeek-V4-Flash");
    expect(chatBody.max_tokens).toBe(900);
    expect(chatBody.messages[0].content).toContain("Introduce yourself as the NIVASafe intelligent assistant");
    expect(chatBody.messages[0].content).toContain("Preserve normal word spacing and punctuation");
    expect(chatBody.messages[1].content).toContain("Recent conversation history (reference only):");
    expect(chatBody.messages[1].content).toContain("User: Earlier question");
    expect(chatBody.messages[1].content).toContain("Assistant: Earlier answer");
  });

  it("preserves the chat offline notice while refusing a local assessment fallback", async () => {
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const chat = await getAIProvider("fallback", "chat").analyze({ organizationId: "org", message: "سلام", locale: "fa" });
    await expect(getAIProvider("fallback", "risk").analyze({ organizationId: "org", message: "پیشنهاد کنترل خطر" })).rejects.toMatchObject({ code: "ASSESSMENT_PROVIDER_NOT_APPROVED" });
    expect(chat.answer).toBe("سلام من دستیار هوشمند NIVASafe جهت مدیریت ایمنی و بهداشت حرفه‌ای هستم.\nدرحال حاضر امکان برقراری ارتباط با سرور را ندارم؛ اما به محض برقراری ارتباط پاسخگوی شما خواهم بود.");
    expect(chat.citations).toEqual([]);
  });

  it("does not retrieve organization documents for an explicitly context-free local fallback", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    await expect(getAIProvider("fallback", "risk").analyze({ organizationId: "org", message: "task description", includeKnowledge: false })).rejects.toMatchObject({ code: "ASSESSMENT_PROVIDER_NOT_APPROVED" });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns the localized offline notice when a configured chat model cannot be reached", async () => {
    process.env.AI_PROVIDER_MAX_ATTEMPTS = "1";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "temporary outage" } }), { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAvailableAIProvider } = await import("./ai-provider.js");

    const result = await getAvailableAIProvider("chat").analyze({ organizationId: "org", message: "سلام", locale: "fa" });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.provider).toBe("fallback");
    expect(result.answer).toBe("سلام من دستیار هوشمند NIVASafe جهت مدیریت ایمنی و بهداشت حرفه‌ای هستم.\nدرحال حاضر امکان برقراری ارتباط با سرور را ندارم؛ اما به محض برقراری ارتباط پاسخگوی شما خواهم بود.");
  });

  it("normalises concatenated Persian chat introductions before storage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "سلاممنچتبات NIVASafe هستم." } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("arvancloud", "chat").analyze({ organizationId: "org", message: "سلام" });
    expect(result.answer).toBe("سلام، من چت‌بات NIVASafe هستم.");
  });

  it("retrieves relevant published knowledge by title, tags, and content while respecting visibility", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: "GPT-5-Mini", choices: [{ message: { content: "Grounded assessment response" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([
      { id: "doc-relevant", title: "LOTO procedure", content: "Lockout controls must be verified before maintenance.", tags: ["LOTO", "maintenance"], visibility: "ALL", visibleUserIds: null, visibleOrganizationIds: null, isGlobal: false, aiOnly: false, updatedAt: new Date("2026-09-27") },
      { id: "doc-hidden", title: "LOTO hidden procedure", content: "This hidden document must never reach the assistant.", tags: ["LOTO"], visibility: "HIDDEN", visibleUserIds: null, visibleOrganizationIds: null, isGlobal: false, aiOnly: false, updatedAt: new Date("2026-09-28") },
      { id: "doc-selected", title: "LOTO selected procedure", content: "This selected document is for another user.", tags: ["LOTO"], visibility: "SELECTED", visibleUserIds: ["another-user"], visibleOrganizationIds: null, isGlobal: false, aiOnly: false, updatedAt: new Date("2026-09-29") },
    ]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", userId: "user", message: "LOTO procedure" });
    expect(result.citations).toEqual([{ id: "doc-relevant", title: "LOTO procedure" }]);
    const prompt = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).messages[1].content;
    expect(prompt).toContain("Lockout controls must be verified");
    expect(prompt).not.toContain("hidden document");
    expect(prompt).not.toContain("another user");
  });

  it("removes a known assistant introduction from risk-provider output", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "من دستیار هوشمند NIVASafe برای ایمنی و بهداشت حرفه‌ای هستم.\n\nکنترل پیشنهادی: حفاظ‌گذاری دستگاه." } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "پیشنهاد کنترل خطر" });
    expect(result.answer).toBe("کنترل پیشنهادی: حفاظ‌گذاری دستگاه.");
  });

  it("sends FMEA image reviews as multimodal ArvanCloud messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"summary":"ok","riskRows":[]}' } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");

    const provider = getAIProvider("arvancloud", "risk");
    expect(provider.supportsImages()).toBe(true);
    await provider.analyze({ organizationId: "org", beforeImageTransfer: async () => undefined, imagePurpose: "fmea-process", message: "image review", image: { mimeType: "image/png", base64: "iVBORw0KGgo=" } });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.messages[1].content[0]).toMatchObject({ type: "text" });
    expect(body.messages[1].content[1]).toEqual({ type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgo=" } });
  });

  it("ignores obsolete GapGPT risk configuration for both assessment image purposes", async () => {
    process.env.AI_RISK_PROVIDER = "gapgpt";
    process.env.AI_RISK_MODEL = "other-model";
    process.env.AI_RISK_FALLBACK_MODEL = "fallback-that-must-not-receive-images";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"sides":{"RIGHT":{}},"notes":"review"}' } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getRulaPostureImageAIProvider, listAIProviders } = await import("./ai-provider.js");
    const provider = getRulaPostureImageAIProvider();

    expect(provider.available()).toBe(true);
    expect(provider.name).toBe("arvancloud");
    expect(provider.supportsImages({ imagePurpose: "rula-posture" })).toBe(true);
    expect(provider.supportsImages({ imagePurpose: "fmea-process" })).toBe(true);
    expect(listAIProviders().find((item) => item.name === "gapgpt")).toMatchObject({ configuredForRisk: false, riskModel: null });
    await provider.analyze({ organizationId: "org", beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", message: "RULA posture review", image: { mimeType: "image/jpeg", base64: "dGVzdA==" } });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.arvancloudai.ir/v1/chat/completions");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer test-arvancloud" });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.model).toBe("GPT-5-Mini");
    expect(body.max_completion_tokens).toBe(1600);
    expect(body.max_tokens).toBeUndefined();
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[1].content[1]).toEqual({ type: "image_url", image_url: { url: "data:image/jpeg;base64,dGVzdA==", detail:"high" } });
  });

  it("pins RULA vision to GPT-5 mini independently of generic risk configuration and never retries or fails over images", async () => {
    process.env.AI_RISK_PROVIDER = "gapgpt";
    process.env.AI_RISK_MODEL = "other-model";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
    const knowledge = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: knowledge } } }));
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    await expect(getRulaPostureImageAIProvider().analyze({ organizationId: "org", message: "JSON posture", beforeImageTransfer: async () => undefined, imagePurpose: "rula-posture", includeKnowledge: false, maxOutputTokens: 5000, image: { mimeType: "image/png", base64: "test" } })).rejects.toMatchObject({ code: "PROVIDER_REQUEST_FAILED" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(knowledge).not.toHaveBeenCalled();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ model: "GPT-5-Mini", max_completion_tokens: 5000 });
  });

  it("retries a transient provider response with bounded attempts", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "temporary outage" } }), { status: 503, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "Recovered answer" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");

    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "risk guidance" });
    expect(result.answer).toBe("Recovered answer");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a transient network failure before returning the provider response", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "Network recovered answer" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");

    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "risk guidance" });
    expect(result.answer).toBe("Network recovered answer");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("normalises provider token usage without trusting malformed counts", async () => {
    const { normaliseAIUsage } = await import("./ai-provider.js");
    expect(normaliseAIUsage({ prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 })).toEqual({ inputTokens: 12, outputTokens: 8, totalTokens: 20 });
    expect(normaliseAIUsage({ input_tokens: 14, output_tokens: 6 })).toEqual({ inputTokens: 14, outputTokens: 6, totalTokens: 20 });
    expect(normaliseAIUsage({ promptTokenCount: 9, candidatesTokenCount: 4, totalTokenCount: 13 })).toEqual({ inputTokens: 9, outputTokens: 4, totalTokens: 13 });
    expect(normaliseAIUsage({ prompt_tokens: -1, completion_tokens: "not-a-number" })).toBeUndefined();
  });

  it("returns usage and the configured model with a successful ArvanCloud response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: "GPT-5-Mini", choices: [{ message: { content: "Usage-aware answer" } }], usage: { prompt_tokens: 21, completion_tokens: 7, total_tokens: 28 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "risk guidance" });
    expect(result.model).toBe("GPT-5-Mini");
    expect(result.usage).toEqual({ inputTokens: 21, outputTokens: 7, totalTokens: 28 });
  });

  it("rejects assessment failure without a cross-provider retry", async () => {
    process.env.AI_PROVIDER_MAX_ATTEMPTS = "1";
    process.env.AI_RISK_PROVIDER = "openai";
    process.env.AI_RISK_FALLBACK_PROVIDER = "arvancloud";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ model: "GPT-5-Mini", choices: [{ message: { content: "Fallback answer" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAvailableAIProvider } = await import("./ai-provider.js");

    await expect(getAvailableAIProvider("risk").analyze({ organizationId: "org", message: "risk guidance" })).rejects.toMatchObject({ code: "PROVIDER_REQUEST_FAILED", statusCode: 503 });
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(["https://api.arvancloudai.ir/v1/chat/completions"]);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe("GPT-5-Mini");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reports no assessment fallback despite obsolete settings without exposing credentials", async () => {
    process.env.AI_RISK_FALLBACK_PROVIDER = "openai";
    process.env.AI_RISK_FALLBACK_MODEL = "GPT-5-Mini";
    const { listAIProviders } = await import("./ai-provider.js");
    expect(listAIProviders().find((item) => item.name === "arvancloud")).toMatchObject({ riskModel: "GPT-5-Mini", riskFallbackProvider: null, riskFallbackModel: null });
    expect(JSON.stringify(listAIProviders())).not.toContain("test-arvancloud");
  });

  it("distinguishes image request configuration and approval from live provider verification", async () => {
    process.env.RULA_IMAGE_PRIVACY_APPROVED_PROVIDER = "arvancloud";
    process.env.RULA_IMAGE_VISION_SUPPORTED_PROVIDER = "arvancloud";
    process.env.FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER = "arvancloud";
    process.env.FMEA_IMAGE_VISION_SUPPORTED_PROVIDER = "arvancloud";
    const { listAIProviders } = await import("./ai-provider.js");
    const provider = listAIProviders().find((item) => item.name === "arvancloud");
    expect(provider?.assessmentImageReadiness).toMatchObject({
      model: "GPT-5-Mini",
      modelIdentityVerifiedByLiveResponse: "not-verified",
      rulaPosture: { configured: true, privacyApprovalMatches: true, capabilityApprovalMatches: true, adapterAllowsPurpose: true, requestGateOpen: true, liveReachability: "not-verified" },
      fmeaProcess: { configured: true, privacyApprovalMatches: true, capabilityApprovalMatches: true, adapterAllowsPurpose: true, requestGateOpen: true, liveReachability: "not-verified" },
    });
    process.env.FMEA_IMAGE_VISION_SUPPORTED_PROVIDER = "another-provider";
    expect(listAIProviders().find((item) => item.name === "arvancloud")?.assessmentImageReadiness.fmeaProcess.requestGateOpen).toBe(false);
  });

  it("does not enable ArvanCloud for an unsafe base URL", async () => {
    process.env.ARVAN_BASE_URL = "https://user:password@example.com/v1";
    const { getAIProvider } = await import("./ai-provider.js");
    expect(getAIProvider("arvancloud", "chat").available()).toBe(false);
    expect(getAIProvider("arvancloud", "chat").unavailableReason()).toBe("ARVAN_BASE_URL is invalid");
  });
});
