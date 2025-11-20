import { apiClient } from '../../lib/http/apiClient'
import type { Employee, EmployeeSearchPayload, EmployeeListResponse } from './types'
export type DepartmentStatusType = 'department' | 'status'
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

  
  const { data } = await apiClient.post('/common/employees/fetch-employees', body)
  const employees = Array.isArray(data.data) ? data.data : []
  const meta = data.meta ?? {}

  return { employees, meta }
}

export const fetchEmployeeById = async (id: string | number): Promise<Employee> => {
  const { data } = await apiClient.get(`/employees/${id}`)
  return data
}

export const createEmployee = async (payload: Partial<Employee>): Promise<Employee> => {
  const { data } = await apiClient.post('/common/employees', payload)
  return data
}

export const updateEmployee = async (id: string | number, payload: Partial<Employee>): Promise<Employee> => {
  const { data } = await apiClient.put(`/common/employees/${id}`, payload)
  return data
}


export const deleteEmployee = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/employees/${id}`)
}


export const fetchDepartmentStatus = async (
  payload: { type: 'department' | 'status' }
): Promise<{ label: string; value: string }[]> => {
  try {
    const response = await apiClient.post('/common/employees/fetch-department-status', payload)

    // Extract the data array from response
    const data = response?.data?.data ?? []

    // Map to { label, value } format
    return data.map((item: any) => ({
      id: item.id,  // for 'status' type, change to item.status
      department: item.department,  // for 'status' type, change to item.status
    }))
  } catch (error) {
    console.error('Failed to fetch department/status', error)
    return []
  }
}

export const deleteEmployees = async (ids: Array<number | string>) => {
  const res = await apiClient.post('/common/employees/multiple-delete', { ids });
  return res.data; // API response
};