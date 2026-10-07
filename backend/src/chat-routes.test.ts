import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({ analyze: vi.fn(), db: { chatConversation: { findFirst: vi.fn(), update: vi.fn() }, chatMessage: { findMany: vi.fn(), create: vi.fn() }, auditLog: { create: vi.fn() }, $transaction: vi.fn() } }));
vi.mock("./core.js", () => ({ prisma: mocks.db, requireOrg: () => "org-a", envelope: (data: unknown) => ({ data }), parse: (schema: z.ZodType, data: unknown) => schema.parse(data), audit: vi.fn(), pageParams: vi.fn() }));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: { actor: unknown }) => { request.actor = { userId: "user-a" }; } }));
vi.mock("./ai-provider.js", () => ({ getAvailableAIProvider: () => ({ analyze: mocks.analyze }), describeAIProviderError: vi.fn(), getConfiguredAIProviderName: vi.fn(), getRoutedAIProvider: vi.fn(), listAIProviders: vi.fn() }));
vi.mock("./queue.js", () => ({ enqueueAI: vi.fn() }));
vi.mock("./ai-usage.js", () => ({ recordAIUsage: vi.fn() }));
import { registerAIRoutes } from "./modules/ai.js";
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.chatConversation.findFirst.mockResolvedValue({ id, title: "Existing topic" });
  mocks.db.chatMessage.findMany.mockResolvedValue([]);
  mocks.db.chatMessage.create.mockImplementation(async ({ data }: { data: unknown }) => ({ id: "message", ...data as object }));
  mocks.db.$transaction.mockImplementation(async (operation: (tx: unknown) => Promise<unknown>) => operation(mocks.db));
  mocks.analyze.mockResolvedValue({ provider: "gapgpt", answer: "Answer", citations: [] });
});
describe("chat HTTP isolation", () => {
  it("sends long input intact with only the requested conversation history", async () => {
    const app = Fastify(); await app.register(registerAIRoutes);
    try {
      const content = "x".repeat(10_000) + " END";
      const response = await app.inject({ method: "POST", url: `/api/v1/chat/conversations/${id}/messages`, payload: { content } });
      expect(response.statusCode).toBe(201);
      expect(mocks.analyze.mock.calls[0]![0]).toMatchObject({ message: content, history: [], maxOutputTokens: 4000 });
      expect(mocks.db.chatConversation.findFirst.mock.calls[0]![0].where).toEqual({ id, organizationId: "org-a", userId: "user-a", archivedAt: null });
      expect(mocks.db.chatMessage.findMany.mock.calls[0]![0].where).toEqual({ conversationId: id });
    } finally { await app.close(); }
  });
  it("does not send or mutate a conversation outside the caller's scope", async () => {
    mocks.db.chatConversation.findFirst.mockResolvedValue(null);
    const app = Fastify(); await app.register(registerAIRoutes);
    try {
      expect((await app.inject({ method: "POST", url: `/api/v1/chat/conversations/${id}/messages`, payload: { content: "Question" } })).statusCode).toBe(404);
      expect(mocks.analyze).not.toHaveBeenCalled();
      expect(mocks.db.chatMessage.create).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
});
