import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query/queryKeys'
import { LATEST_NOTIFICATIONS_LIMIT, NOTIFICATION_FALLBACK_POLL_MS } from '../../config/notifications'
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './services'
import { applyNotificationRemoved, applyNotificationsRead } from './cache'
import type { NotificationListParams } from './types'

export const LATEST_NOTIFICATIONS_PARAMS: NotificationListParams = { per_page: LATEST_NOTIFICATIONS_LIMIT }

export function useNotifications(params: NotificationListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => getNotifications(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** The newest notifications for the header bell. */
export function useLatestNotifications(enabled = true) {
  return useNotifications(LATEST_NOTIFICATIONS_PARAMS, enabled)
}

/**
 * The unread badge count. The latest-notifications response already carries
 * it (meta.unread_count), so it is read from that request - which the header
 * bell makes anyway - instead of a second call to /unread-count. When the bell
 * and the sidebar load together, fetchQuery joins the list request already in
 * flight, so a page load makes one request for both.
 *
 * @param poll Re-check periodically - set while the real-time socket is down.
 */
export function useUnreadNotificationCount({ poll = false }: { poll?: boolean } = {}) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const latest = await queryClient.fetchQuery({
        queryKey: queryKeys.notifications.list(LATEST_NOTIFICATIONS_PARAMS),
        queryFn: () => getNotifications(LATEST_NOTIFICATIONS_PARAMS),
      })
      return latest.meta.unread_count
    },
    refetchInterval: poll ? NOTIFICATION_FALLBACK_POLL_MS : false,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (result, id) => applyNotificationsRead(queryClient, [id], result.unread_count),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: (result) => applyNotificationsRead(queryClient, null, result.unread_count),
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: (result, id) => applyNotificationRemoved(queryClient, id, result.unread_count),
  })
}
