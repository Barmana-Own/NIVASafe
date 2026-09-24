import { ActionStatus } from "@prisma/client";

/**
 * Status is the workflow source of truth for corrective-action completion.
 * Keeping the mapping on the API prevents clients from showing different
 * progress values for the same status.
 */
export const actionProgressByStatus: Record<ActionStatus, number> = {
  [ActionStatus.OPEN]: 0,
  [ActionStatus.ASSIGNED]: 25,
  [ActionStatus.IN_PROGRESS]: 50,
  [ActionStatus.WAITING_FOR_REVIEW]: 75,
  [ActionStatus.COMPLETED]: 100,
  [ActionStatus.REJECTED]: 0,
  [ActionStatus.OVERDUE]: 50,
  [ActionStatus.CANCELLED]: 0,
};

export function progressForActionStatus(status: ActionStatus) {
  return actionProgressByStatus[status];
}
