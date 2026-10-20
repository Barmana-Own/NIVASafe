import { describe, expect, it } from "vitest";
import { getActiveNavigationTrail, getNavigationForRole } from "./navigation";

function findNode(nodes: readonly { id: string; children?: readonly never[] | readonly any[] }[], id: string): any {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = node.children ? findNode(node.children, id) : undefined;
    if (nested) return nested;
  }
  return undefined;
}

describe("dashboard navigation", () => {
  it("names support for the account's global role without granting organization administrators an inbox", () => {
    expect(findNode(getNavigationForRole("SUPER_ADMIN", "SUPER_ADMIN"), "support").labelKey).toBe("nav.supportInbox");
    expect(findNode(getNavigationForRole("ORG_ADMIN", "USER"), "support").labelKey).toBe("nav.support");
    expect(findNode(getNavigationForRole("SUPER_ADMIN", "USER"), "support").labelKey).toBe("nav.support");
    expect(getActiveNavigationTrail({ pathname: "/support", search: "" }, "SUPER_ADMIN", "SUPER_ADMIN").at(-1)?.labelKey).toBe("nav.supportInbox");
  });
  it("keeps the existing FMEA and RULA new and saved views distinct", () => {
    expect(getActiveNavigationTrail({ pathname: "/fmea", search: "" }).map((item) => item.id)).toEqual([
      "assessments", "assessments-create", "fmea-new",
    ]);
    expect(getActiveNavigationTrail({ pathname: "/fmea", search: "?view=registered" }).map((item) => item.id)).toEqual([
      "assessments", "assessments-saved", "fmea-saved",
    ]);
    expect(getActiveNavigationTrail({ pathname: "/rula", search: "?view=results" }).map((item) => item.id)).toEqual([
      "assessments", "assessments-saved", "rula-saved",
    ]);
  });

  it("keeps report deep links under the matching saved assessment destination", () => {
    expect(getActiveNavigationTrail({ pathname: "/fmea/11111111-1111-4111-8111-111111111111/report", search: "" }).map((item) => item.id)).toEqual([
      "assessments", "assessments-saved", "fmea-saved",
    ]);
    expect(getActiveNavigationTrail({ pathname: "/rula/22222222-2222-4222-8222-222222222222/report", search: "" }).map((item) => item.id)).toEqual([
      "assessments", "assessments-saved", "rula-saved",
    ]);
  });

  it("preserves the legacy assessment chooser breadcrumb without adding another sidebar destination", () => {
    const trail = getActiveNavigationTrail({ pathname: "/choose-path", search: "" });
    expect(trail.map((item) => item.id)).toEqual(["assessments", "assessments-create", "legacy-assessment-chooser"]);
    expect(getActiveNavigationTrail({ pathname: "/chemical-risk", search: "" })).toEqual([]);
  });

  it("preserves current member and administrator visibility by role", () => {
    const managerTree = getNavigationForRole("HSE_MANAGER");
    expect(findNode(managerTree, "members")?.kind).toBe("link");
    expect(findNode(managerTree, "admin")).toBeUndefined();
    expect(findNode(managerTree, "organizations")).toBeUndefined();
    expect(findNode(managerTree, "system-health")).toBeUndefined();

    const administratorTree = getNavigationForRole("ORG_ADMIN");
    expect(findNode(administratorTree, "members")?.kind).toBe("link");
    expect(findNode(administratorTree, "admin")?.kind).toBe("link");
    expect(findNode(administratorTree, "organizations")?.kind).toBe("link");
    expect(findNode(administratorTree, "system-health")?.kind).toBe("link");
  });

  it("does not turn modules without backend contracts into fake navigation routes", () => {
    const tree = getNavigationForRole("HSE_MANAGER");
    const chemicalRisk = findNode(tree, "chemical-risk-new");
    const permits = findNode(tree, "work-permits");
    expect(chemicalRisk).toMatchObject({ kind: "pending", statusKey: "navigation.backendPending" });
    expect(permits).toMatchObject({ kind: "pending", statusKey: "navigation.backendPending" });
    expect(chemicalRisk).not.toHaveProperty("path");
    expect(permits).not.toHaveProperty("path");
  });

  it("enables only the newly API-backed checklist and incident modules as real routes", () => {
    const tree = getNavigationForRole("HSE_MANAGER");
    expect(findNode(tree, "checklists")).toMatchObject({ kind: "link", path: "/checklists" });
    expect(findNode(tree, "incident-management")).toMatchObject({ kind: "link", path: "/incidents" });
    expect(findNode(tree, "checklists")).not.toHaveProperty("pendingStatusKey");
    expect(findNode(tree, "incident-management")).not.toHaveProperty("pendingStatusKey");
  });
});
