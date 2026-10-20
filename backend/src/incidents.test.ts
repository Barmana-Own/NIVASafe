import Fastify from "fastify";
import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  incidentReport: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  project: { findFirst: vi.fn() },
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
    role: request.headers["x-test-role"] ?? "PERSONNEL",
    globalRole: request.headers["x-test-role"] === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER",
  };
} }));
import { registerIncidentRoutes } from "./modules/incidents.js";

beforeEach(() => {
  vi.resetAllMocks();
  db.incidentReport.findMany.mockResolvedValue([]);
  db.incidentReport.count.mockResolvedValue(0);
  db.incidentReport.findFirst.mockResolvedValue(null);
  db.incidentReport.create.mockImplementation(async ({ data }: any) => ({ id: "incident-a", ...data, createdAt: new Date("2026-10-15T08:00:00Z") }));
  db.incidentReport.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
  db.project.findFirst.mockResolvedValue({ id: "project-a" });
});

async function withApp(run: (app: ReturnType<typeof Fastify>) => Promise<void>) {
  const app = Fastify();
  await registerIncidentRoutes(app);
  try { await run(app); } finally { await app.close(); }
}

it("creates an unclassified incident report in the actor's organization and audits only safe metadata", async () => withApp(async (app) => {
  const response = await app.inject({
    method: "POST", url: "/api/v1/incidents", headers: { authorization: "test" },
    payload: { kind: "NEAR_MISS", occurredAt: "2026-10-14T09:00:00.000Z", location: "Warehouse 2", summary: "Guardrail displaced", description: "A guardrail was found displaced during the morning walk-through." },
  });
  expect(response.statusCode).toBe(201);
  expect(db.incidentReport.create.mock.calls[0]![0].data).toMatchObject({ organizationId: "org-a", reporterId: "user-a", kind: "NEAR_MISS", status: "REPORTED" });
  expect(response.json().data).not.toHaveProperty("severity");
  expect(audit).toHaveBeenCalledWith(expect.anything(), "INCIDENT_REPORT_CREATE", "IncidentReport", "incident-a", { kind: "NEAR_MISS" });
  expect(audit.mock.calls[0]?.[4]).toEqual({ kind: "NEAR_MISS" });
}));

it("rejects invalid incident input before persistence", async () => withApp(async (app) => {
  const response = await app.inject({ method: "POST", url: "/api/v1/incidents", headers: { authorization: "test" }, payload: { kind: "INJURY", occurredAt: "yesterday", location: "", summary: "x", description: "x" } });
  expect(response.statusCode).toBe(400);
  expect(db.incidentReport.create).not.toHaveBeenCalled();
}));

it("scopes reporters to their own cases and lets HSE managers list the organization queue", async () => withApp(async (app) => {
  await app.inject({ url: "/api/v1/incidents?status=REPORTED", headers: { authorization: "test" } });
  expect(db.incidentReport.findMany.mock.calls[0]![0].where).toMatchObject({ organizationId: "org-a", status: "REPORTED", reporterId: "user-a" });
  db.incidentReport.findMany.mockClear();
  await app.inject({ url: "/api/v1/incidents", headers: { authorization: "test", "x-test-role": "HSE_MANAGER" } });
  expect(db.incidentReport.findMany.mock.calls[0]![0].where).toEqual({ organizationId: "org-a" });
}));

it("does not disclose another reporter's case and reserves review transitions for managers", async () => withApp(async (app) => {
  const id = "00000000-0000-4000-8000-000000000007";
  const hidden = await app.inject({ url: `/api/v1/incidents/${id}`, headers: { authorization: "test", "x-user-id": "user-b" } });
  expect(hidden.statusCode).toBe(404);
  const denied = await app.inject({ method: "PATCH", url: `/api/v1/incidents/${id}`, headers: { authorization: "test", "x-test-role": "HSE_SPECIALIST" }, payload: { status: "CLOSED" } });
  expect(denied.statusCode).toBe(403);
  db.incidentReport.findFirst.mockResolvedValueOnce({ id, organizationId: "org-a", reporterId: "user-a", status: "REPORTED" });
  const reviewed = await app.inject({ method: "PATCH", url: `/api/v1/incidents/${id}`, headers: { authorization: "test", "x-test-role": "HSE_MANAGER" }, payload: { status: "UNDER_REVIEW" } });
  expect(reviewed.statusCode).toBe(200);
  expect(db.incidentReport.update.mock.calls[0]![0]).toMatchObject({ where: { id }, data: { status: "UNDER_REVIEW", reviewedById: "user-a" } });
}));
