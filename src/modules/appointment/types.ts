export type Appointment = {
  id: number | string
  title?: string
  date: string // ISO date string
  time?: string // optional time string
  status?: string
  partnerId?: number | string
  borrowerId?: number | string
  employeeId?: number | string
  [key: string]: unknown
}