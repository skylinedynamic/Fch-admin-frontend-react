export type Employee = {
  id: number | string
  full_name: string
  phone_number?: string | null
  email?: string | null
  department?: string | null
  designation?: string | null
  job_status?: string | null
  address?: string | null
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