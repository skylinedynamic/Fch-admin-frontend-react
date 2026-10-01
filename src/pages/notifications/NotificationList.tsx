import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NotificationItem from '../../components/Notifications/NotificationItem'
import NotificationSkeleton from '../../components/Loader/NotificationSkeleton'
import NotificationEmptyState from '../../components/Notifications/NotificationEmptyState'
import {
  formatUnreadCount,
  groupNotificationsByDay,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../../modules/notifications'
import type { AppNotification, NotificationStatusFilter } from '../../modules/notifications'
import { NOTIFICATION_STATUS_FILTERS, NOTIFICATIONS_PAGE_SIZE } from '../../config/notifications'
import '../../../assets/css/notifications.css'

/** Every notification for the signed-in user, grouped by day, with filters and paging. */
export default function NotificationList() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<NotificationStatusFilter>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, isPlaceholderData } = useNotifications({ page, per_page: NOTIFICATIONS_PAGE_SIZE, status })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const remove = useDeleteNotification()

  const notifications = data?.data ?? []
  const meta = data?.meta
  const unreadCount = meta?.unread_count ?? 0
  const lastPage = meta?.last_page ?? 1
  const activeFilter = NOTIFICATION_STATUS_FILTERS.find((filter) => filter.value === status) ?? NOTIFICATION_STATUS_FILTERS[0]
  const groups = groupNotificationsByDay(notifications)

  const from = meta && meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0
  const to = meta ? Math.min(meta.current_page * meta.per_page, meta.total) : 0

  const changeStatus = (next: NotificationStatusFilter) => {
    setStatus(next)
    setPage(1)
  }

  const openNotification = (notification: AppNotification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
    if (notification.url) {
      navigate(notification.url)
    }
  }

  const isBusy = (notification: AppNotification) =>
    (markRead.isPending && markRead.variables === notification.id) ||
    (remove.isPending && remove.variables === notification.id)

  return (
    <div className="page-content notifications-page">
      <div className="container-fluid">
        <div className="row pb-1 page-subheader-sticky bg-body">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between flex-row flex-wrap gap-2 py-2">
              <div className="flex-grow-1">
                <h4 className="fs-20 mb-1">Notifications</h4>
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb m-0 fs-12 text-muted">
                    <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                    <li className="breadcrumb-item active text-primary font-weight-bold" aria-current="page">Notifications</li>
                  </ol>
                </nav>
              </div>
              <button
                type="button"
                className="btn btn-soft-primary btn-sm"
                onClick={() => markAllRead.mutate()}
                disabled={unreadCount === 0 || markAllRead.isPending}
              >
                <i className="ri-check-double-line me-1" aria-hidden="true"></i> Mark all as read
              </button>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="card notif-page-card">
              <ul className="notif-tabs" role="tablist">
                {NOTIFICATION_STATUS_FILTERS.map((filter) => (
                  <li key={filter.value} role="presentation">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={status === filter.value}
                      className={`notif-tab ${status === filter.value ? 'is-active' : ''}`}
                      onClick={() => changeStatus(filter.value)}
                    >
                      {filter.label}
                      {filter.value === 'unread' && unreadCount > 0 && (
                        <span className="notif-pill">{formatUnreadCount(unreadCount)}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              <div className={isFetching && isPlaceholderData ? 'notif-list-busy' : undefined} aria-busy={isFetching}>
                {isLoading ? (
                  <NotificationSkeleton rows={5} />
                ) : notifications.length === 0 ? (
                  <NotificationEmptyState {...activeFilter.empty} />
                ) : (
                  groups.map((group) => (
                    <section key={group.key} aria-label={group.label}>
                      <h6 className="notif-group__label">{group.label}</h6>
                      {group.items.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          variant="full"
                          notification={notification}
                          onOpen={openNotification}
                          onMarkRead={(n) => markRead.mutate(n.id)}
                          onDelete={(n) => remove.mutate(n.id)}
                          busy={isBusy(notification)}
                        />
                      ))}
                    </section>
                  ))
                )}
              </div>

              {meta && meta.total > 0 && (
                <div className="notif-pager">
                  <span>
                    Showing {from}–{to} of {meta.total}
                  </span>
                  {lastPage > 1 && (
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-light btn-sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        <i className="ri-arrow-left-s-line align-middle" aria-hidden="true"></i> Previous
                      </button>
                      <button
                        type="button"
                        className="btn btn-light btn-sm"
                        onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                        disabled={page >= lastPage}
                      >
                        Next <i className="ri-arrow-right-s-line align-middle" aria-hidden="true"></i>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
