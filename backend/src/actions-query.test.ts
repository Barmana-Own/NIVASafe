import { describe, expect, it } from "vitest";
import { actionListQuerySchema, buildActionWhere, assertCorrectiveActionLinks } from "./modules/actions.js";

describe("typed corrective action query", () => {
  it("accepts a RULA assessment filter and rejects contradictory typed filters", () => {
    expect(actionListQuerySchema.parse({ type: "RULA", rulaId: "00000000-0000-4000-8000-000000000002" }).type).toBe("RULA");
    expect(() => actionListQuerySchema.parse({ type: "FMEA", rulaId: "00000000-0000-4000-8000-000000000002" })).toThrow();
    expect(() => actionListQuerySchema.parse({ type: "RULA", fmeaId: "00000000-0000-4000-8000-000000000001" })).toThrow();
  });

  it("scopes typed filters, assessment item links, and organization together", () => {
    const where = buildActionWhere("org-a", { type: "FMEA", fmeaId: "assessment-a", status: "OPEN", projectId: "project-a" }, { search: "lift" });
    expect(where).toMatchObject({ AND: expect.arrayContaining([
      { organizationId: "org-a" }, { projectId: "project-a" }, { status: "OPEN" },
      { rulaId: null, OR: [
        { fmeaId: "assessment-a", OR: [{ fmeaItemId: null }, { fmeaItem: { assessmentId: "assessment-a" } }] },
        { fmeaId: null, fmeaItem: { assessmentId: "assessment-a" } },
      ] },
      { OR: [{ title: { contains: "lift" } }, { description: { contains: "lift" } }] },
    ]) });
  });

  it("returns legacy project-only records only in the explicit unclassified filter", () => {
    const where = buildActionWhere("org-a", { type: "UNCLASSIFIED" }, {});
    expect(where).toMatchObject({ AND: expect.arrayContaining([{ organizationId: "org-a" }]) });
    expect(JSON.stringify(where)).toContain('"fmeaId":null');
    expect(JSON.stringify(where)).toContain('"fmeaItemId":null');
    expect(JSON.stringify(where)).toContain('"rulaId":null');
  });
});

describe("corrective-action typed links", () => {
  const valid = { projectId: "project", fmeaId: null, fmeaItemId: null, rulaId: null, bodySide: null, rulaImpact: null };
  it("accepts project-only legacy actions and a single typed context", () => {
    expect(() => assertCorrectiveActionLinks(valid)).not.toThrow();
    expect(() => assertCorrectiveActionLinks({ ...valid, fmeaId: "fmea", fmeaItemId: "item" })).not.toThrow();
    expect(() => assertCorrectiveActionLinks({ ...valid, rulaId: "rula", bodySide: "RIGHT" })).not.toThrow();
  });
  it.each([
    { ...valid, fmeaItemId: "item" },
    { ...valid, fmeaId: "fmea", rulaId: "rula", bodySide: "RIGHT" },
    { ...valid, bodySide: "LEFT" },
    { ...valid, rulaId: "rula" },
    { ...valid, rulaImpact: { scoreReduction: 1 } },
  ])("rejects orphaned or mixed action context", (links) => {
    expect(() => assertCorrectiveActionLinks(links as never)).toThrow();
  });
});
