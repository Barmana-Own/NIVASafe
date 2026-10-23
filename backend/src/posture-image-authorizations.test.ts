import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ user: { findFirst: vi.fn() }, organizationMember: { findFirst: vi.fn(), findMany: vi.fn() }, organization: { findUnique: vi.fn() }, auditLog: { findFirst: vi.fn(), findMany: vi.fn(), groupBy: vi.fn(), create: vi.fn() } }));
vi.mock("./core.js", async original => ({ ...await original<typeof import("./core.js")>(), prisma: db, audit: async (request: { actor: { userId: string; organizationId: string }; id: string }, action: string, entityType: string, entityId: string, metadata: object) => db.auditLog.create({ data: { userId: request.actor.userId, organizationId: request.actor.organizationId, action, entityType, entityId, metadata, requestId: request.id } }) }));
import { ACCOUNT_IMAGE_CONSENT_VERSION, IMAGE_PROCESSING_PURPOSE } from "./image-processing-consent.js";
import { authorizePostureImageSubject } from "./posture-image-authorizations.js";
import { registerPostureImageAuthorizationRoutes } from "./modules/posture-image-authorizations.js";

const owner = "11111111-1111-4111-8111-111111111111", recipient = "22222222-2222-4222-8222-222222222222", other = "33333333-3333-4333-8333-333333333333";
type RecordRow = { id: string; userId: string; organizationId: string | null; entityType: string; entityId: string; action: string; metadata: Record<string, unknown>; createdAt: Date };
let rows: RecordRow[];
let members: Array<{ userId: string; organizationId: string; role: "PERSONNEL" | "ASSESSOR" | "VIEWER"; user: { displayName: string; email: string; globalRole: "USER" } }>;
function consent(userId: string, id = `consent-${userId}`, action = "IMAGE_PROCESSING_CONSENT_ACCEPTED") {
  return { id, userId, organizationId: null, entityType: "ImageProcessingConsent", entityId: userId, action, metadata: { policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, provider: "arvancloud", purpose: IMAGE_PROCESSING_PURPOSE }, createdAt: new Date("2026-10-22T00:00:00Z") };
}
function matches(row: RecordRow, where: Record<string, any>) {
  return (!where.userId || (typeof where.userId === "string" ? row.userId === where.userId : where.userId.in.includes(row.userId))) && (where.organizationId === undefined || row.organizationId === where.organizationId) && (!where.entityType || row.entityType === where.entityType) && (!where.entityId || (typeof where.entityId === "string" ? row.entityId === where.entityId : where.entityId.in.includes(row.entityId))) && (!where.action || (typeof where.action === "string" ? row.action === where.action : where.action.in.includes(row.action))) && (!where.metadata || row.metadata.recipientUserId === where.metadata.equals);
}
beforeEach(() => {
  vi.resetAllMocks();
  rows = [consent(owner), consent(recipient)];
  members = [{ userId: owner, organizationId: "org-a", role: "PERSONNEL", user: { displayName: "Synthetic Owner", email: "owner@example.test", globalRole: "USER" } }, { userId: recipient, organizationId: "org-a", role: "ASSESSOR", user: { displayName: "Synthetic Assessor", email: "recipient@example.test", globalRole: "USER" } }, { userId: other, organizationId: "org-b", role: "ASSESSOR", user: { displayName: "Other Tenant", email: "other@example.test", globalRole: "USER" } }];
  db.user.findFirst.mockImplementation(async ({ where }) => ({ id: where.id, active: true, globalRole: "USER" }));
  db.organization.findUnique.mockResolvedValue({ active: true, subscriptionStatus: "ACTIVE", subscriptionExpiresAt: null });
  db.organizationMember.findFirst.mockImplementation(async ({ where }) => members.find(m => m.organizationId === where.organizationId && (!where.userId || m.userId === where.userId) && (!where.user?.email || m.user.email === where.user.email)) ?? null);
  db.organizationMember.findMany.mockImplementation(async ({ where }) => members.filter(m => m.organizationId === where.organizationId && where.userId.in.includes(m.userId)));
  db.auditLog.findFirst.mockImplementation(async ({ where }) => rows.filter(row => matches(row, where)).at(-1) ?? null);
  db.auditLog.findMany.mockImplementation(async ({ where, take }) => rows.filter(row => matches(row, where)).reverse().slice(0, take ?? rows.length));
  db.auditLog.groupBy.mockImplementation(async ({ where }) => rows.filter(row => matches(row, where)).map(row => ({ userId: row.userId, _max: { createdAt: row.createdAt } })));
  db.auditLog.create.mockImplementation(async ({ data }) => { const row = { id: `audit-${rows.length}`, createdAt: new Date(), ...data }; rows.push(row); return row; });
});
async function withApp(run: (app: ReturnType<typeof Fastify>, headers: Record<string, string>) => Promise<void>) {
  const app = Fastify();
  await app.register(jwt, { secret: "synthetic-owner-grant-test" });
  app.setErrorHandler((error, _request, reply) => { const failure = error as Error & { statusCode?: number; code?: string }; return reply.code(failure.statusCode ?? 500).send({ error: { code: failure.code ?? "INTERNAL_ERROR" } }); });
  await registerPostureImageAuthorizationRoutes(app);
  try { await run(app, { authorization: `Bearer ${app.jwt.sign({ sub: owner })}`, "x-organization-id": "org-a" }); } finally { await app.close(); }
}
const url = "/api/v1/profile/posture-image-authorizations";
async function create(app: ReturnType<typeof Fastify>, headers: Record<string, string>, extra: object = {}) {
  return app.inject({ method: "POST", url, headers, payload: { recipientEmail: "recipient@example.test", policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, ...extra } });
}
it("records a grant by the authenticated consenting owner and bounds its default expiry", async () => withApp(async (app, headers) => {
  const response = await create(app, headers);
  expect(response.statusCode, response.body).toBe(201);
  const grant = response.json().data;
  expect(grant).toMatchObject({ ownerUserId: owner, recipientUserId: recipient, status: "ACTIVE", policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION });
  expect(Date.parse(grant.expiresAt) - Date.now()).toBeGreaterThan(29 * 86_400_000);
  expect(Date.parse(grant.expiresAt) - Date.now()).toBeLessThanOrEqual(30 * 86_400_000);
  expect(rows.at(-1)).toMatchObject({ userId: owner, organizationId: "org-a", entityId: grant.id, action: "POSTURE_IMAGE_AUTHORIZATION_GRANTED", metadata: { ownerConsentRecordId: `consent-${owner}`, provider: "arvancloud", purpose: IMAGE_PROCESSING_PURPOSE } });
  expect(await authorizePostureImageSubject({ userId: recipient, organizationId: "org-a", imageSubject: "THIRD_PARTY", ownerAuthorizationId: grant.id })).toMatchObject({ imageOwnerUserId: owner, ownerAuthorizationId: grant.id });
}));
it.each([{ expiresInDays: 0 }, { expiresInDays: 91 }, { policyVersion: "old" }, { ownerUserId: other }, { recipientEmail: "other@example.test" }, { recipientEmail: "owner@example.test" }])("rejects unbounded, forged, self or cross-tenant grant input %j", async extra => withApp(async (app, headers) => {
  expect((await create(app, headers, extra)).statusCode).toBe(400);
  expect(db.auditLog.create).not.toHaveBeenCalled();
}));
it("does not grant without the current owner receipt or to a read-only recipient", async () => withApp(async (app, headers) => {
  rows[0]!.metadata.policyVersion = "image-processing-account-2026-10-19-v1";
  expect((await create(app, headers)).statusCode).toBe(403);
  rows[0] = consent(owner);
  members[1]!.role = "VIEWER";
  expect((await create(app, headers)).statusCode).toBe(400);
  expect(db.auditLog.create).not.toHaveBeenCalled();
}));
it("requires authentication and current organization membership", async () => withApp(async (app, headers) => {
  expect((await app.inject({ url })).statusCode).toBe(401);
  expect((await create(app, { ...headers, "x-organization-id": "org-b" })).statusCode).toBe(401);
}));
it("lists only actor-issued or actor-received grants with bounded queries", async () => withApp(async (app, headers) => {
  const grant = (await create(app, headers)).json().data;
  const issued = await app.inject({ url: `${url}?direction=issued`, headers });
  expect(issued.json().data.grants).toMatchObject([{ id: grant.id, status: "ACTIVE" }]);
  const received = await app.inject({ url: `${url}?direction=received`, headers: { ...headers, authorization: `Bearer ${app.jwt.sign({ sub: recipient })}` } });
  expect(received.json().data.grants).toMatchObject([{ id: grant.id, ownerUserId: owner }]);
  expect(db.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50, where: expect.objectContaining({ organizationId: "org-a" }) }));
}));
it.each([
  { policyVersion: "image-processing-account-2026-10-22-v2", purpose: "rula-posture" },
  { policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, purpose: "rula-posture" },
])("preserves historical grants as outdated and revocable without authorizing their old scope: %j", async metadata => withApp(async (app, headers) => {
  const grant = (await create(app, headers)).json().data;
  Object.assign(rows.at(-1)!.metadata, metadata);
  const recipientHeaders = { ...headers, authorization: `Bearer ${app.jwt.sign({ sub: recipient })}` };
  for (const [direction, actorHeaders] of [["issued", headers], ["received", recipientHeaders]] as const) {
    const listed = await app.inject({ url: `${url}?direction=${direction}`, headers: actorHeaders });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data.grants).toMatchObject([{ id: grant.id, ownerUserId: owner, recipientUserId: recipient, policyVersion: metadata.policyVersion, status: "POLICY_OUTDATED" }]);
  }
  await expect(authorizePostureImageSubject({ userId: recipient, organizationId: "org-a", imageSubject: "THIRD_PARTY", ownerAuthorizationId: grant.id })).rejects.toMatchObject({ code: "POSTURE_IMAGE_OWNER_AUTHORIZATION_REQUIRED" });
  expect((await app.inject({ method: "DELETE", url: `${url}/${grant.id}`, headers: recipientHeaders })).statusCode).toBe(404);
  expect((await app.inject({ method: "DELETE", url: `${url}/${grant.id}`, headers })).statusCode).toBe(200);
  expect((await app.inject({ url, headers })).json().data.grants).toMatchObject([{ id: grant.id, status: "REVOKED" }]);
  await expect(authorizePostureImageSubject({ userId: recipient, organizationId: "org-a", imageSubject: "THIRD_PARTY", ownerAuthorizationId: grant.id })).rejects.toMatchObject({ code: "POSTURE_IMAGE_OWNER_AUTHORIZATION_REQUIRED" });
}));
it("allows only the owner to revoke, and revocation permanently blocks dispatch", async () => withApp(async (app, headers) => {
  const grant = (await create(app, headers)).json().data;
  const recipientHeaders = { ...headers, authorization: `Bearer ${app.jwt.sign({ sub: recipient })}` };
  expect((await app.inject({ method: "DELETE", url: `${url}/${grant.id}`, headers: recipientHeaders })).statusCode).toBe(404);
  expect((await app.inject({ method: "DELETE", url: `${url}/${grant.id}`, headers })).statusCode).toBe(200);
  await expect(authorizePostureImageSubject({ userId: recipient, organizationId: "org-a", imageSubject: "THIRD_PARTY", ownerAuthorizationId: grant.id })).rejects.toMatchObject({ code: "POSTURE_IMAGE_OWNER_AUTHORIZATION_REQUIRED" });
  expect((await app.inject({ url, headers })).json().data.grants[0].status).toBe("REVOKED");
}));
it.each(["expired", "withdrawn", "reaccepted", "removed-member", "wrong-recipient", "wrong-tenant", "old-policy"])("rejects third-party dispatch after %s", async kind => withApp(async (app, headers) => {
  const grant = (await create(app, headers)).json().data;
  let actor = recipient, organizationId = "org-a";
  if (kind === "expired") rows.at(-1)!.metadata.expiresAt = new Date(Date.now() - 1000).toISOString();
  if (kind === "withdrawn") rows.push(consent(owner, "withdrawn", "IMAGE_PROCESSING_CONSENT_WITHDRAWN"));
  if (kind === "reaccepted") rows.push(consent(owner, "new-receipt"));
  if (kind === "removed-member") members = members.filter(m => m.userId !== owner);
  if (kind === "wrong-recipient") actor = other;
  if (kind === "wrong-tenant") organizationId = "org-b";
  if (kind === "old-policy") rows.at(-1)!.metadata.policyVersion = "old";
  await expect(authorizePostureImageSubject({ userId: actor, organizationId, imageSubject: "THIRD_PARTY", ownerAuthorizationId: grant.id })).rejects.toMatchObject({ statusCode: 403 });
}));
it("rejects missing owner permission and a grant attached to a self image", async () => {
  await expect(authorizePostureImageSubject({ userId: recipient, organizationId: "org-a", imageSubject: "THIRD_PARTY" })).rejects.toMatchObject({ statusCode: 403 });
  await expect(authorizePostureImageSubject({ userId: recipient, organizationId: "org-a", imageSubject: "SELF", ownerAuthorizationId: owner })).rejects.toMatchObject({ statusCode: 403 });
});
