import { apiClient } from '../../lib/http/apiClient'
import type { Appointment, AttendeeInput } from '../appointment/types'
import type {
  AddToCalendlyPayload,
  CalendlyAvailableTimesPayload,
  CalendlyBookingOptions,
  CalendlyConnectionStatus,
  CalendlySettings,
  SaveCalendlySettingsPayload,
  CalendlySlot,
  CalendlySyncDates,
  CalendlySyncResult,
} from './types'

/** The signed-in user's own Calendly. */
export const fetchCalendlyConnection = async (): Promise<CalendlyConnectionStatus> => {
  const { data } = await apiClient.get('/common/calendly/connection')
  return data.data
}

/** The Calendly sign-in link for their own account. */
export const connectCalendly = async (): Promise<string> => {
  const { data } = await apiClient.post('/common/calendly/connection')
  return data.data.url
}

/** Ends their connection; meetings already in FCH stay. */
export const disconnectCalendly = async (): Promise<void> => {
  await apiClient.delete('/common/calendly/connection')
}

/** Sync now: brings their Calendly meetings in the dates into FCH. */
export const syncCalendly = async (dates: CalendlySyncDates): Promise<CalendlySyncResult> => {
  const { data } = await apiClient.post('/common/calendly/sync', {
    ...dates,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  return data.data
}

/** Whose Calendly a booking with these people would go into, and its event types. */
export const fetchCalendlyBookingOptions = async (attendees: AttendeeInput[]): Promise<CalendlyBookingOptions> => {
  const { data } = await apiClient.post('/common/calendly/booking-options', { attendees })
  return data.data
}

export const fetchCalendlyAvailableTimes = async (payload: CalendlyAvailableTimesPayload): Promise<CalendlySlot[]> => {
  const { data } = await apiClient.post('/common/calendly/available-times', payload)
  return data.data ?? []
}

/** "Add to Calendly": books an existing appointment in Calendly. */
export const addAppointmentToCalendly = async (id: number | string, payload: AddToCalendlyPayload): Promise<Appointment> => {
  const { data } = await apiClient.post(`/common/appointments/${id}/calendly`, payload)
  return data.data
}

/** Settings > Calendly Configuration (host only). */
export const fetchCalendlySettings = async (): Promise<CalendlySettings> => {
  const { data } = await apiClient.get('/common/calendly/settings')
  return data.data
}

export const saveCalendlySettings = async (payload: SaveCalendlySettingsPayload): Promise<CalendlySettings> => {
  const { data } = await apiClient.put('/common/calendly/settings', payload)
  return data.data
}
