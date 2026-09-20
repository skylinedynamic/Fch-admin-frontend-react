import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/query'
import { createAppointment, deleteAppointment, fetchAppointmentById, fetchAppointments, updateAppointment } from './services'
import type { CreateAppointmentPayload } from './types'

export const useAppointments = () => {
  return useQuery({
    queryKey: queryKeys.appointment.list(),
    queryFn: fetchAppointments,
  })
}

export const useAppointment = (id: string | number, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.appointment.detail(id),
    queryFn: () => fetchAppointmentById(id),
    enabled,
  })
}

export const useCreateAppointment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) => createAppointment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointment.list() })
    },
  })
}

export const useUpdateAppointment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Partial<CreateAppointmentPayload> }) => updateAppointment(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.appointment.detail(variables.id) })
      qc.invalidateQueries({ queryKey: queryKeys.appointment.list() })
    },
  })
}

export const useDeleteAppointment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => deleteAppointment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.appointment.list() })
    },
  })
}