import { apiClient } from '../../lib/apiClient'
import type { Appointment } from './types'

export const fetchAppointments = async (): Promise<Appointment[]> => {
  const { data } = await apiClient.get('/appointments')
  return data
}

export const fetchAppointmentById = async (id: string | number): Promise<Appointment> => {
  const { data } = await apiClient.get(`/appointments/${id}`)
  return data
}

export const createAppointment = async (payload: Partial<Appointment>): Promise<Appointment> => {
  const { data } = await apiClient.post('/appointments', payload)
  return data
}

export const updateAppointment = async (id: string | number, payload: Partial<Appointment>): Promise<Appointment> => {
  const { data } = await apiClient.put(`/appointments/${id}`, payload)
  return data
}

export const deleteAppointment = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/appointments/${id}`)
}