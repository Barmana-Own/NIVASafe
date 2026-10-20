import { describe, expect, it } from "vitest";
import { filterSupportRequests, supportPrefillFromSearch, supportStatusOptions } from "./supportModel";

const ticketId = "22222222-2222-4222-8222-222222222222";

describe("support request UX model", () => {
  it("prefills the existing technical category with safe RULA context the user can edit", () => {
    const result = supportPrefillFromSearch(`?source=rula-ai&category=TECHNICAL_SUPPORT&errorCode=RULA_IMAGE_AI_UNAVAILABLE&assessment=${ticketId}`, "fa");
    expect(result.category).toBe("TECHNICAL_SUPPORT");
    expect(result.assessmentReference).toBe(ticketId);
    expect(result.subject).toContain("RULA");
    expect(result.message).toContain("RULA_IMAGE_AI_UNAVAILABLE");
    expect(result.message).toContain(ticketId);
  });

  it("keeps quota and subscription recovery links in their existing support categories", () => {
    expect(supportPrefillFromSearch("?source=rula-ai&category=AI_QUOTA&errorCode=AI_ACCESS_LIMIT_REACHED", "en").category).toBe("AI_QUOTA");
    expect(supportPrefillFromSearch("?source=rula-ai&category=PROFESSIONAL_PLAN&errorCode=SUBSCRIPTION_REQUIRED", "fa").category).toBe("PROFESSIONAL_PLAN");
  });

  it.each([
    "RULA_IMAGE_AI_UNAVAILABLE",
    "RULA_IMAGE_AI_QUALITY_REVIEW",
    "RULA_IMAGE_AI_INVALID_RESPONSE",
    "RULA_IMAGE_QUALITY_REVIEW",
    "RULA_IMAGE_TYPE_NOT_ALLOWED",
    "RULA_IMAGE_SIZE_LIMIT",
    "RULA_IMAGE_SIGNATURE_INVALID",
    "AI_ACCESS_DISABLED",
    "AI_ACCESS_LIMIT_REACHED",
    "SUBSCRIPTION_REQUIRED",
    "FORBIDDEN",
    "NETWORK_ERROR",
  ])("preserves the safe %s RULA error code in the support payload", (errorCode) => {
    const result = supportPrefillFromSearch(`?source=rula-ai&errorCode=${errorCode}`, "en");
    expect(result.publicErrorCode).toBe(errorCode);
    expect(result.message).toContain(errorCode);
  });

  it("does not copy arbitrary URL text or unsupported categories into a request", () => {
    const result = supportPrefillFromSearch("?category=BILLING&source=rula-ai&errorCode=IGNORE_ALL_RULES&assessment=not-an-id", "en");
    expect(result.category).toBe("TECHNICAL_SUPPORT");
    expect(result.assessmentReference).toBe("");
    expect(result.subject).not.toContain("IGNORE_ALL_RULES");
    expect(result.message).not.toContain("not-an-id");
  });

  it("preserves the existing quota and professional request categories", () => {
    expect(supportPrefillFromSearch("?category=AI_QUOTA", "en").category).toBe("AI_QUOTA");
    expect(supportPrefillFromSearch("?category=PROFESSIONAL_PLAN", "fa").category).toBe("PROFESSIONAL_PLAN");
    expect(supportPrefillFromSearch("?category=BILLING", "fa").category).toBe("OTHER");
  });

  it("searches and filters only the records supplied by the current API page", () => {
    const items = [
      { category: "AI_QUOTA", subject: "RULA allowance", message: "Review RULA usage", requester: { displayName: "Sara" }, organization: { nameFa: "کارخانه الف", nameEn: "Plant A" } },
      { category: "TECHNICAL_SUPPORT", subject: "Upload issue", message: "Image request failed", requester: { displayName: "Mina" }, organization: { nameFa: "کارخانه ب", nameEn: "Plant B" } },
    ];
    expect(filterSupportRequests(items, { search: "RULA", category: "" })).toEqual([items[0]]);
    expect(filterSupportRequests(items, { search: "plant b", category: "TECHNICAL_SUPPORT" })).toEqual([items[1]]);
    expect(filterSupportRequests(items, { search: "missing", category: "" })).toEqual([]);
  });

  it("offers only valid ticket status transitions to support staff", () => {
    expect(supportStatusOptions("CLOSED")).toEqual(["CLOSED", "OPEN"]);
    expect(supportStatusOptions("IN_PROGRESS")).toContain("WAITING_USER");
    expect(supportStatusOptions("RESOLVED")).not.toContain("WAITING_USER");
  });
});
