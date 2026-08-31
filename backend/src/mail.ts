import nodemailer from "nodemailer";
import { OutboxStatus } from "@prisma/client";
import { prisma } from "./core.js";
import { enqueueNotification } from "./queue.js";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  const smtpUrl = process.env.SMTP_URL?.trim();
  if (!smtpUrl) return null;
  transporter ??= nodemailer.createTransport(smtpUrl);
  return transporter;
}

export async function deliverEmailOutbox(outboxId: string) {
  const item = await prisma.emailOutbox.findUnique({ where: { id: outboxId } });
  if (!item || item.status === OutboxStatus.SENT) return;
  const transport = getTransporter();
  if (!transport) {
    await prisma.emailOutbox.update({ where: { id: item.id }, data: { status: OutboxStatus.FAILED, attempts: { increment: 1 }, lastError: "SMTP_URL is not configured", nextAttemptAt: new Date(Date.now() + 300_000) } });
    throw new Error("SMTP_URL is not configured");
  }

  await prisma.emailOutbox.update({ where: { id: item.id }, data: { status: OutboxStatus.PROCESSING, attempts: { increment: 1 } } });
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "NIVASafe <no-reply@nivasafe.local>",
      to: item.recipient,
      subject: item.subject,
      text: item.body,
    });
    await prisma.emailOutbox.update({ where: { id: item.id }, data: { status: OutboxStatus.SENT, lastError: null, nextAttemptAt: null } });
  } catch (error) {
    await prisma.emailOutbox.update({ where: { id: item.id }, data: { status: OutboxStatus.FAILED, lastError: error instanceof Error ? error.message : "SMTP delivery failed", nextAttemptAt: new Date(Date.now() + 300_000) } });
    throw error;
  }
}

export async function scheduleEmail(outboxId: string) {
  const queued = await enqueueNotification(outboxId);
  if (queued) return;
  if (process.env.SMTP_URL) await deliverEmailOutbox(outboxId);
}
