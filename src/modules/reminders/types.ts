import type { Reminder } from '../../config/reminders'

/** Filters for the reminders list - sent as the POST body, unset ones left out. */
export type ReminderListFilters = {
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc' | string
  search?: string | null
  reference_type?: string | null
  /** A status, or "dismissable" for every pending or sent reminder. */
  status?: string | null
  /** Y-m-d */
  start_date?: string
  /** Y-m-d */
  end_date?: string
}

export type ReminderListResult = {
  data: Reminder[]
  total: number
}

/** Snooze (`minutes`) or reschedule (`reschedule_at` + `lead_minutes`), with an optional note. */
export type SnoozeReminderPayload = {
  minutes?: number
  /** Y-m-d H:i:s in the viewer's timezone */
  reschedule_at?: string
  lead_minutes?: number
  note?: string | null
}
