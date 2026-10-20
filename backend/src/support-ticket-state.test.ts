import { describe, expect, it } from "vitest";
import { canTransitionSupportTicketStatus } from "./support-ticket-state.js";

describe("support ticket lifecycle", () => {
  it("allows active support work to move through waiting, resolution and closure", () => {
    expect(canTransitionSupportTicketStatus("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canTransitionSupportTicketStatus("IN_PROGRESS", "WAITING_USER")).toBe(true);
    expect(canTransitionSupportTicketStatus("WAITING_USER", "RESOLVED")).toBe(true);
    expect(canTransitionSupportTicketStatus("RESOLVED", "CLOSED")).toBe(true);
    expect(canTransitionSupportTicketStatus("CLOSED", "OPEN")).toBe(true);
  });

  it("rejects invalid lifecycle jumps and allows a no-op status update", () => {
    expect(canTransitionSupportTicketStatus("CLOSED", "IN_PROGRESS")).toBe(false);
    expect(canTransitionSupportTicketStatus("RESOLVED", "WAITING_USER")).toBe(false);
    expect(canTransitionSupportTicketStatus("OPEN", "OPEN")).toBe(true);
  });
});
