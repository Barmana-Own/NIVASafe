import { describe, expect, it } from "vitest";
import { buildFmeaReportActionProgress } from "./fmea-report-action-progress.js";

describe("FMEA report action progress", () => {
  it("counts each saved action once and keeps recommendations in a separate bucket", () => {
    const actions = [
      { id: "open", title: "Install guard", fmeaItemId: "risk-1", status: "OPEN", progress: 0 },
      { id: "assigned", title: "Assign inspection", fmeaItemId: "risk-2", status: "ASSIGNED", progress: 25 },
      { id: "progress", title: "Train operators", fmeaItemId: "risk-3", status: "IN_PROGRESS", progress: 50 },
      { id: "review", title: "Check controls", fmeaItemId: "risk-4", status: "WAITING_FOR_REVIEW", progress: 75 },
      { id: "overdue", title: "Replace fixture", fmeaItemId: "risk-5", status: "OVERDUE", progress: 50 },
      { id: "done", title: "Repair barrier", fmeaItemId: "risk-6", status: "COMPLETED", progress: 100 },
      { id: "cancelled", title: "Cancelled action", fmeaItemId: "risk-7", status: "CANCELLED", progress: 100 },
      { id: "rejected", title: "Rejected action", fmeaItemId: "risk-8", status: "REJECTED", progress: 100 },
      { id: "cancelled-suggestion", title: "Retry barrier", fmeaItemId: "risk-10", status: "CANCELLED", progress: 100 },
      { id: "open", title: "Duplicate record", fmeaItemId: "risk-1", status: "OPEN", progress: 0 },
    ];
    const suggestions = [
      { id: "suggestion-1", fmeaItemId: "risk-1", title: "install guard" },
      { id: "suggestion-2", fmeaItemId: "risk-9", title: "Add a warning sign" },
      { id: "suggestion-3", fmeaItemId: "risk-9", title: "Add a warning sign" },
      { id: "suggestion-4", fmeaItemId: "risk-10", title: "Retry barrier" },
    ];

    const result = buildFmeaReportActionProgress(actions, suggestions);
    expect(result).toMatchObject({
      completedCount: 1,
      activeCount: 5,
      remainingCount: 2,
      totalCount: 8,
      averageProgress: 50,
    });
    expect(result.completedPercentage).toBeCloseTo(100 / 8);
  });

  it("keeps the all-dismissed, no-action report empty at zero percent", () => {
    expect(buildFmeaReportActionProgress([], [])).toMatchObject({
      completedCount: 0,
      activeCount: 0,
      remainingCount: 0,
      totalCount: 0,
      completedPercentage: 0,
      averageProgress: 0,
    });
  });
});
