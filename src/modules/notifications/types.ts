/** One in-app notification, as the API lists it and Reverb pushes it. */
export interface AppNotification {
  id: string
  /** Type key, e.g. "borrower.funding_request.status_changed". */
  type: string
  title: string
  body: string
  /** In-portal path to open, or null when there is nothing to open. */
  url: string | null
  /** Remix icon class, e.g. "ri-hand-coin-line". */
  icon: string | null
  category: string | null
  is_read: boolean
  read_at: string | null
  created_at: string | null
}

export type NotificationStatusFilter = 'all' | 'unread' | 'read'

export interface NotificationListParams {
  page?: number
  per_page?: number
  status?: NotificationStatusFilter
}

export interface NotificationListMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  unread_count: number
}

export interface NotificationListResponse {
  data: AppNotification[]
  meta: NotificationListMeta
}

export interface MarkNotificationReadResponse {
  notification: AppNotification
  unread_count: number
}

export interface MarkAllNotificationsReadResponse {
  updated: number
  unread_count: number
}

export interface DeleteNotificationResponse {
  unread_count: number
}

/** Reverb payload of Laravel's BroadcastNotificationCreated for DynamicNotification. */
export interface NotificationBroadcast {
  id: string
  type: string
  title: string
  body: string
  url: string | null
  icon: string | null
  category: string | null
  read_at: string | null
  created_at: string | null
}

/** Reverb payload of the backend's `notification.read` event (another tab read/removed some). */
export interface NotificationsReadBroadcast {
  /** Ids that changed, or null for "all of them". */
  ids: string[] | null
  unread_count: number
}
