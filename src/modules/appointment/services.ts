import { apiClient } from '../../lib/http/apiClient'
import type {
  Appointment,
  FetchAppointmentsResponse,
  CreateAppointmentPayload,
  CreateAppointmentResponse,
  FetchTimeSlotsResponse
} from './types'

export const fetchAppointments = async (): Promise<FetchAppointmentsResponse> => {
  const { data } = await apiClient.post(`/common/appointments/fetch-all`)
  return data
}


export const fetchAppointmentById = async (id: string | number): Promise<Appointment> => {
  const { data } = await apiClient.get(`/common/appointments/${id}`)
  return data.data
}

export const createAppointment = async (payload: CreateAppointmentPayload): Promise<CreateAppointmentResponse> => {
  const { data } = await apiClient.post('/common/appointments', payload)
  return data
}

export const updateAppointment = async (id: string | number, payload: Partial<CreateAppointmentPayload>): Promise<Appointment> => {
  const { data } = await apiClient.put(`/common/appointments/${id}`, payload)
  return data.data
}

export const deleteAppointment = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/common/appointments/${id}`)
}

export const fetchTimeSlots = async (): Promise<FetchTimeSlotsResponse> => {
  const { data } = await apiClient.get('/common/time-slots/fetch-all')
  return data
}
export const checkAvailability = async (payload: { assigned_for: number | string, appointment_date: string }) => {
  const { data } = await apiClient.post('/common/appointments/check-availability', payload)
  return data
}
