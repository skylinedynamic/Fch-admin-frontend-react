import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap'
import NotificationItem from '../Notifications/NotificationItem'
import NotificationSkeleton from '../Loader/NotificationSkeleton'
import NotificationEmptyState from '../Notifications/NotificationEmptyState'
import {
  useLatestNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationStream,
  useUnreadNotificationCount,
  formatUnreadCount,
} from '../../modules/notifications'
import type { AppNotification } from '../../modules/notifications'
import { LATEST_NOTIFICATIONS_LIMIT, NOTIFICATIONS_ROUTE } from '../../config/notifications'
import '../../../assets/css/notifications.css'

/**
 * Header bell: unread badge + the latest notifications, kept live over Reverb.
 */
export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // New notifications show up in the badge and list only - no toast.
  const { connected } = useNotificationStream()
  const { data: unreadCount = 0 } = useUnreadNotificationCount({ poll: !connected })
  const { data: latest, isLoading } = useLatestNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = latest?.data ?? []

  const openNotification = (notification: AppNotification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
    setOpen(false)
    if (notification.url) {
      navigate(notification.url)
    }
  }

  return (
    <Dropdown isOpen={open} toggle={() => setOpen((value) => !value)} className="topbar-head-dropdown ms-1 header-item">
      <DropdownToggle
        tag="button"
        type="button"
        className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle position-relative material-shadow-none"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <i className="bx bx-bell fs-22" aria-hidden="true"></i>
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger"
          >
            {formatUnreadCount(unreadCount)}
          </span>
        )}
      </DropdownToggle>

      <DropdownMenu end container="body" className="notif-dropdown">
        <div className="notif-header">
          <h6 className="notif-header__title">
            Notifications
            {unreadCount > 0 && <span className="notif-pill">{`${formatUnreadCount(unreadCount)} unread`}</span>}
          </h6>
          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-link-btn"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <i className="ri-check-double-line" aria-hidden="true"></i> Mark all as read
            </button>
          )}
        </div>

        <div className="notif-list">
          {isLoading ? (
            <NotificationSkeleton rows={3} />
          ) : notifications.length === 0 ? (
            <NotificationEmptyState
              icon="ri-notification-off-line"
              title="No notifications yet"
              text="We'll let you know when something needs your attention."
            />
          ) : (
            notifications.slice(0, LATEST_NOTIFICATIONS_LIMIT).map((notification) => (
              <NotificationItem key={notification.id} notification={notification} onOpen={openNotification} />
            ))
          )}
        </div>

        <Link to={NOTIFICATIONS_ROUTE} className="notif-footer" onClick={() => setOpen(false)}>
          View all notifications <i className="ri-arrow-right-line align-middle" aria-hidden="true"></i>
        </Link>
      </DropdownMenu>
    </Dropdown>
  )
}
