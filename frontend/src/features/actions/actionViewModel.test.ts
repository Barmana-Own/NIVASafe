import { describe, expect, it } from "vitest";
import { actionListQueryString, actionPriorityForRiskLevel, allowedRulaActionSides, buildFmeaActionPayload, buildRulaActionPayload, filterActionList, type ActionRecord } from "./actionViewModel";

describe("typed corrective-action view model", () => {
  it("creates FMEA payloads without RULA side or impact values", () => {
    expect(buildFmeaActionPayload({
      projectId: "project-1", fmeaId: "fmea-1", fmeaItemId: "item-1", title: "  Secure load  ", description: " Add restraint ", priority: "HIGH", assigneeName: " A. Person ", dueDate: "2026-11-01",
    })).toEqual({
      projectId: "project-1", fmeaId: "fmea-1", fmeaItemId: "item-1", rulaId: null, bodySide: null, rulaImpact: null,
      title: "Secure load", description: "Add restraint", priority: "HIGH", assigneeName: "A. Person", dueDate: "2026-11-01", status: "OPEN",
    });
  });

  it("creates a RULA payload with the chosen side and no FMEA references", () => {
    expect(buildRulaActionPayload({
      projectId: "project-1", rulaId: "rula-1", bodySide: "LEFT", title: "Adjust workstation", description: "Raise the work surface", priority: "MEDIUM", assigneeName: "", dueDate: "",
    })).toEqual({
      projectId: "project-1", fmeaId: null, fmeaItemId: null, rulaId: "rula-1", bodySide: "LEFT", rulaImpact: null,
      title: "Adjust workstation", description: "Raise the work surface", priority: "MEDIUM", assigneeName: null, dueDate: null, status: "OPEN",
    });
  });

  it("restricts body-side choices to the selected assessment scope", () => {
    expect(allowedRulaActionSides("RIGHT")).toEqual(["RIGHT"]);
    expect(allowedRulaActionSides("LEFT")).toEqual(["LEFT"]);
    expect(allowedRulaActionSides("BOTH")).toEqual(["RIGHT", "LEFT", "BOTH"]);
  });

  it.each([["CRITICAL", "CRITICAL"], ["HIGH", "HIGH"], ["MEDIUM", "MEDIUM"], ["LOW", "MEDIUM"], ["VERY_LOW", "LOW"]])(
    "uses the existing FMEA risk-level to action-priority mapping for %s",
    (riskLevel, priority) => expect(actionPriorityForRiskLevel(riskLevel)).toBe(priority),
  );

  it("keeps FMEA, RULA and unclassified legacy records in independent registers", () => {
    const items: ActionRecord[] = [
      { id: "fmea-1", fmeaId: "fmea-assessment", projectId: "project-1", status: "OPEN", priority: "HIGH" },
      { id: "fmea-row-only", fmeaItemId: "row-1", projectId: "project-1", status: "OPEN", priority: "HIGH" },
      { id: "rula-1", rulaId: "rula-assessment", projectId: "project-1", status: "OPEN", priority: "HIGH" },
      { id: "legacy", projectId: "project-1", status: "OPEN", priority: "HIGH" },
      { id: "mixed", fmeaId: "fmea-assessment", rulaId: "rula-assessment", projectId: "project-1", status: "OPEN", priority: "HIGH" },
      { id: "other", fmeaId: "other-fmea", projectId: "project-2", status: "COMPLETED", priority: "LOW" },
    ];

    expect(filterActionList(items, { type: "FMEA", projectId: "project-1", assessmentId: "fmea-assessment", assessmentItemIds: new Set(["row-1"]), status: "OPEN", priority: "HIGH" }).map((item) => item.id)).toEqual(["fmea-1", "fmea-row-only"]);
    expect(filterActionList(items, { type: "RULA", projectId: "project-1" }).map((item) => item.id)).toEqual(["rula-1"]);
    expect(filterActionList(items, { type: "UNCLASSIFIED", projectId: "project-1" }).map((item) => item.id)).toEqual(["legacy", "mixed"]);
  });

  it("maps typed registers to supported server filters and retains pagination", () => {
    expect(actionListQueryString({ type: "FMEA", projectId: "project-a", assessmentId: "fmea-a", page: 2, limit: 25 })).toBe("page=2&limit=25&type=FMEA&projectId=project-a&fmeaId=fmea-a");
    expect(actionListQueryString({ type: "RULA", projectId: "project-b", assessmentId: "rula-b" })).toBe("page=1&limit=50&type=RULA&projectId=project-b&rulaId=rula-b");
    expect(actionListQueryString({ type: "UNCLASSIFIED", page: 3, limit: 50 })).toBe("page=3&limit=50&type=UNCLASSIFIED");
  });
});
