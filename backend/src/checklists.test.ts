import Fastify from "fastify";
import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  checklistTemplate: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  checklistInspection: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  project: { findFirst: vi.fn() },
  organizationMember: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));
const audit = vi.hoisted(() => vi.fn());
vi.mock("./core.js", () => ({
  prisma: db,
  audit,
  envelope: (data: unknown, meta?: unknown) => ({ data, ...(meta ? { meta } : {}) }),
  requireOrg: (request: { actor?: { organizationId?: string } }) => {
    if (!request.actor?.organizationId) throw Object.assign(Error("Organization required"), { statusCode: 400 });
    return request.actor.organizationId;
  },
  pageParams: (query: any) => ({ page: Number(query?.page ?? 1), limit: Number(query?.limit ?? 20), ...(query?.status ? { status: query.status } : {}) }),
  parse: (schema: any, data: any) => {
    const result = schema.safeParse(data);
    if (!result.success) throw Object.assign(Error("Invalid input"), { statusCode: 400 });
    return result.data;
  },
}));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: any) => {
  if (!request.headers.authorization) throw Object.assign(Error("Unauthorized"), { statusCode: 401 });
  request.actor = {
    userId: request.headers["x-user-id"] ?? "user-a",
    organizationId: request.headers["x-org-id"] ?? "org-a",
    role: request.headers["x-test-role"] ?? "HSE_SPECIALIST",
    globalRole: request.headers["x-test-role"] === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER",
  };
} }));
import { registerChecklistRoutes } from "./modules/checklists.js";

const templateId = "00000000-0000-4000-8000-000000000011";
const inspectionId = "00000000-0000-4000-8000-000000000012";
const itemId = "00000000-0000-4000-8000-000000000013";
const template = { id: templateId, organizationId: "org-a", familyId: "family-a", version: 1, title: "Work area inspection", items: [{ id: itemId, label: "Guard condition", required: true }], status: "PUBLISHED", createdById: "user-a" };
const inspection = { id: inspectionId, organizationId: "org-a", assignedToId: "user-a", startedById: "user-a", status: "IN_PROGRESS", templateSnapshot: { templateId, version: 1, title: template.title, items: template.items }, answers: [] };

beforeEach(() => {
  vi.resetAllMocks();
  db.checklistTemplate.findMany.mockResolvedValue([template]);
  db.checklistTemplate.count.mockResolvedValue(1);
  db.checklistTemplate.findFirst.mockResolvedValue(null);
  db.checklistTemplate.create.mockImplementation(async ({ data }: any) => ({ id: templateId, ...data }));
  db.checklistTemplate.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
  db.checklistTemplate.updateMany.mockResolvedValue({ count: 0 });
  db.checklistInspection.findMany.mockResolvedValue([]);
  db.checklistInspection.count.mockResolvedValue(0);
  db.checklistInspection.findFirst.mockResolvedValue(null);
  db.checklistInspection.create.mockImplementation(async ({ data }: any) => ({ id: inspectionId, ...data }));
  db.checklistInspection.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
  db.project.findFirst.mockResolvedValue({ id: "project-a" });
  db.organizationMember.findFirst.mockResolvedValue({ id: "membership-a" });
  db.$transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({ checklistTemplate: db.checklistTemplate }));
});

async function withApp(run: (app: ReturnType<typeof Fastify>) => Promise<void>) {
  const app = Fastify();
  await registerChecklistRoutes(app);
  try { await run(app); } finally { await app.close(); }
}

it("creates organization-owned checklist templates as drafts and publishes only by an authorized reviewer", async () => withApp(async (app) => {
  const created = await app.inject({ method: "POST", url: "/api/v1/checklists/templates", headers: { authorization: "test", "x-test-role": "HSE_MANAGER" }, payload: { title: "Work area inspection", description: "Daily check", items: [{ label: "Guard condition", required: true }] } });
  expect(created.statusCode).toBe(201);
  const data = db.checklistTemplate.create.mock.calls[0]![0].data;
  expect(data).toMatchObject({ organizationId: "org-a", createdById: "user-a", version: 1, status: "DRAFT", title: "Work area inspection" });
  expect(data.items[0]).toMatchObject({ label: "Guard condition", required: true });
  db.checklistTemplate.findFirst.mockResolvedValueOnce({ ...template, status: "DRAFT" });
  const denied = await app.inject({ method: "POST", url: `/api/v1/checklists/templates/${templateId}/publish`, headers: { authorization: "test", "x-test-role": "HSE_SPECIALIST" }, payload: {} });
  expect(denied.statusCode).toBe(403);
  db.checklistTemplate.findFirst.mockResolvedValueOnce({ ...template, status: "DRAFT" });
  const published = await app.inject({ method: "POST", url: `/api/v1/checklists/templates/${templateId}/publish`, headers: { authorization: "test", "x-test-role": "HSE_MANAGER" }, payload: {} });
  expect(published.statusCode).toBe(200);
  expect(db.checklistTemplate.update.mock.calls[0]![0].data).toMatchObject({ status: "PUBLISHED" });
}));

it("allows managers to edit only the latest organization-owned draft template", async () => withApp(async (app) => {
  db.checklistTemplate.findFirst.mockResolvedValueOnce({ ...template, status: "DRAFT" }).mockResolvedValueOnce({ version: 1 });
  const response = await app.inject({ method: "PATCH", url: `/api/v1/checklists/templates/${templateId}`, headers: { authorization: "test", "x-test-role": "HSE_MANAGER" }, payload: { title: "Updated inspection", items: [{ label: "Emergency stop", required: true }] } });
  expect(response.statusCode).toBe(200);
  expect(db.checklistTemplate.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: templateId }, data: expect.objectContaining({ title: "Updated inspection" }) }));
  expect(db.checklistTemplate.update.mock.calls[0]![0].data.items[0]).toMatchObject({ label: "Emergency stop", required: true });

  db.checklistTemplate.findFirst.mockResolvedValueOnce({ ...template, status: "PUBLISHED" });
  const published = await app.inject({ method: "PATCH", url: `/api/v1/checklists/templates/${templateId}`, headers: { authorization: "test", "x-test-role": "HSE_MANAGER" }, payload: { title: "Cannot edit published" } });
  expect(published.statusCode).toBe(409);
  expect(db.checklistTemplate.update).toHaveBeenCalledTimes(1);

  const denied = await app.inject({ method: "PATCH", url: `/api/v1/checklists/templates/${templateId}`, headers: { authorization: "test", "x-test-role": "HSE_SPECIALIST" }, payload: { title: "Denied" } });
  expect(denied.statusCode).toBe(403);

  db.checklistTemplate.findFirst.mockResolvedValueOnce({ ...template, status: "DRAFT" }).mockResolvedValueOnce({ version: 2 });
  const stale = await app.inject({ method: "PATCH", url: `/api/v1/checklists/templates/${templateId}`, headers: { authorization: "test", "x-test-role": "HSE_MANAGER" }, payload: { title: "Stale draft" } });
  expect(stale.statusCode).toBe(409);
  expect(db.checklistTemplate.update).toHaveBeenCalledTimes(1);

  db.checklistTemplate.findFirst.mockResolvedValueOnce(null);
  const otherOrganization = await app.inject({ method: "PATCH", url: `/api/v1/checklists/templates/${templateId}`, headers: { authorization: "test", "x-test-role": "HSE_MANAGER", "x-org-id": "org-b" }, payload: { title: "Other tenant" } });
  expect(otherOrganization.statusCode).toBe(404);
  expect(db.checklistTemplate.update).toHaveBeenCalledTimes(1);
}));

it("creates an inspection from a published organization template and persists an immutable question snapshot", async () => withApp(async (app) => {
  db.checklistTemplate.findFirst.mockResolvedValueOnce(template);
  const response = await app.inject({ method: "POST", url: "/api/v1/checklists/inspections", headers: { authorization: "test" }, payload: { templateId } });
  expect(response.statusCode).toBe(201);
  expect(db.checklistInspection.create.mock.calls[0]![0].data).toMatchObject({
    organizationId: "org-a", templateId, templateVersion: 1, assignedToId: "user-a", startedById: "user-a", status: "IN_PROGRESS", answers: [],
    templateSnapshot: { templateId, version: 1, title: "Work area inspection", items: template.items },
  });
}));

it("rejects an inspection template from another organization", async () => withApp(async (app) => {
  db.checklistTemplate.findFirst.mockResolvedValueOnce(null);
  const response = await app.inject({ method: "POST", url: "/api/v1/checklists/inspections", headers: { authorization: "test", "x-org-id": "org-b" }, payload: { templateId } });
  expect(response.statusCode).toBe(404);
  expect(db.checklistInspection.create).not.toHaveBeenCalled();
}));

it("requires a note for a failed checklist item and never registers a finding as a corrective action", async () => withApp(async (app) => {
  db.checklistInspection.findFirst.mockResolvedValueOnce(inspection);
  const response = await app.inject({ method: "PATCH", url: `/api/v1/checklists/inspections/${inspectionId}`, headers: { authorization: "test" }, payload: { answers: [{ itemId, result: "FAIL" }] } });
  expect(response.statusCode).toBe(400);
  expect(db.checklistInspection.update).not.toHaveBeenCalled();
}));

it("requires required questions before submit and prevents unassigned users from editing the run", async () => withApp(async (app) => {
  db.checklistInspection.findFirst.mockResolvedValueOnce(inspection);
  const incomplete = await app.inject({ method: "POST", url: `/api/v1/checklists/inspections/${inspectionId}/submit`, headers: { authorization: "test" }, payload: {} });
  expect(incomplete.statusCode).toBe(400);
  db.checklistInspection.findFirst.mockResolvedValueOnce({ ...inspection, assignedToId: "user-b", startedById: "user-b" });
  const denied = await app.inject({ method: "PATCH", url: `/api/v1/checklists/inspections/${inspectionId}`, headers: { authorization: "test" }, payload: { answers: [] } });
  expect(denied.statusCode).toBe(404);
  expect(db.checklistInspection.update).not.toHaveBeenCalled();
}));

it("shows organization-wide runs to managers and scopes ordinary users to assigned or started runs", async () => withApp(async (app) => {
  await app.inject({ url: "/api/v1/checklists/inspections", headers: { authorization: "test" } });
  expect(db.checklistInspection.findMany.mock.calls[0]![0].where).toEqual({ organizationId: "org-a", OR: [{ assignedToId: "user-a" }, { startedById: "user-a" }] });
  db.checklistInspection.findMany.mockClear();
  await app.inject({ url: "/api/v1/checklists/inspections", headers: { authorization: "test", "x-test-role": "HSE_MANAGER" } });
  expect(db.checklistInspection.findMany.mock.calls[0]![0].where).toEqual({ organizationId: "org-a" });
}));

it("allows only managers to review submitted inspections and records the review state", async () => withApp(async (app) => {
  db.checklistInspection.findFirst.mockResolvedValueOnce({ ...inspection, status: "SUBMITTED" });
  const denied = await app.inject({ method: "POST", url: `/api/v1/checklists/inspections/${inspectionId}/review`, headers: { authorization: "test", "x-test-role": "HSE_SPECIALIST" }, payload: { decision: "APPROVED" } });
  expect(denied.statusCode).toBe(403);
  db.checklistInspection.findFirst.mockResolvedValueOnce({ ...inspection, status: "SUBMITTED" });
  const reviewed = await app.inject({ method: "POST", url: `/api/v1/checklists/inspections/${inspectionId}/review`, headers: { authorization: "test", "x-test-role": "HSE_MANAGER" }, payload: { decision: "APPROVED" } });
  expect(reviewed.statusCode).toBe(200);
  expect(db.checklistInspection.update.mock.calls[0]![0].data).toMatchObject({ status: "APPROVED", reviewDecision: "APPROVED", reviewedById: "user-a" });
}));
