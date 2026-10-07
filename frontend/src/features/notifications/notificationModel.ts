export type NotificationItem = { id: string; title: string; message: string; link?: string | null; readAt?: string | null; createdAt: string };
export type NotificationSummary = { items: NotificationItem[]; unreadCount: number; total: number };
export const NOTIFICATIONS_CHANGED = "nivasafe-notifications-changed";
export function notifyNotificationsChanged() { window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)); }

/** Stored links are untrusted: only known local destinations may be navigated to. */
export function notificationLink(link?: string | null): string | null {
  if (!link) return null;
  return /^\/(?:notifications|actions|fmea|rula)$/.test(link) || /^\/(?:fmea|rula)\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\/report$/i.test(link) ? link : null;
}
