import type { NotificationStatusFilter } from '../modules/notifications/types'

/** How many notifications the header bell shows. */
export const LATEST_NOTIFICATIONS_LIMIT = 5

/** Page size on the notifications page. */
export const NOTIFICATIONS_PAGE_SIZE = 15

/**
 * The unread count is pushed over Reverb; this poll only runs while the
 * socket is down (or Reverb isn't configured) so the badge still catches up.
 */
export const NOTIFICATION_FALLBACK_POLL_MS = 3 * 60 * 1000

export const DEFAULT_NOTIFICATION_ICON = 'ri-notification-3-line'

export const NOTIFICATIONS_ROUTE = '/notifications'

/**
 * Colour of a notification's icon, by the category the backend sends
 * (config/notifications.php in fch-api). A Velzon/Bootstrap contextual name.
 */
export const NOTIFICATION_CATEGORY_VARIANTS: Record<string, string> = {
  funding: 'success',
  document: 'warning',
  payment: 'info',
  reminder: 'danger',
  system: 'primary',
}
export const DEFAULT_NOTIFICATION_VARIANT = 'primary'

export interface NotificationStatusFilterOption {
  value: NotificationStatusFilter
  label: string
  empty: { icon: string; title: string; text: string }
}

export const NOTIFICATION_STATUS_FILTERS: NotificationStatusFilterOption[] = [
  {
    value: 'all',
    label: 'All',
    empty: {
      icon: 'ri-notification-off-line',
      title: 'No notifications yet',
      text: 'When something needs your attention, it will show up here.',
    },
  },
  {
    value: 'unread',
    label: 'Unread',
    empty: {
      icon: 'ri-checkbox-circle-line',
      title: "You're all caught up",
      text: 'You have no unread notifications.',
    },
  },
  {
    value: 'read',
    label: 'Read',
    empty: {
      icon: 'ri-inbox-line',
      title: 'No read notifications',
      text: "Notifications you've opened will appear here.",
    },
  },
]
