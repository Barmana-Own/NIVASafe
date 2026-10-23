import { describe, expect, it, vi } from "vitest";
import type { Attachment } from "@prisma/client";
import {
  assessmentImageTargetSchema, assessmentImageTransactionOptions, assertNoAssessmentImageLinks,
  assertReusableAssessmentImage, linkAssessmentImage, assessmentLinkedFilePage, listAssessmentImages,
  rulaReferencesAttachment, unlinkAssessmentImage, type ImageLinkClient,
} from "./assessment-image-links.js";

const organizationId = "dd14b1bc-71d6-46bd-a7c8-831564d67911";
const attachmentId = "ba6777e2-3d43-4e92-8dad-cb82a5df6e79";
const entityId = "89395151-1be1-447a-a087-e30f6d2a68dd";
const target = { entityType: "FmeaAssessment" as const, entityId };
const source = {
  id: attachmentId, organizationId, uploadedById: "owner", kind: "IMAGE", originalName: "posture.png",
  objectKey: "canonical.png", mimeType: "image/png", size: 2048, entityType: null, entityId: null,
  checksum: "canonical", createdAt: new Date("2026-10-22T00:00:00Z"), deletedAt: null,
} satisfies Attachment;

function repository(responses: unknown[], record: Attachment = source) {
  const query = vi.fn();
  responses.forEach(value => query.mockResolvedValueOnce(value));
  const execute = vi.fn().mockResolvedValue(1);
  const attachment = { findFirst: vi.fn().mockResolvedValue(record), update: vi.fn().mockResolvedValue(record) };
  return { client: { $queryRaw: query, $executeRaw: execute, attachment } as unknown as ImageLinkClient, query, execute, attachment };
}
function statement(call: unknown[]) {
  const value = call[0] as { sql?: string; values?: unknown[] } | string[];
  return Array.isArray(value) ? { sql: value.join("?"), values: call.slice(1) } : { sql: value.sql ?? "", values: value.values ?? [] };
}

describe("canonical assessment image associations", () => {
  it("accepts only an explicit assessment type and UUID, without extra mass-assignment fields", () => {
    expect(assessmentImageTargetSchema.parse(target)).toEqual(target);
    for (const body of [{ ...target, entityType: "KnowledgeDocument" }, { ...target, entityId: "x" }, { ...target, organizationId }]) {
      expect(assessmentImageTargetSchema.safeParse(body).success).toBe(false);
    }
  });

  it.each([
    { ...source, kind: "DOCUMENT" as const }, { ...source, mimeType: "image/svg+xml" },
  ])("rejects non-supported stored sources before reuse", value => {
    expect(() => assertReusableAssessmentImage(value)).toThrowError(expect.objectContaining({ code: "ASSESSMENT_IMAGE_TYPE_INVALID", statusCode: 415 }));
  });

  it.each([0, -1, 10 * 1024 * 1024 + 1])("rejects invalid stored byte size %s", size => {
    expect(() => assertReusableAssessmentImage({ ...source, size })).toThrowError(expect.objectContaining({ code: "ASSESSMENT_IMAGE_SIZE_INVALID", statusCode: 413 }));
  });

  it("uses source then parent locks and inserts only a link while retaining canonical identity", async () => {
    const repo = repository([[{ id: attachmentId }], [{ id: entityId }], [], [{ count: 2n }]]);
    expect(await linkAssessmentImage(repo.client, organizationId, attachmentId, target)).toBe(source);
    expect(repo.attachment.findFirst).toHaveBeenCalledWith({ where: { id: attachmentId, organizationId, deletedAt: null } });
    expect(repo.query.mock.calls.map(call => statement(call).sql)[0]).toContain("Attachment WHERE");
    expect(repo.query.mock.calls.map(call => statement(call).sql)[1]).toContain("FmeaAssessment WHERE");
    expect(repo.query.mock.calls.slice(0, 2).every(call => statement(call).sql.includes("FOR UPDATE"))).toBe(true);
    const inserted = statement(repo.execute.mock.calls[0]!);
    expect(inserted.sql).toContain("INSERT INTO AttachmentAssessmentLink");
    expect(inserted.values).toEqual([expect.any(String), organizationId, attachmentId, "FmeaAssessment", entityId]);
    expect(repo.attachment.update).not.toHaveBeenCalled();
    expect(assessmentImageTransactionOptions.isolationLevel).toBe("ReadCommitted");
  });

  it("is idempotent even at the capacity limit and does not insert or count again", async () => {
    const repo = repository([[{ id: attachmentId }], [{ id: entityId }], [{ id: attachmentId }]]);
    expect(await linkAssessmentImage(repo.client, organizationId, attachmentId, target)).toBe(source);
    expect(repo.query).toHaveBeenCalledTimes(3);
    expect(repo.execute).not.toHaveBeenCalled();
  });

  it.each([["FmeaAssessment", 3, "FMEA_ATTACHMENT_IMAGE_COUNT_LIMIT"], ["RulaAssessment", 4, "RULA_ATTACHMENT_IMAGE_COUNT_LIMIT"]] as const)("counts legacy and linked images before enforcing %s capacity", async (entityType, count, code) => {
    const repo = repository([[{ id: attachmentId }], [{ id: entityId }], [], [{ count: BigInt(count) }]]);
    await expect(linkAssessmentImage(repo.client, organizationId, attachmentId, { entityType, entityId })).rejects.toMatchObject({ statusCode: 409, code });
    expect(statement(repo.query.mock.calls[3]!).sql).toContain("OR EXISTS");
    expect(repo.execute).not.toHaveBeenCalled();
  });

  it("fails closed when either the source or active target is outside the tenant", async () => {
    const missingSource = repository([[]]);
    await expect(linkAssessmentImage(missingSource.client, organizationId, attachmentId, target)).rejects.toMatchObject({ statusCode: 404, code: "FILE_NOT_FOUND" });
    expect(missingSource.attachment.findFirst).not.toHaveBeenCalled();
    const missingTarget = repository([[{ id: attachmentId }], []]);
    await expect(linkAssessmentImage(missingTarget.client, organizationId, attachmentId, target)).rejects.toMatchObject({ statusCode: 404, code: "ASSESSMENT_IMAGE_TARGET_NOT_FOUND" });
    expect(missingTarget.execute).not.toHaveBeenCalled();
  });

  it("detaches just the specified association and keeps another legacy primary reference intact", async () => {
    const repo = repository([[{ id: attachmentId }], [{ id: entityId }]], { ...source, entityType: "RulaAssessment", entityId: "other-target" });
    await unlinkAssessmentImage(repo.client, organizationId, attachmentId, target);
    expect(statement(repo.execute.mock.calls[0]!).values).toEqual([organizationId, attachmentId, target.entityType, entityId]);
    expect(repo.attachment.update).not.toHaveBeenCalled();
  });

  it("clears a matching legacy primary without deleting the canonical attachment or object", async () => {
    const repo = repository([[{ id: attachmentId }], []], { ...source, ...target });
    await unlinkAssessmentImage(repo.client, organizationId, attachmentId, target);
    expect(repo.attachment.update).toHaveBeenCalledWith({ where: { id: attachmentId }, data: { entityType: null, entityId: null } });
    expect(statement(repo.query.mock.calls[1]!).sql).not.toContain("deletedAt IS NULL");
  });

  it("preserves reviewed RULA image references by rejecting unlink until they are explicitly cleared", async () => {
    const repo = repository([[{ id: attachmentId }], [{ id: entityId }], [{ activityInfo: { postureImageAttachmentId: attachmentId }, postureAnalysis: null }]]);
    await expect(unlinkAssessmentImage(repo.client, organizationId, attachmentId, { entityType: "RulaAssessment", entityId })).rejects.toMatchObject({ statusCode: 409, code: "RULA_IMAGE_RESULT_IN_USE" });
    expect(repo.execute).not.toHaveBeenCalled();
    expect(repo.attachment.update).not.toHaveBeenCalled();
    expect(rulaReferencesAttachment({ activityInfo: null, postureAnalysis: JSON.stringify({ imageAssessments: [{ attachmentId }] }) }, attachmentId)).toBe(true);
    expect(rulaReferencesAttachment({ activityInfo: "invalid", postureAnalysis: null }, attachmentId)).toBe(false);
  });

  it("blocks generic deletion of a canonical source still shared with any assessment", async () => {
    const repo = repository([[{ id: "link" }]]);
    await expect(assertNoAssessmentImageLinks(repo.client, organizationId, attachmentId)).rejects.toMatchObject({ statusCode: 409, code: "FILE_IN_USE" });
    expect(statement(repo.query.mock.calls[0]!).values).toEqual([organizationId, attachmentId]);
  });

  it("preserves unrelated legacy file filters and avoids a query for an empty assessment list", async () => {
    const repo = repository([]);
    expect(await assessmentLinkedFilePage(repo.client, organizationId, { entityType: "KnowledgeDocument", entityId }, { page: 1, limit: 20 })).toBeNull();
    expect(await listAssessmentImages(repo.client, organizationId, "RulaAssessment", [])).toEqual([]);
    expect(repo.query).not.toHaveBeenCalled();
  });

  it("paginates legacy and linked memberships in SQL and parameterizes tenant and target values", async () => {
    const repo = repository([[{ id: attachmentId }], [{ count: 101n }]]);
    expect(await assessmentLinkedFilePage(repo.client, organizationId, target, { page: 2, limit: 20 })).toEqual({ ids: [attachmentId], total: 101 });
    const query = statement(repo.query.mock.calls[0]!);
    expect(query.sql).toContain("OR EXISTS");
    expect(query.sql).toContain("LIMIT ? OFFSET ?");
    expect(query.values).toEqual([organizationId, target.entityType, entityId, organizationId, target.entityType, entityId, 20, 20]);
    expect(query.sql).not.toContain(entityId);
  });
});
