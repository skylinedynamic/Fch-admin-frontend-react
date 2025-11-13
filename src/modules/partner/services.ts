import { apiClient } from '../../lib/apiClient'
import type { Partner } from './types'

export const fetchPartners = async (): Promise<Partner[]> => {
  const { data } = await apiClient.get('/partners')
  return data
}

export const fetchPartnerById = async (id: string | number): Promise<Partner> => {
  const { data } = await apiClient.get(`/partners/${id}`)
  return data
}

export const createPartner = async (payload: Partial<Partner>): Promise<Partner> => {
  const { data } = await apiClient.post('/partners', payload)
  return data
}

export const updatePartner = async (id: string | number, payload: Partial<Partner>): Promise<Partner> => {
  const { data } = await apiClient.put(`/partners/${id}`, payload)
  return data
}

export const deletePartner = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/partners/${id}`)
}