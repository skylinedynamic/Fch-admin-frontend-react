import { apiClient } from '../../lib/http/apiClient'
import type { Employee, EmployeeSearchPayload, EmployeeListResponse } from './types'

export const fetchEmployees = async (payload: EmployeeSearchPayload = {}): Promise<EmployeeListResponse> => {
  // Ensure required fields are always present in POST body
  const body: EmployeeSearchPayload = {
    department: payload.department ?? '',
    search: payload.search ?? '',
    job_status: payload.job_status ?? '',
    filters: payload.filters ?? {},
    page: payload.page,
    per_page: payload.per_page,
    sort_field: payload.sort_field,
    sort_order: payload.sort_order,
  }
  const { data } = await apiClient.post('/common/get-employees', body)
  const rows = Array.isArray(data) ? data : (data?.data?.employees ?? data?.employees ?? [])
  const meta = Array.isArray(data) ? undefined : (data?.data?.meta ?? data?.meta)
  return { employees: rows as Employee[], meta }
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