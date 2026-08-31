import { describe, expect, it } from "vitest";
import { isKnowledgeVisibleToOrganization, knowledgeTokenCount } from "./modules/knowledge.js";

describe("knowledge visibility and quota rules", () => {
  it("estimates text and file token consumption predictably", () => {
    expect(knowledgeTokenCount("1234")).toBe(1);
    expect(knowledgeTokenCount("12345")).toBe(2);
    expect(knowledgeTokenCount(1024)).toBe(1);
    expect(knowledgeTokenCount(5 * 1024 * 1024)).toBe(5120);
  });

  it("keeps global documents available to all companies by default", () => {
    const document = { isGlobal: true, visibleOrganizationIds: null };
    expect(isKnowledgeVisibleToOrganization(document, "org-a")).toBe(true);
    expect(isKnowledgeVisibleToOrganization(document, "org-b")).toBe(true);
  });

  it("supports selected company visibility and privileged management", () => {
    const document = { isGlobal: true, visibleOrganizationIds: ["org-a", "org-c"] };
    expect(isKnowledgeVisibleToOrganization(document, "org-a")).toBe(true);
    expect(isKnowledgeVisibleToOrganization(document, "org-b")).toBe(false);
    expect(isKnowledgeVisibleToOrganization(document, undefined)).toBe(false);
    expect(isKnowledgeVisibleToOrganization(document, undefined, true)).toBe(true);
  });
});
