import { apiClient } from '../../lib/http/apiClient'
import type { CreateAppointmentResponse } from '../appointment/types'
import type {
  CalendlyAvailableTimesPayload,
  CalendlyBookingPayload,
  CalendlyEventType,
  CalendlySettingsData,
  CalendlySettingsPayload,
  CalendlySlot,
  CalendlyStatus,
  CalendlySyncDates,
  CalendlySyncDirection,
  CalendlySyncResult,
} from './types'

/** `{ partner_id }` when the host configures another partner; nothing for your own. */
const forPartner = (partnerId?: number) => (partnerId ? { partner_id: partnerId } : {})

export const fetchCalendlyStatus = async (): Promise<CalendlyStatus> => {
  const { data } = await apiClient.get('/common/calendly/status')
  return data.data
}

/** A partner's Calendly app keys (in full) and connection - yours, or the one the host names. */
export const fetchCalendlySettings = async (partnerId?: number): Promise<CalendlySettingsData> => {
  const { data } = await apiClient.get('/common/calendly/settings', { params: forPartner(partnerId) })
  return data.data
}

export const saveCalendlySettings = async (payload: CalendlySettingsPayload): Promise<CalendlySettingsData> => {
  const { data } = await apiClient.post('/common/calendly/settings', payload)
  return data.data
}

/** Connect Calendly: the Calendly sign-in page, through the partner's own saved app keys. */
export const connectCalendly = async (partnerId?: number): Promise<string> => {
  const { data } = await apiClient.post('/common/calendly/connect', forPartner(partnerId))
  return data.data.url
}

export const disconnectCalendly = async (partnerId?: number): Promise<void> => {
  await apiClient.delete('/common/calendly/connection', { params: forPartner(partnerId) })
}

/** Brings in the partner's meetings now; returns how many. */
export const syncCalendly = async (partnerId?: number): Promise<number> => {
  const { data } = await apiClient.post('/common/calendly/sync', forPartner(partnerId))
  return data.data?.synced ?? 0
}

/**
 * Sync now, the way picked - pull (Calendly into FCH, and meetings set with
 * you into your Calendly), push (the meetings you set into Calendly - yours
 * and the other person's own) or both - for the dates the calendar shows
 * (none = this month).
 */
export const syncCalendlyDirected = async (direction: CalendlySyncDirection, dates?: CalendlySyncDates | null): Promise<CalendlySyncResult> => {
  const { data } = await apiClient.post('/common/calendly/sync', {
    direction,
    ...(dates ? { from: dates.from, to: dates.to } : {}),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  return data.data
}

export const fetchCalendlyEventTypes = async (): Promise<CalendlyEventType[]> => {
  const { data } = await apiClient.get('/common/calendly/event-types')
  return data.data ?? []
}

export const fetchCalendlyAvailableTimes = async (payload: CalendlyAvailableTimesPayload): Promise<CalendlySlot[]> => {
  const { data } = await apiClient.post('/common/calendly/available-times', payload)
  return data.data ?? []
}

export const bookCalendlyAppointment = async (payload: CalendlyBookingPayload): Promise<CreateAppointmentResponse> => {
  const { data } = await apiClient.post('/common/calendly/book', payload)
  return data
}
