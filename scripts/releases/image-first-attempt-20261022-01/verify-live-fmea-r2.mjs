import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { evidence, root, read } from "./prepare-proxy.mjs";

// Read-only verification: credentials remain in process memory, and only a
// fixed allowlist of correlation/consent/usage metadata is written as evidence.
process.loadEnvFile(`${root}/.env`);
const require = createRequire(import.meta.url);
const { PrismaClient } = require(`${root}/backend/node_modules/@prisma/client`);
const db = new PrismaClient();
try {
  const start = read(`${evidence}/controlled-fmea-start-r2.json`);
  const rulaStart = read(`${evidence}/controlled-ui-start-r2.json`);
  const owner = await db.rulaVersion.findFirstOrThrow({ where: { assessmentId: rulaStart.assessmentId }, orderBy: { version: "desc" }, select: { createdBy: true } });
  const [fmea, rula] = await Promise.all([
    db.fmeaAssessment.findUniqueOrThrow({ where: { id: start.assessmentId }, select: { organizationId: true } }),
    db.rulaAssessment.findUniqueOrThrow({ where: { id: rulaStart.assessmentId }, select: { organizationId: true } }),
  ]);
  assert.equal(fmea.organizationId, rula.organizationId, "Controlled assessments must share their organization");
  const events = await db.auditLog.findMany({
    where: { userId: owner.createdBy, organizationId: fmea.organizationId, createdAt: { gte: new Date(start.startedAt) }, action: { in: ["FMEA_IMAGE_TRANSFER_AUTHORIZED", "FMEA_PROCESS_IMAGE_ANALYSIS", "FMEA_PROCESS_IMAGE_ANALYSIS_FAILED", "FMEA_PROCESS_IMAGE_ANALYSIS_BLOCKED"] } },
    orderBy: { createdAt: "asc" }, select: { action: true, createdAt: true, requestId: true, metadata: true }, take: 30,
  });
  const completed = events.filter(event => event.action === "FMEA_PROCESS_IMAGE_ANALYSIS");
  const failed = events.filter(event => event.action.endsWith("_FAILED") || event.action.endsWith("_BLOCKED"));
  const requestIds = [...new Set(events.map(event => event.requestId))];
  if (!completed.length && !failed.length) {
    console.log(JSON.stringify({ status: "PENDING", imageCompletionObserved: false, authorizedEvents: events.length, clientRequestsObserved: requestIds.length }));
  } else {
    assert.equal(events.length < 30, true, "Image observation window exceeded its bounded limit");
    assert.equal(failed.length, 0, "A failed or blocked image request occurred in the controlled window");
    assert.equal(requestIds.length, 1, "Exactly one isolated image client request is required");
    assert.equal(completed.length, 1, "Exactly one successful image completion is required");
    const done = completed[0];
    const authorized = events.filter(event => event.action === "FMEA_IMAGE_TRANSFER_AUTHORIZED");
    assert(authorized.length >= 1 && authorized.length <= 3, "Bounded fresh authorization evidence is required");
    assert(authorized.every(event => event.requestId === done.requestId && event.createdAt <= done.createdAt && event.metadata.attempt === 1));
    assert.equal(done.metadata.provider, "arvancloud");
    assert.equal(done.metadata.aiStatus, "connected");
    assert(Number.isInteger(done.metadata.riskRowCount) && done.metadata.riskRowCount >= 0);
    const receiptIds = [...new Set(authorized.map(event => event.metadata.consentRecordId))];
    assert(receiptIds.every(value => typeof value === "string" && value.length > 0));
    const receipts = await db.auditLog.findMany({ where: { id: { in: receiptIds }, userId: owner.createdBy }, select: { id: true, action: true, createdAt: true, metadata: true } });
    assert.equal(receipts.length, receiptIds.length);
    for (const event of authorized) {
      const receipt = receipts.find(item => item.id === event.metadata.consentRecordId);
      assert.equal(receipt.action, "IMAGE_PROCESSING_CONSENT_ACCEPTED");
      assert.equal(receipt.metadata.policyVersion, event.metadata.accountConsentVersion);
      assert.equal(event.metadata.accountConsentVersion, "image-processing-account-2026-10-22-v3");
      assert.equal(event.metadata.consentSource, "ACCOUNT_POLICY");
      assert.equal(event.metadata.purpose, "fmea-process");
      assert.equal(event.metadata.provider, "arvancloud");
      assert.match(event.metadata.imageSha256, /^[a-f0-9]{64}$/u);
      assert(receipt.createdAt <= event.createdAt);
    }
    const usage = await db.aIUsageRecord.findFirstOrThrow({ where: { userId: owner.createdBy, organizationId: fmea.organizationId, sourceType: "FMEA_IMAGE_REVIEW", sourceId: done.requestId }, select: { provider: true, model: true, inputTokens: true, outputTokens: true, totalTokens: true } });
    assert.equal(usage.provider, "arvancloud");
    const result = {
      status: "PASS", revision: 2, release: start.release, startedAt: start.startedAt,
      completedAt: done.createdAt, requestId: done.requestId, uploadActions: start.uploadActions,
      retryActions: start.retryActions, clientRequests: 1, failedRequests: 0,
      authorizationChecks: authorized.length, consentReceiptsVerified: receipts.length,
      elapsedMs: done.createdAt - new Date(start.startedAt), providerElapsedMs: done.createdAt - authorized[0].createdAt,
      provider: usage.provider, model: usage.model, aiStatus: done.metadata.aiStatus,
      riskRowCount: done.metadata.riskRowCount, imageSha256: authorized[0].metadata.imageSha256,
      usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, totalTokens: usage.totalTokens },
      imageRouteVerified: true, textFollowupsExcluded: true,
      resultPersistence: "FMEA route returns a validated image preview; unlike RULA, it does not create a durable AIAnalysisRequest image result",
      databaseMutationsByVerifier: 0,
      events: events.map(event => ({ action: event.action, createdAt: event.createdAt, requestId: event.requestId })),
    };
    fs.writeFileSync(`${evidence}/controlled-fmea-live-r2.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  }
} finally {
  await db.$disconnect();
}
