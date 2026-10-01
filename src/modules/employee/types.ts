export type Employee = {
  id: number | string

  // Basic Info
  first_name?: string | null
  last_name?: string | null
  email?: string | null

  // Phone
  phone_number?: string | null               // keep your original
  phone_number_1?: string | null
  phone_number_2?: string | null

  create_account?: boolean | null

  // Personal Info
  date_of_birth?: string | null
  gender?: string | null
  role_id?: string | null
  passport_number?: string | null
  blood_group?: string | null
  place_of_birth?: string | null
  ssn?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
  designation?: string | null
  department?: string | null
  job_status?: string | null
  joining_date?: string | null
  employee_code?: string | null
  identification_number?: string | null
  emergency_contact?: string | null
  emergency_phone?: string | null
  marital_status?: string | null
  no_of_children?: number | null
  image?: string | null

  // Compensation ("Paid By") is not part of the employee record — it lives in
  // its own table behind its own endpoints; see modules/compensation.

  [key: string]: unknown
}

export type EmployeeSearchPayload = {
  department?: string
  job_status?: string
  search?: string
  filters?: Record<string, any>
  page?: number
  per_page?: number
  sort_field?: string
  sort_order?: 'asc' | 'desc'
}

export type EmployeeListResponse = {
  employees: Employee[]
  meta?: {
    current_page?: number
    per_page?: number
    total?: number
    last_page?: number
    next_page_url?: string | null
    prev_page_url?: string | null
    links?: Array<{ url: string | null; label: string; page?: number | null; active: boolean }>
  }
}