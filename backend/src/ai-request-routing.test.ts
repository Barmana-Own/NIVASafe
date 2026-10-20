import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  enqueueAI: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("./core.js", () => ({
  prisma: { aIAnalysisRequest: { create: mocks.create, findUniqueOrThrow: mocks.findUniqueOrThrow } },
  requireOrg: () => "org-a",
  envelope: (data: unknown) => ({ data }),
  parse: (schema: z.ZodType, data: unknown) => schema.parse(data),
  audit: mocks.audit,
  pageParams: vi.fn(),
}));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: { actor: unknown }) => { request.actor = { userId: "user-a" }; } }));
vi.mock("./ai-provider.js", () => ({
  describeAIProviderError: vi.fn(),
  getAvailableAIProvider: vi.fn(),
  getConfiguredAIProviderName: () => "arvancloud",
  getRoutedAIProvider: vi.fn(),
  listAIProviders: vi.fn(),
}));
vi.mock("./ai-usage.js", () => ({ recordAIUsage: vi.fn() }));
vi.mock("./queue.js", () => ({ enqueueAI: mocks.enqueueAI }));

import { registerAIRoutes } from "./modules/ai.js";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.enqueueAI.mockResolvedValue(true);
  mocks.create.mockResolvedValue({ id: "request-a" });
  mocks.findUniqueOrThrow.mockResolvedValue({ id: "request-a", provider: "arvancloud" });
});

describe("assessment provider routing", () => {
  it("rejects a caller-selected provider that differs from server configuration", async () => {
    const app = Fastify();
    app.setErrorHandler((error, _request, reply) => {
      const statusCode = error instanceof Error && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
      const code = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "INTERNAL_ERROR";
      return reply.status(statusCode).send({ error: { code } });
    });
    await app.register(registerAIRoutes);
    try {
      const response = await app.inject({ method: "POST", url: "/api/v1/ai/requests", payload: { message: "Assess this task", provider: "gapgpt" } });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("AI_PROVIDER_NOT_CONFIGURED");
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.enqueueAI).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("persists the configured provider when no provider override is supplied", async () => {
    const app = Fastify();
    await app.register(registerAIRoutes);
    try {
      const response = await app.inject({ method: "POST", url: "/api/v1/ai/requests", payload: { message: "Assess this task" } });
      expect(response.statusCode).toBe(202);
      expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ provider: "arvancloud", input: expect.objectContaining({ provider: "arvancloud" }) }) }));
      expect(mocks.enqueueAI).toHaveBeenCalledWith("request-a");
    } finally {
      await app.close();
    }
  });
});
