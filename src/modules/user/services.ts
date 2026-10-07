// src/modules/user/services.ts
import { apiClient } from '../../lib/http/apiClient'
import type { CreateUserPayload, CreateUserResponse, User } from './types'

interface UsersPayload {
  page?: number
  per_page?: number
  search?: string
}

export type Role = {
  id: number | string;
  name: string;
};

// Fetch roles (pluck id and name only)
export const fetchRoles = async (partner_id?: string): Promise<Role[]> => {
  try {
    const res = await apiClient.post('/common/roles/fetch-roles', {
      params: partner_id ? { partner_id } : {},
    });

    // Pluck only id and name
    const roles = (res.data.data || []).map((role: any) => ({
      id: role.id,
      name: role.name,
    }));

    return roles;
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return [];
  }
};


export const fetchUsers = async (payload: { role?: string; status?: string; search?: string; filters?: any; page?: number; per_page?: number; sort_field?: string; sort_order?: string }) => {
  const res = await apiClient.post('/common/users/fetch-users', payload || {})
  return res.data // { status, message, data, links, pagination }
}

export const fetchUserById = async (id: number | string) => {
  const res = await apiClient.get(`/common/users/${id}`)
  return res.data.data
}


export const createUser = async (payload: CreateUserPayload): Promise<CreateUserResponse> => {
  const { data } = await apiClient.post('/common/users', payload)
  return data
}

export const updateUser = async (id: number | string, payload: Partial<User>) => {
  const res = await apiClient.put(`/common/users/${id}`, payload)
  return res.data.data
}

export const deleteUsers = async (ids: Array<number | string>) => {
  const res = await apiClient.post('/common/users/multiple-delete', { ids });
  return res.data; // API response
};


interface UserCountResponse {
  count: number;
  per_user_price: string;
}

export const getUserCount = async () => {
    const res = await apiClient.get('/common/user-count')
    return res.data // { count, per_user_price }
}

export const purchaseUserSeats = async (payload: any) => {
  const res = await apiClient.post('/process-payment-for-users', payload);
  return res.data;
};
