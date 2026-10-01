import { apiClient } from '../../lib/http/apiClient'
import { COMPENSATION_ENTITY_EMPLOYEE, COMPENSATION_ENTITY_USER } from './types'
import type { Compensation, CompensationEntity, CompensationEntityType, CompensationPayload } from './types'

/**
 * Compensation has its own endpoints, separate from the employee ones. The
 * owning entity is identified in the body rather than the path, so one set of
 * endpoints serves every entity that can be paid.
 */
export const fetchCompensation = async (entity: CompensationEntity): Promise<Compensation> => {
  const { data } = await apiClient.post('/common/compensations/fetch-compensation', entity)
  return data.data
}

/** One write endpoint for both the first save and later edits. */
export const saveCompensation = async (
  entity: CompensationEntity,
  payload: CompensationPayload
): Promise<Compensation> => {
  const { data } = await apiClient.post('/common/compensations', { ...entity, ...payload })
  return data.data
}

const entity = (entityType: CompensationEntityType, entityId: string | number): CompensationEntity => ({
  entity_type: entityType,
  entity_id: Number(entityId),
})

export const fetchEmployeeCompensation = (employeeId: string | number): Promise<Compensation> =>
  fetchCompensation(entity(COMPENSATION_ENTITY_EMPLOYEE, employeeId))

export const saveEmployeeCompensation = (
  employeeId: string | number,
  payload: CompensationPayload
): Promise<Compensation> => saveCompensation(entity(COMPENSATION_ENTITY_EMPLOYEE, employeeId), payload)

export const fetchUserCompensation = (userId: string | number): Promise<Compensation> =>
  fetchCompensation(entity(COMPENSATION_ENTITY_USER, userId))

export const saveUserCompensation = (
  userId: string | number,
  payload: CompensationPayload
): Promise<Compensation> => saveCompensation(entity(COMPENSATION_ENTITY_USER, userId), payload)
