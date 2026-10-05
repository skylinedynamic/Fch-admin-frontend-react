import { apiClient } from '../../lib/http/apiClient'
import type { ReminderListFilters, ReminderListResult } from './types'

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
