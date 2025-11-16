import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { createEmployee, deleteEmployee, fetchEmployeeById, fetchEmployees, updateEmployee } from './services'
import type { Employee, EmployeeListResponse } from './types'

export const useEmployees = () => {
  return useQuery<EmployeeListResponse>({
    queryKey: queryKeys.employee.list(),
    queryFn: () => fetchEmployees(),
  })
}

export const useEmployee = (id: string | number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.employee.detail(id),
    queryFn: () => fetchEmployeeById(id),
    enabled,
  })
}

export const useCreateEmployee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Employee>) => createEmployee(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employee.list() })
    },
  })
}

export const useUpdateEmployee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Partial<Employee> }) => updateEmployee(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.employee.detail(variables.id) })
      qc.invalidateQueries({ queryKey: queryKeys.employee.list() })
    },
  })
}

export const useDeleteEmployee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employee.list() })
    },
  })
}