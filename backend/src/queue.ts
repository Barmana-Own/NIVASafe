import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;
export const redis = redisUrl ? new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true }) : null;
export const aiQueue = redis ? new Queue("nivasafe-ai", { connection: redis }) : null;
export const notificationQueue = redis ? new Queue("nivasafe-notifications", { connection: redis }) : null;

export async function enqueueAI(requestId: string) {
  if (!aiQueue) return false;
  await aiQueue.add("analyze", { requestId }, { jobId: requestId, attempts: 4, backoff: { type: "exponential", delay: 2_000 }, removeOnComplete: 100, removeOnFail: 100 });
  return true;
}

export async function enqueueNotification(outboxId: string) {
  if (!notificationQueue) return false;
  await notificationQueue.add("deliver", { outboxId }, { jobId: outboxId, attempts: 4, backoff: { type: "exponential", delay: 5_000 } });
  return true;
}
