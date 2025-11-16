// src/modules/user/services.ts
import { apiClient } from '../../lib/http/apiClient'
import type { User } from './types'

interface RolePayload {
  page?: number
  per_page?: number
  search?: string
}

export const fetchRoles = async (payload?: RolePayload) => {
  const res = await apiClient.post('/common/roles', payload || {})
  return res.data // { status, message, data, links, pagination }
}

// export const fetchUserById = async (id: number | string) => {
//   const res = await apiClient.get(`/users/${id}`)
//   return res.data.data
// }


// export const createUser = async (payload: Partial<User>): Promise<User> => {
//   const { data } = await apiClient.post('/common/users', payload)
//   return data
// }

// export const updateUser = async (id: number | string, payload: Partial<User>) => {
//   const res = await apiClient.put(`/users/${id}`, payload)
//   return res.data.data
// }

// export const deleteUser = async (id: number | string) => {
//   await apiClient.delete(`/users/${id}`)
// }

