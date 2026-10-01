import '../../../assets/css/notifications.css'

interface NotificationEmptyStateProps {
  icon: string
  title: string
  text: string
}

export default function NotificationEmptyState({ icon, title, text }: NotificationEmptyStateProps) {
  return (
    <div className="notif-empty">
      <div className="notif-empty__icon">
        <i className={icon} aria-hidden="true"></i>
      </div>
      <p className="notif-empty__title">{title}</p>
      <p className="notif-empty__text">{text}</p>
    </div>
  )
}
