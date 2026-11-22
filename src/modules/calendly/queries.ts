import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import type { AttendeeInput } from '../appointment/types'
import {
  addAppointmentToCalendly,
  connectCalendly,
  disconnectCalendly,
  fetchCalendlyAvailableTimes,
  fetchCalendlyBookingOptions,
  fetchCalendlyConnection,
  fetchCalendlySettings,
  saveCalendlySettings,
  syncCalendly,
} from './services'
import type { AddToCalendlyPayload, CalendlyAvailableTimesPayload, CalendlySyncDates, SaveCalendlySettingsPayload } from './types'

export const useCalendlyConnection = () =>
  useQuery({
    queryKey: queryKeys.calendly.connection(),
    queryFn: fetchCalendlyConnection,
  })

export const useConnectCalendly = () =>
  useMutation({ mutationFn: connectCalendly })

export const useDisconnectCalendly = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: disconnectCalendly,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.calendly.all }),
  })
}

export const useSyncCalendly = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dates: CalendlySyncDates) => syncCalendly(dates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.calendly.connection() })
      qc.invalidateQueries({ queryKey: queryKeys.appointment.list() })
    },
  })
}

/** Asked once someone is picked; the people (by id or email) are the key. */
export const useCalendlyBookingOptions = (attendees: AttendeeInput[], enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.calendly.bookingOptions(attendees),
    queryFn: () => fetchCalendlyBookingOptions(attendees),
    enabled: enabled && attendees.length > 0,
    retry: false,
  })

/** Open times, asked once an event type and a day are chosen. */
export const useCalendlyAvailableTimes = (payload: CalendlyAvailableTimesPayload | null) =>
  useQuery({
    queryKey: queryKeys.calendly.availableTimes(payload ?? {}),
    queryFn: () => fetchCalendlyAvailableTimes(payload as CalendlyAvailableTimesPayload),
    enabled: Boolean(payload?.event_type_uri && payload?.date && payload.attendees.length),
    // A refusal (expired sign-in, a day Calendly will not book) does not change by asking again.
    retry: false,
  })

export const useAddToCalendly = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: AddToCalendlyPayload }) => addAppointmentToCalendly(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.appointment.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.appointment.list() })
    },
  })
}

export const useCalendlySettings = () =>
  useQuery({
    queryKey: queryKeys.calendly.settings(),
    queryFn: fetchCalendlySettings,
  })

export const useSaveCalendlySettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveCalendlySettingsPayload) => saveCalendlySettings(payload),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.calendly.settings(), data)
      qc.invalidateQueries({ queryKey: queryKeys.calendly.connection() })
    },
  })
}
