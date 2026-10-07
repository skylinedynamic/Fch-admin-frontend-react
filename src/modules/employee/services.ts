import { apiClient } from '../../lib/http/apiClient'
import type { AvailableEmployee, Employee, EmployeeSearchPayload, EmployeeListResponse } from './types'

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

/** The partner's employees that are not yet connected to a user. */
export const fetchAvailableEmployeesForUser = async (): Promise<AvailableEmployee[]> => {
  const { data } = await apiClient.get('/common/employees-available-for-user')
  return Array.isArray(data?.data) ? data.data : []
}

export const fetchEmployeeById = async (id: string | number): Promise<Employee> => {
  const { data } = await apiClient.get(`/common/employees/${id}`)
  return data.data
}

export const createEmployee = async (payload: Partial<Employee> | FormData): Promise<Employee> => {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : {};
  const { data } = await apiClient.post('/common/employees', payload, config)
  return data
}

export const updateEmployee = async (id: string | number, payload: Partial<Employee> | FormData): Promise<Employee> => {
  // Laravel doesn't support file uploads via PUT, so we use POST with _method override
  if (payload instanceof FormData) {
    payload.append('_method', 'PUT');
    const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    const { data } = await apiClient.post(`/common/employees/${id}`, payload, config);
    return data;
  } else {
    const { data } = await apiClient.put(`/common/employees/${id}`, payload);
    return data;
  }
}

export const deleteEmployee = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/employees/${id}`)
}

export const fetchDepartmentStatus = async (
  payload: { type: 'department' | 'status' }
): Promise<{ label: string; value: string }[]> => {
  try {
    const response = await apiClient.post('/common/departments/fetch-departments', payload)
    return response.data.data
  } catch (error) {
    console.error('Failed to fetch department/status', error)
    return []
  }
}

export const deleteEmployees = async (ids: Array<number | string>) => {
  const res = await apiClient.post('/common/employees/multiple-delete', { ids });
  return res.data; // API response
};

export const fetchDepartments = async () => {
  const res = await apiClient.post('/common/departments/fetch-departments');
  return res.data.data;
};

export const getNextEmployeeId = async (): Promise<{ status: boolean; message: string; data: { next_id: number } }> => {
  const { data } = await apiClient.get('/common/employees-next-id');
  return data;
};

export const saveDepartment = async (payload: { name: string }) => {
  const res = await apiClient.post('/common/departments', payload);
  return res.data;
};

export const deleteDepartment = async (id: string | number) => {
  const res = await apiClient.delete(`/common/departments/${id}`);
  return res.data;
};