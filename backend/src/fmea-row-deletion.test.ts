import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), lock: vi.fn(), remove: vi.fn(), rows: vi.fn(), update: vi.fn() }));
vi.mock("./core.js", () => ({ prisma: { $transaction: mocks.transaction }, audit: vi.fn(), envelope: vi.fn(), parse: vi.fn(), requireOrg: vi.fn(), requirePermission: vi.fn() }));
import { deleteFmeaItemAndRenumber } from "./modules/assessments.js";
beforeEach(() => { vi.resetAllMocks(); mocks.transaction.mockImplementation(callback => callback({ fmeaAssessment: { update: mocks.lock }, fmeaItem: { deleteMany: mocks.remove, findMany: mocks.rows, update: mocks.update } })); mocks.remove.mockResolvedValue({ count: 1 }); });
it("locks the assessment, deletes only its matching item and compacts remaining numbers without changing IDs", async () => {
  mocks.rows.mockResolvedValue([{ id: "second", rowNumber: 2 }, { id: "third", rowNumber: 3 }]);
  await deleteFmeaItemAndRenumber("assessment", "first");
  expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]!);
  expect(mocks.remove).toHaveBeenCalledWith({ where: { id: "first", assessmentId: "assessment" } });
  expect(mocks.update.mock.calls.map(call => call[0])).toEqual([{ where: { id: "second" }, data: { rowNumber: 1 } }, { where: { id: "third" }, data: { rowNumber: 2 } }]);
});
it("rejects missing or wrong-assessment items before renumbering", async () => {
  mocks.remove.mockResolvedValue({ count: 0 });
  await expect(deleteFmeaItemAndRenumber("assessment", "foreign")).rejects.toMatchObject({ statusCode: 404 });
  expect(mocks.rows).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
});
it("preserves already contiguous row numbers and handles the last row", async () => {
  mocks.rows.mockResolvedValue([{ id: "first", rowNumber: 1 }]); await deleteFmeaItemAndRenumber("assessment", "last"); expect(mocks.update).not.toHaveBeenCalled();
  mocks.rows.mockResolvedValue([]); await deleteFmeaItemAndRenumber("assessment", "first"); expect(mocks.update).not.toHaveBeenCalled();
});
