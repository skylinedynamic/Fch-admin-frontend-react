import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query/queryKeys'
import type {
  AppNotification,
  NotificationBroadcast,
  NotificationListParams,
  NotificationListResponse,
} from './types'

/**
 * Keeps the cached bell/list data in step with real-time events and
 * mutations, so the UI updates without refetching. The server stays the
 * source of truth: anything that can't be patched exactly is invalidated.
 */

type ListEntry = [QueryKey, NotificationListResponse | undefined]

const listEntries = (queryClient: QueryClient): ListEntry[] =>
  queryClient.getQueriesData<NotificationListResponse>({ queryKey: queryKeys.notifications.lists() })

const paramsOf = (key: QueryKey): NotificationListParams => (key[2] as NotificationListParams | undefined) ?? {}

export const fromBroadcast = (payload: NotificationBroadcast): AppNotification => ({
  id: payload.id,
  type: payload.type,
  title: payload.title,
  body: payload.body,
  url: payload.url,
  icon: payload.icon,
  category: payload.category,
  is_read: false,
  read_at: null,
  created_at: payload.created_at,
})

/** A notification just arrived over the socket. */
export function addIncomingNotification(queryClient: QueryClient, notification: AppNotification): void {
  const entries = listEntries(queryClient)

  if (entries.some(([, data]) => data?.data.some((n) => n.id === notification.id))) {
    return
  }

  queryClient.setQueryData<number>(queryKeys.notifications.unreadCount(), (count) =>
    typeof count === 'number' ? count + 1 : count
  )

  for (const [key, data] of entries) {
    if (!data) continue

    const { page = 1, status = 'all' } = paramsOf(key)
    const meta = { ...data.meta, unread_count: data.meta.unread_count + 1 }

    if (page === 1 && status !== 'read') {
      queryClient.setQueryData<NotificationListResponse>(key, {
        data: [notification, ...data.data].slice(0, data.meta.per_page),
        meta: { ...meta, total: data.meta.total + 1 },
      })
    } else {
      // Later pages shift by one; refresh them next time they're shown.
      queryClient.setQueryData<NotificationListResponse>(key, { ...data, meta })
      queryClient.invalidateQueries({ queryKey: key, exact: true, refetchType: 'none' })
    }
  }
}

/** Some (ids) or all (null) notifications were read - here or in another tab. */
export function applyNotificationsRead(queryClient: QueryClient, ids: string[] | null, unreadCount: number): void {
  const now = new Date().toISOString()
  const affects = (n: AppNotification) => ids === null || ids.includes(n.id)

  queryClient.setQueryData<number>(queryKeys.notifications.unreadCount(), unreadCount)

  for (const [key, data] of listEntries(queryClient)) {
    if (!data) continue

    const meta = { ...data.meta, unread_count: unreadCount }

    if (paramsOf(key).status === 'unread') {
      const remaining = data.data.filter((n) => !affects(n))
      queryClient.setQueryData<NotificationListResponse>(key, {
        data: remaining,
        meta: { ...meta, total: Math.max(0, data.meta.total - (data.data.length - remaining.length)) },
      })
      continue
    }

    queryClient.setQueryData<NotificationListResponse>(key, {
      data: data.data.map((n) => (affects(n) && !n.is_read ? { ...n, is_read: true, read_at: now } : n)),
      meta,
    })
  }
}

/** A notification was deleted: drop it now, then refetch the lists (pages shift). */
export function applyNotificationRemoved(queryClient: QueryClient, id: string, unreadCount: number): void {
  queryClient.setQueryData<number>(queryKeys.notifications.unreadCount(), unreadCount)

  for (const [key, data] of listEntries(queryClient)) {
    if (!data) continue
    queryClient.setQueryData<NotificationListResponse>(key, {
      data: data.data.filter((n) => n.id !== id),
      meta: { ...data.meta, unread_count: unreadCount },
    })
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() })
}
