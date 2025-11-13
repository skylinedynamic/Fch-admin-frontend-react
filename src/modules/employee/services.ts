import { apiClient } from '../../lib/apiClient'
import type { Employee } from './types'

export const fetchEmployees = async (): Promise<Employee[]> => {
  const { data } = await apiClient.get('/employees')
  return data
}

export const fetchEmployeeById = async (id: string | number): Promise<Employee> => {
  const { data } = await apiClient.get(`/employees/${id}`)
  return data
}

export const createEmployee = async (payload: Partial<Employee>): Promise<Employee> => {
  const { data } = await apiClient.post('/employees', payload)
  return data
}

export const updateEmployee = async (id: string | number, payload: Partial<Employee>): Promise<Employee> => {
  const { data } = await apiClient.put(`/employees/${id}`, payload)
  return data
}

export const deleteEmployee = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/employees/${id}`)
}