import { apiClient } from '../../lib/http/apiClient'
import type { CreateAppointmentResponse } from '../appointment/types'
import type {
  CalendlyAvailableTimesPayload,
  CalendlyBookingPayload,
  CalendlyConnectPayload,
  CalendlyEventType,
  CalendlySlot,
  CalendlyStatus,
} from './types'

export const fetchCalendlyStatus = async (): Promise<CalendlyStatus> => {
  const { data } = await apiClient.get('/common/calendly/status')
  return data.data
}

/**
 * The Connect popup: saves your own Calendly OAuth app keys (a blank secret
 * keeps the stored one) and returns the Calendly sign-in page to go to.
 */
export const connectCalendly = async (keys: CalendlyConnectPayload): Promise<string> => {
  const { data } = await apiClient.post('/common/calendly/connect', keys)
  return data.data.url
}

export const disconnectCalendly = async (): Promise<void> => {
  await apiClient.delete('/common/calendly/connection')
}

/** Brings in the account's meetings now; returns how many. */
export const syncCalendly = async (): Promise<number> => {
  const { data } = await apiClient.post('/common/calendly/sync')
  return data.data?.synced ?? 0
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
