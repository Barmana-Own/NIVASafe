import { AIRequestStatus, Prisma } from "@prisma/client";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { describeAIProviderError, getRoutedAIProvider } from "./ai-provider.js";
import { recordAIUsage } from "./ai-usage.js";
import { prisma } from "./core.js";
import { deliverEmailOutbox } from "./mail.js";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) { process.stderr.write("REDIS_URL is required for the queue worker\n"); process.exit(1); }
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const aiWorker = new Worker("nivasafe-ai", async (job) => {
  const request = await prisma.aIAnalysisRequest.findUnique({ where: { id: String(job.data.requestId) } }); if (!request) return;
  const input = request.input as { message?: string }; const provider = getRoutedAIProvider("risk", request.provider);
  if (!provider.available()) { await prisma.aIAnalysisRequest.update({ where: { id: request.id }, data: { status: AIRequestStatus.WAITING_FOR_PROVIDER, error: "AI provider is not configured", attempts: { increment: 1 } } }); return; }
  await prisma.aIAnalysisRequest.update({ where: { id: request.id }, data: { status: AIRequestStatus.PROCESSING, startedAt: new Date(), attempts: { increment: 1 } } });
  try { const output = await provider.analyze({ organizationId: request.organizationId, userId: request.userId, message: input.message ?? "analysis" }); await prisma.$transaction(async (tx) => { await tx.aIAnalysisRequest.update({ where: { id: request.id }, data: { status: AIRequestStatus.SUCCEEDED, provider: output.provider, output: output as unknown as Prisma.InputJsonValue, completedAt: new Date(), error: null } }); await recordAIUsage(tx, { organizationId: request.organizationId, userId: request.userId, useCase: "risk", sourceType: "AI_ANALYSIS_REQUEST", sourceId: request.id, result: output }); }); }
  catch (error) { const safeError = new Error(describeAIProviderError(error)); await prisma.aIAnalysisRequest.update({ where: { id: request.id }, data: { status: AIRequestStatus.WAITING_FOR_PROVIDER, error: safeError.message, availableAt: new Date(Date.now() + 60_000) } }); throw safeError; }
}, { connection, concurrency: Number(process.env.AI_WORKER_CONCURRENCY ?? 2) });

const notificationWorker = new Worker("nivasafe-notifications", async (job) => {
  await deliverEmailOutbox(String(job.data.outboxId));
}, { connection, concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY ?? 2) });

process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), level: "info", module: "worker", message: "workers ready" })}\n`);
async function shutdown() { await Promise.all([aiWorker.close(), notificationWorker.close()]); await connection.quit(); await prisma.$disconnect(); process.exit(0); }
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
