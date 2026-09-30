/**
 * An entity's compensation ("Paid By") setup, as the API stores it: one row
 * for Hourly/Salary, one row per applicable service for Per Deal, no rows for
 * None. The Commissions tab works in flat form fields — see
 * `formFields` for the mapping.
 */
export type CompensationRow = {
  id?: number
  service?: string | null
  payout_type?: string | null
  amount?: number | string | null
}

/** Entity slugs the API accepts; it maps them to models server-side. */
export const COMPENSATION_ENTITY_EMPLOYEE = 'employee'
export const COMPENSATION_ENTITY_USER = 'user'

export type CompensationEntityType =
  | typeof COMPENSATION_ENTITY_EMPLOYEE
  | typeof COMPENSATION_ENTITY_USER

export type CompensationEntity = {
  entity_type: CompensationEntityType
  entity_id: number
}

export type Compensation = {
  paid_by: string
  compensations: CompensationRow[]
}

export type CompensationPayload = {
  paid_by: string
  compensations: CompensationRow[]
}
