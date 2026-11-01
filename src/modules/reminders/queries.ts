import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bulkDismissReminders,
  dismissAllReminders,
  dismissReminder,
  fetchDueReminders,
  fetchReminders,
  snoozeReminder,
} from './services'
import type { ReminderListFilters, SnoozeReminderPayload } from './types'
import { REMINDER_STATUS_DISMISSABLE } from '../../config/reminders'
import { activityLogKeys } from '../activity-log/queries'

export const reminderKeys = {
  all: ['reminders'] as const,
  /** Due now, per signed-in session (a new token asks again). */
  due: (token: string | null | undefined) => [...reminderKeys.all, 'due', token ?? 'none'] as const,
  /** Every page of the reminders list (refreshed after a dismiss, snooze or reschedule). */
  lists: () => [...reminderKeys.all, 'list'] as const,
  list: (filters: ReminderListFilters) => [...reminderKeys.lists(), filters] as const,
  dismissable: () => [...reminderKeys.lists(), 'dismissable'] as const,
}

/** One page of the reminders list. The previous page stays on screen while the next loads. */
export const useReminderList = (filters: ReminderListFilters) =>
  useQuery({
    queryKey: reminderKeys.list(filters),
    queryFn: () => fetchReminders(filters),
    placeholderData: keepPreviousData,
  })

/** Whether the user has any pending or sent reminder at all - whatever the list's filters (for "Dismiss all"). */
export const useHasDismissableReminders = () =>
  useQuery({
    queryKey: reminderKeys.dismissable(),
    queryFn: async () => (await fetchReminders({ status: REMINDER_STATUS_DISMISSABLE, per_page: 1 })).total > 0,
  })

/** Refresh every reminders-list query once a reminder changed. */
const useRefreshLists = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: reminderKeys.lists() })
}

/**
 * The reminders due when the page loads (or on sign-in). Asked once: after
 * that every change arrives over Reverb, so it is never refetched or polled.
 */
export const useDueReminders = (token: string | null | undefined) =>
  useQuery({
    queryKey: reminderKeys.due(token),
    queryFn: fetchDueReminders,
    enabled: !!token,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })

export const useDismissReminder = () => {
  const refreshLists = useRefreshLists()
  return useMutation({ mutationFn: (id: number | string) => dismissReminder(id), onSuccess: refreshLists })
}

export const useDismissAllReminders = () => {
  const refreshLists = useRefreshLists()
  return useMutation({ mutationFn: () => dismissAllReminders(), onSuccess: refreshLists })
}

export const useBulkDismissReminders = () => {
  const refreshLists = useRefreshLists()
  return useMutation({ mutationFn: (ids: Array<number | string>) => bulkDismissReminders(ids), onSuccess: refreshLists })
}

/** Snooze or reschedule. A reschedule can move an assigned Task, so activity-log data is refreshed too. */
export const useSnoozeReminder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: SnoozeReminderPayload }) => snoozeReminder(id, payload),
    onSuccess: (_data, { payload }) => {
      queryClient.invalidateQueries({ queryKey: reminderKeys.lists() })
      if (payload.reschedule_at) queryClient.invalidateQueries({ queryKey: activityLogKeys.all })
    },
  })
}
