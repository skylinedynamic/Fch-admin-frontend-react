import '../../../assets/css/notifications.css'

/** Placeholder rows shaped like notification items, shown while they load. */
export default function NotificationSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading notifications">
      {Array.from({ length: rows }, (_, index) => (
        <div className="notif-skeleton" key={index} aria-hidden="true">
          <div className="skeleton-line notif-skeleton__avatar"></div>
          <div className="flex-grow-1">
            <div className="skeleton-line notif-skeleton__line w-50"></div>
            <div className="skeleton-line notif-skeleton__line w-75"></div>
            <div className="skeleton-line notif-skeleton__line w-25 mb-0"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
