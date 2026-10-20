export const supportStatusTransitions = {
  OPEN: ["IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["OPEN", "WAITING_USER", "RESOLVED", "CLOSED"],
  WAITING_USER: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
} as const;

export type SupportTicketStatus = keyof typeof supportStatusTransitions;

export function canTransitionSupportTicketStatus(from: SupportTicketStatus, to: SupportTicketStatus) {
  return from === to || (supportStatusTransitions[from] as readonly SupportTicketStatus[]).includes(to);
}
