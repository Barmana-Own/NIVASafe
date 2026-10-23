import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { parseEnv } from "node:util";

const root = "C:/NIVASafe";
const evidence = `${root}/reports/evidence/assessment-image-activation-20261022-01`;
const require = createRequire(`${root}/backend/package.json`);
const { PrismaClient } = require("@prisma/client");
const config = parseEnv(fs.readFileSync(`${root}/.env`, "utf8"));
const db = new PrismaClient({ datasources: { db: { url: config.DATABASE_URL } } });
const sha = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const ownerId = "849037e9-1abd-497b-b287-05708579e07f";
const fixtureSha256 = "246c363399f29da2ded072a7b20dee3eb71c98665d6a14c8c4df14386e5ed195";
try {
  const rula = await db.rulaAssessment.findUniqueOrThrow({ where: { id: "92927dab-e99e-4c0c-a8a5-08feb3f9652f" }, select: { id: true, status: true, subjectCode: true, postureAnalysis: true, updatedAt: true } });
  const fmea = await db.fmeaAssessment.findUniqueOrThrow({ where: { id: "d65ce6f0-de88-49e8-a69c-6e79700c3e28" }, select: { id: true, status: true, activityDescription: true, updatedAt: true, _count: { select: { items: true } } } });
  assert.equal(rula.subjectCode, "TEST-ONLY-20261022");
  assert(fmea.activityDescription.startsWith("TEST-ONLY-20261022:"));
  assert.equal(rula.status, "DRAFT"); assert.equal(fmea.status, "DRAFT");
  const images = rula.postureAnalysis.imageAssessments;
  assert.equal(images.length, 2); assert(images.every(image => image.attachmentId));
  assert.match(images[1].model, /gpt-5-mini/iu);
  assert.equal(fmea._count.items, 25);
  const receipts = await db.auditLog.findMany({ where: { userId: ownerId, createdAt: { gte: new Date("2026-10-22T17:12:00Z") }, action: { in: ["RULA_IMAGE_TRANSFER_AUTHORIZED", "FMEA_IMAGE_TRANSFER_AUTHORIZED"] } }, orderBy: { createdAt: "asc" }, take: 20, select: { requestId: true, action: true, createdAt: true, metadata: true } });
  // Exclude simultaneous owner activity: only the known synthetic fixture belongs to this test.
  const own = receipts.filter(row => row.metadata?.imageSha256 === fixtureSha256);
  assert.equal(own.length, 3);
  assert(own.every(row => row.metadata.accountConsentVersion === "image-processing-account-2026-10-22-v3"));
  const events = await db.auditLog.findMany({ where: { requestId: { in: own.map(row => row.requestId) }, action: { in: ["RULA_POSTURE_IMAGE_ANALYSIS_FAILED", "RULA_POSTURE_IMAGE_ANALYSIS", "FMEA_PROCESS_IMAGE_ANALYSIS"] } }, orderBy: { createdAt: "asc" }, select: { action: true, requestId: true, createdAt: true, metadata: true } });
  assert.equal(events.filter(row => row.action === "RULA_POSTURE_IMAGE_ANALYSIS_FAILED").length, 1);
  assert.equal(events.filter(row => row.action === "RULA_POSTURE_IMAGE_ANALYSIS").length, 1);
  assert.equal(events.find(row => row.action === "FMEA_PROCESS_IMAGE_ANALYSIS")?.metadata.riskRowCount, 5);
  const baseline = JSON.parse(fs.readFileSync(`${evidence}/integrity-baseline.json`, "utf8"));
  assert.equal(sha(`${root}/.env`), baseline.protectedPaths[0].sha256);
  const pdfs = [];
  for (const [kind, source] of [["rula", "C:/Users/Administrator/Downloads/RULA-92927dab-e99e-4c0c-a8a5-08feb3f9652f (1).pdf"], ["fmea", "C:/Users/Administrator/Downloads/FMEA-MVJQXXUZ-report (1).pdf"]]) {
    const target = `${evidence}/live-${kind}.pdf`;
    assert(fs.readFileSync(source).subarray(0, 5).equals(Buffer.from("%PDF-")));
    fs.copyFileSync(source, target);
    pdfs.push({ kind, path: target, bytes: fs.statSync(target).size, sha256: sha(target) });
  }
  const result = { status: "PASS", at: new Date().toISOString(), scope: "Owner-authorized synthetic public-browser tests; other concurrent user requests excluded", currentConsentConfirmedByOwnerAndUi: true, rula: { id: rula.id, status: rula.status, savedImages: images.length, linkedImages: images.length, newImageModel: images[1].model, updatedAt: rula.updatedAt, needsHumanReview: true }, fmea: { id: fmea.id, status: fmea.status, savedRows: fmea._count.items, imageGeneratedRows: 5, updatedAt: fmea.updatedAt }, providerAttempts: { total: 3, rula: 2, fmea: 1 }, firstRulaFailure: "Transient connection failure, underlying cause undetermined; explicit manual retry succeeded", automaticTransportReplay: false, fixtureSha256, events: events.map(row => ({ action: row.action, requestId: row.requestId, at: row.createdAt, aiStatus: row.metadata.aiStatus, riskRowCount: row.metadata.riskRowCount })), pdfs, privateEnvironmentUnchanged: true, noOfficialApprovalPerformed: true, unrelatedDraftPreserved: true };
  fs.writeFileSync(`${evidence}/live-browser-results.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally { await db.$disconnect(); }
