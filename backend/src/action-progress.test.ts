import { ActionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { progressForActionStatus } from "./action-progress.js";

describe("corrective-action status progress", () => {
  it("maps each workflow status to a stable completion percentage", () => {
    expect(progressForActionStatus(ActionStatus.OPEN)).toBe(0);
    expect(progressForActionStatus(ActionStatus.ASSIGNED)).toBe(25);
    expect(progressForActionStatus(ActionStatus.IN_PROGRESS)).toBe(50);
    expect(progressForActionStatus(ActionStatus.WAITING_FOR_REVIEW)).toBe(75);
    expect(progressForActionStatus(ActionStatus.COMPLETED)).toBe(100);
    expect(progressForActionStatus(ActionStatus.REJECTED)).toBe(0);
    expect(progressForActionStatus(ActionStatus.OVERDUE)).toBe(50);
    expect(progressForActionStatus(ActionStatus.CANCELLED)).toBe(0);
  });
});
