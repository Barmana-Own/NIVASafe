import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { suggestedRulaPostureScore } from "../../../shared/domain/dist/index.js";

export const parts = ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"];
export const limits = [6, 3, 4, 2, 6, 6, 2];
export const digest = bytes => createHash("sha256").update(bytes).digest("hex");
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, bytes) { const kind = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4); length.writeUInt32BE(bytes.length); crc.writeUInt32BE(crc32(Buffer.concat([kind, bytes]))); return Buffer.concat([length, kind, bytes, crc]); }
function png(index) {
  const width = 64, height = 96, header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const pixels = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const at = y * (width * 3 + 1) + 1 + x * 3; pixels[at] = (index * 47 + x) % 256; pixels[at + 1] = (80 + y) % 256; pixels[at + 2] = (170 - index * 20 + x) % 256; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]);
}
export const photos = Array.from({ length: 4 }, (_, index) => {
  const buffer = png(index + 1), id = `10000000-0000-4000-8000-00000000000${index + 1}`;
  return { index, id, name: `synthetic-photo-${index + 1}.png`, mimeType: "image/png", buffer, sha256: digest(buffer), originalName: `synthetic-photo-${index + 1}.png`, size: buffer.length, createdAt: "2026-10-22T12:00:00.000Z" };
});
export const project = { id: "20000000-0000-4000-8000-000000000001", name: "Synthetic posture review", nameFa: "پروژه آزمون مصنوعی پوسچر", nameEn: "Synthetic posture review", code: "PRJ-SYNTHETIC" };
export const session = { accessToken: "synthetic-local-validation-access", refreshToken: "synthetic-local-validation-refresh", user: { id: "30000000-0000-4000-8000-000000000001", email: "rula-side-qa@nivasafe.test", username: "rula_side_qa", displayName: "Synthetic posture reviewer", globalRole: "SUPER_ADMIN", locale: "en" }, organizations: [{ id: "40000000-0000-4000-8000-000000000001", nameFa: "سازمان آزمون مصنوعی", nameEn: "Synthetic QA organization", role: "ORG_ADMIN", active: true, subscriptionPlan: "ENTERPRISE", subscriptionStatus: "ACTIVE" }] };
export const recordId = "50000000-0000-4000-8000-000000000001";
export const adjustment = (index, side) => ({ force: (index + (side === "LEFT" ? 2 : 0)) % 4, muscleUse: (index + (side === "LEFT" ? 1 : 0)) % 2 === 1 });
export function sideRows(index, side, { reviewed = false, conflict = false, unmeasurable = false, legacy = false, unknownAdjustments = false } = {}) {
  const angles = { upperArm: [5, 35, 65, 105], lowerArm: [45, 75, 105, 120], wrist: [0, 10, 20, 35], neck: [5, 15, 30, -10], trunk: [0, 15, 35, 70] };
  const rows = Object.fromEntries(parts.map((part, partIndex) => {
    const numeric = Object.hasOwn(angles, part), measured = numeric ? angles[part][(index + (side === "LEFT" ? 1 : 0)) % 4] : null;
    const score = numeric ? suggestedRulaPostureScore(part, measured, true, 1) : 1 + (index + partIndex + (side === "LEFT" ? 2 : 0)) % limits[partIndex];
    const uncertain = (conflict || unmeasurable) && part === "neck";
    return [part, { angle: uncertain ? null : measured, score, detected: true, source: reviewed ? "USER" : "AI", confirmedByUser: reviewed, confidence: .92, ...(legacy ? {} : { requiresReview: true, measurement: { version: "image-plane-audit-v1", state: uncertain ? conflict ? "CONFLICT" : "UNMEASURABLE" : numeric ? "ESTIMATED" : "QUALITATIVE", basis: uncertain ? "UNSUPPORTED" : numeric ? "IMAGE_PLANE" : "SUPPORT", aiAngle: uncertain ? 75 : measured, aiScore: score, geometryAngle: uncertain ? conflict ? 20 : null : measured, qualityCodes: uncertain ? [conflict ? "ANGLE_LANDMARK_CONFLICT" : "LANDMARK_NOT_VISIBLE"] : [], view: "SAGITTAL", width: 64, height: 96, landmarks: [] } }) }];
  }));
  return { ...rows, ...(legacy ? {} : { bodySide: side }), ...(legacy || unknownAdjustments ? {} : { adjustments: adjustment(index, side) }) };
}
export function imageAnalysis(index, bodySide, options = {}) {
  const primary = bodySide === "LEFT" ? "LEFT" : "RIGHT";
  return { ...sideRows(index, primary, options), ...(bodySide === "BOTH" ? { sideAnalyses: { RIGHT: sideRows(index, "RIGHT", options), LEFT: sideRows(index, "LEFT", options) } } : {}) };
}
export function savedRecord(bodySide = "BOTH", options = {}) {
  const imageAssessments = photos.map(photo => ({ imageKey: `saved:${photo.id}`, attachmentId: photo.id, fileName: photo.name, analysis: imageAnalysis(photo.index, bodySide, { reviewed: true, ...options }), model: "synthetic-vision", ...adjustment(photo.index, bodySide === "LEFT" ? "LEFT" : "RIGHT") }));
  return { id: recordId, title: "Synthetic four-photo RULA", subjectCode: "RULA-SYNTHETIC", project, projectId: project.id, bodySide, status: "IN_PROGRESS", version: 1, score: 5, actionLevel: 3, explanation: "Synthetic fixture only", createdAt: "2026-10-22T12:00:00.000Z", updatedAt: "2026-10-22T12:00:00.000Z", postureReviewComplete: !options.conflict, inputs: { ...Object.fromEntries(parts.map(part => [part, imageAssessments[0].analysis[part].score])), ...adjustment(0, bodySide === "LEFT" ? "LEFT" : "RIGHT") }, activityInfo: { jobTitle: "Synthetic operator", taskDescription: "Inspect generated colored fixture cards.", postureImageAttachmentId: photos[0].id }, postureAnalysis: { ...imageAssessments[0].analysis, imageAssessments }, postureImages: photos.map(({ id, originalName, mimeType, size, createdAt }) => ({ id, originalName, mimeType, size, createdAt })) };
}
export function initialDraft(bodySide) { return { title: "Synthetic RULA photo-side values", projectId: project.id, bodySide, jobTitle: "Synthetic operator", taskDescription: "Inspect generated colored fixture cards.", force: "0", muscleUse: "0", customJobSelected: true }; }
