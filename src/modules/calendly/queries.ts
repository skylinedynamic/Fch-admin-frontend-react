import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { fetchCalendlyAvailableTimes, fetchCalendlyEventTypes, fetchCalendlyStatus } from './services'
import type { CalendlyAvailableTimesPayload } from './types'

export const useCalendlyStatus = () =>
  useQuery({
    queryKey: queryKeys.calendly.status(),
    queryFn: fetchCalendlyStatus,
  })

export const useCalendlyEventTypes = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.calendly.eventTypes(),
    queryFn: fetchCalendlyEventTypes,
    enabled,
  })

/** Open slots - asked for only once an event type and a day are chosen. */
export const useCalendlyAvailableTimes = (payload: CalendlyAvailableTimesPayload | null) =>
  useQuery({
    queryKey: queryKeys.calendly.availableTimes(payload ?? {}),
    queryFn: () => fetchCalendlyAvailableTimes(payload!),
    enabled: Boolean(payload?.event_type_uri && payload?.date),
    // A refusal (connection expired, bad day) will not change by asking again.
    retry: false,
  })
