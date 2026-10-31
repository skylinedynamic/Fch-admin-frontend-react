import { apiClient } from '../../lib/http/apiClient'
import type { Reminder } from '../../config/reminders'
import type { ReminderListFilters, ReminderListResult, SnoozeReminderPayload } from './types'

/** The signed-in user's reminders, one page at a time. */
export const fetchReminders = async (filters: ReminderListFilters): Promise<ReminderListResult> => {
  const body = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

  const { data } = await apiClient.post('/common/reminders/fetch-reminders', body)
  const reminders = data?.data?.reminders ?? {}

  return {
    data: reminders.data ?? [],
    total: reminders.meta?.total ?? reminders.total ?? 0,
  }
}

/** The signed-in user's reminders that are due now - the popup's one request on page load. */
export const fetchDueReminders = async (): Promise<Reminder[]> => {
  const { data } = await apiClient.get('/common/reminders/due')
  return data?.data?.reminders ?? []
}

export const dismissReminder = async (id: number | string) => {
  const { data } = await apiClient.post(`/common/reminders/${id}/dismiss`)
  return data
}

/** Every pending or sent reminder of the signed-in user. */
export const dismissAllReminders = async () => {
  const { data } = await apiClient.post('/common/reminders/dismiss-all')
  return data
}

export const bulkDismissReminders = async (ids: Array<number | string>) => {
  const { data } = await apiClient.post('/common/reminders/bulk-dismiss', { ids })
  return data
}

/**
 * Snooze by `minutes`, or reschedule to `reschedule_at` alerting `lead_minutes`
 * before it. Rescheduling an assigned Task (its creator only) moves the task
 * for its assignee too.
 */
export const snoozeReminder = async (id: number | string, payload: SnoozeReminderPayload) => {
  const { data } = await apiClient.post(`/common/reminders/${id}/snooze`, payload)
  return data
}
