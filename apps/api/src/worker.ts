import { AIRequestStatus, Prisma } from "@prisma/client";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { getAIProvider } from "./ai-provider.js";
import { prisma } from "./core.js";
import { deliverEmailOutbox } from "./mail.js";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) { process.stderr.write("REDIS_URL is required for the queue worker\n"); process.exit(1); }
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const aiWorker = new Worker("nivasafe-ai", async (job) => {
  const request = await prisma.aIAnalysisRequest.findUnique({ where: { id: String(job.data.requestId) } }); if (!request) return;
  const input = request.input as { message?: string }; const provider = getAIProvider(request.provider);
  await prisma.aIAnalysisRequest.update({ where: { id: request.id }, data: { status: AIRequestStatus.PROCESSING, startedAt: new Date(), attempts: { increment: 1 } } });
  try { const output = await provider.analyze({ organizationId: request.organizationId, message: input.message ?? "analysis" }); await prisma.aIAnalysisRequest.update({ where: { id: request.id }, data: { status: AIRequestStatus.SUCCEEDED, provider: output.provider, output: output as unknown as Prisma.InputJsonValue, completedAt: new Date(), error: null } }); }
  catch (error) { await prisma.aIAnalysisRequest.update({ where: { id: request.id }, data: { status: AIRequestStatus.WAITING_FOR_PROVIDER, error: error instanceof Error ? error.message : "Provider unavailable", availableAt: new Date(Date.now() + 60_000) } }); throw error; }
}, { connection, concurrency: Number(process.env.AI_WORKER_CONCURRENCY ?? 2) });

const notificationWorker = new Worker("nivasafe-notifications", async (job) => {
  await deliverEmailOutbox(String(job.data.outboxId));
}, { connection, concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY ?? 2) });

process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), level: "info", module: "worker", message: "workers ready" })}\n`);
async function shutdown() { await Promise.all([aiWorker.close(), notificationWorker.close()]); await connection.quit(); await prisma.$disconnect(); process.exit(0); }
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
