export type User = {
  id: number | string
  name: string
  email?: string
  phone_number?: string
  password?: string
  status?: string
  entity_type?: string
  role?: string
  [key: string]: unknown
}

/** A new user is always the login of one of the partner's employees. */
export type CreateUserPayload = {
  employee_id: number
  name: string
  email: string
  phone_number: string
  role_id: number
  password: string
  /** Set when the partner is buying an extra seat for this user. */
  is_paid?: boolean
  months?: number
}

export type CreateUserResponse = {
  status: boolean
  message: string
  /** invoice_id is present when a paid seat was bought - it is the invoice to pay. */
  data: User & { invoice_id?: number }
}
