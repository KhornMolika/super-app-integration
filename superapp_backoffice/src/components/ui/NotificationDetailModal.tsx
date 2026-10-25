'use client';

export {
  getNotificationTarget,
  getNotificationTypeStyle,
  formatNotificationRelativeTime,
} from '@/lib/notification-target.helper';
export type { NotificationTarget } from '@/lib/notification-target.helper';

// Deprecated: Notifications now display as dedicated page details at /notifications/[id]
export function NotificationDetailModal() {
  return null;
}
