import { apiClient } from '../../lib/http/apiClient'
import type {
  DeleteNotificationResponse,
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  NotificationListParams,
  NotificationListResponse,
} from './types'

const BASE = '/common/notifications'

export const getNotifications = async (params: NotificationListParams = {}): Promise<NotificationListResponse> => {
  const { status, ...rest } = params
  const response = await apiClient.get(BASE, {
    params: status && status !== 'all' ? { ...rest, status } : rest,
  })
  return { data: response.data.data, meta: response.data.meta }
}

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await apiClient.get(`${BASE}/unread-count`)
  return response.data.data.unread_count
}

export const markNotificationRead = async (id: string): Promise<MarkNotificationReadResponse> => {
  const response = await apiClient.post(`${BASE}/${id}/read`)
  return response.data.data
}

export const markAllNotificationsRead = async (): Promise<MarkAllNotificationsReadResponse> => {
  const response = await apiClient.post(`${BASE}/read-all`)
  return response.data.data
}

export const deleteNotification = async (id: string): Promise<DeleteNotificationResponse> => {
  const response = await apiClient.delete(`${BASE}/${id}`)
  return response.data.data
}
