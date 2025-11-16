// src/modules/user/services.ts
import { apiClient } from '../../lib/http/apiClient'
import type { User } from './types'

interface UsersPayload {
  page?: number
  per_page?: number
  search?: string
}

export type Role = {
  id: number | string
  name: string
  partner_id?: string
  guard_name?: string
  [key: string]: unknown
}

// Fetch roles (all, no pagination, partner_id wise)
export const fetchRoles = async (partner_id?: string): Promise<Role[]> => {
  const res = await apiClient.post('/common/roles', partner_id ? { partner_id } : {})
  return res.data.data || [] // return roles array
}


export const fetchUsers = async (payload?: UsersPayload) => {
  const res = await apiClient.post('/common/all-users', payload || {})
  return res.data // { status, message, data, links, pagination }
}

export const fetchUserById = async (id: number | string) => {
  const res = await apiClient.get(`/users/${id}`)
  return res.data.data
}


export const createUser = async (payload: Partial<User>): Promise<User> => {
  const { data } = await apiClient.post('/common/users', payload)
  return data
}

export const updateUser = async (id: number | string, payload: Partial<User>) => {
  const res = await apiClient.put(`/users/${id}`, payload)
  return res.data.data
}

export const deleteUser = async (id: number | string) => {
  await apiClient.delete(`/users/${id}`)
}

