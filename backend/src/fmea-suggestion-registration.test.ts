import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerFmeaSuggestion } from "./fmea-suggestion-registration.js";
import type { PrismaClient } from "@prisma/client";

const query = vi.fn(), source = vi.fn(), aggregate = vi.fn(), rowCreate = vi.fn(), findAction = vi.fn(), actionCreate = vi.fn();
const tx = { $queryRaw: query, fmeaItem: { findFirst: source, aggregate, create: rowCreate }, correctiveAction: { findFirst: findAction, create: actionCreate } };
const db = { $transaction: async (callback: (transaction: typeof tx) => unknown) => callback(tx) } as unknown as PrismaClient;
const original = { id: "source", assessment: { projectId: "project" }, processStep: "Assembly", failureMode: "Bad fit", effect: "Defect", cause: "Fixture", preventiveControls: "Guide", detectionControls: "Inspection", severity: 6, occurrence: 5, detection: 4, rpn: 120, riskLevel: "MEDIUM", residualRpn: 20 };
const command = { title: "Improve fixture", description: "Install a locating pin", priority: "MEDIUM" as const };
beforeEach(() => {
  vi.resetAllMocks(); query.mockResolvedValue([{ id: "assessment" }]); source.mockResolvedValue(original);
  aggregate.mockResolvedValue({ _max: { rowNumber: 5 } }); rowCreate.mockResolvedValue({ id: "new-row" });
  findAction.mockResolvedValue(null); actionCreate.mockImplementation(({ data }) => Promise.resolve(data));
});
describe("Independent FMEA suggestion registration", () => {
  it("appends a row, preserves source scores and links only to the new row", async () => {
    const action = await registerFmeaSuggestion(db, "tenant", "assessment", "source", command);
    expect(rowCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ assessmentId: "assessment", rowNumber: 6, failureMode: "Bad fit", rpn: 120, recommendation: command.title }) });
    expect(rowCreate.mock.calls[0]?.[0].data).not.toHaveProperty("residualRpn");
    expect(action).toMatchObject({ fmeaItemId: "new-row", fmeaId: "assessment", organizationId: "tenant", status: "IN_PROGRESS" });
    expect(original.rpn).toBe(120);
    expect(query.mock.calls[0]?.[0].values).toEqual(["assessment", "tenant"]);
    expect(query.mock.calls[0]?.[0].sql).toContain("FOR UPDATE");
  });
  it("returns the existing registration on retry without another risk row", async () => {
    findAction.mockResolvedValue({ id: "existing", fmeaItemId: "registered-row" });
    expect(await registerFmeaSuggestion(db, "tenant", "assessment", "source", command)).toMatchObject({ id: "existing" });
    expect(rowCreate).not.toHaveBeenCalled(); expect(actionCreate).not.toHaveBeenCalled();
  });
  it("rejects missing, deleted or cross-tenant assessments before reading source rows", async () => {
    query.mockResolvedValue([]);
    await expect(registerFmeaSuggestion(db, "tenant", "assessment", "source", command)).rejects.toMatchObject({ statusCode: 404 });
    expect(source).not.toHaveBeenCalled(); expect(rowCreate).not.toHaveBeenCalled();
  });
  it("rejects a source belonging to another assessment", async () => {
    source.mockResolvedValue(null);
    await expect(registerFmeaSuggestion(db, "tenant", "assessment", "foreign", command)).rejects.toMatchObject({ statusCode: 404 });
    expect(source).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign", assessmentId: "assessment" } }));
    expect(rowCreate).not.toHaveBeenCalled();
  });
  it("propagates action failure through the transaction rather than returning success", async () => {
    actionCreate.mockRejectedValue(new Error("failed"));
    await expect(registerFmeaSuggestion(db, "tenant", "assessment", "source", command)).rejects.toThrow("failed");
  });
});
