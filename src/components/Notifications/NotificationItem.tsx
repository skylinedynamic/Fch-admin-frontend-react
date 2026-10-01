import type { AppNotification } from '../../modules/notifications/types'
import {
  DEFAULT_NOTIFICATION_ICON,
  DEFAULT_NOTIFICATION_VARIANT,
  NOTIFICATION_CATEGORY_VARIANTS,
} from '../../config/notifications'
import { formatRelativeTime } from '../../utils/dates'
import '../../../assets/css/notifications.css'

interface NotificationItemProps {
  notification: AppNotification
  /** compact: header dropdown (2-line clamp); full: notifications page (full text, actions). */
  variant?: 'compact' | 'full'
  onOpen: (notification: AppNotification) => void
  onMarkRead?: (notification: AppNotification) => void
  onDelete?: (notification: AppNotification) => void
  busy?: boolean
}

/** One notification - used by the header bell and the notifications page. */
export default function NotificationItem({
  notification,
  variant = 'compact',
  onOpen,
  onMarkRead,
  onDelete,
  busy = false,
}: NotificationItemProps) {
  const unread = !notification.is_read
  const colour = NOTIFICATION_CATEGORY_VARIANTS[notification.category ?? ''] ?? DEFAULT_NOTIFICATION_VARIANT
  const created = notification.created_at ? new Date(notification.created_at) : null
  const hasActions = (unread && !!onMarkRead) || !!onDelete

  const className = [
    'notif-item',
    unread ? 'notif-item--unread' : '',
    variant === 'full' ? 'notif-item--full' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={className} data-notification-id={notification.id}>
      <button type="button" className="notif-item__main" onClick={() => onOpen(notification)}>
        <span className={`notif-item__icon bg-${colour}-subtle text-${colour}`}>
          <i className={notification.icon || DEFAULT_NOTIFICATION_ICON} aria-hidden="true"></i>
        </span>
        <span className="notif-item__content">
          <span className="notif-item__title">{notification.title}</span>
          {notification.body && <span className="notif-item__body">{notification.body}</span>}
          <span className="notif-item__meta">
            <time
              dateTime={notification.created_at ?? undefined}
              title={created && !Number.isNaN(created.getTime()) ? created.toLocaleString() : undefined}
            >
              <i className="ri-time-line me-1" aria-hidden="true"></i>
              {formatRelativeTime(notification.created_at)}
            </time>
            {variant === 'full' && notification.category && (
              <span className="notif-item__chip">{notification.category}</span>
            )}
          </span>
        </span>
      </button>

      {unread && (
        <span className="notif-item__dot" title="Unread">
          <span className="visually-hidden">Unread</span>
        </span>
      )}

      {hasActions && (
        <div className="notif-item__actions">
          {unread && onMarkRead && (
            <button
              type="button"
              className="notif-icon-btn"
              aria-label="Mark as read"
              title="Mark as read"
              onClick={() => onMarkRead(notification)}
              disabled={busy}
            >
              <i className="ri-check-line" aria-hidden="true"></i>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="notif-icon-btn notif-icon-btn--danger"
              aria-label="Delete notification"
              title="Delete"
              onClick={() => onDelete(notification)}
              disabled={busy}
            >
              <i className="ri-delete-bin-line" aria-hidden="true"></i>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
