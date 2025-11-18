export type User = {
  id: number | string
  name: string
  email?: string
  phone_number?: string
  password?: string
  status?: string
  role?: string
  [key: string]: unknown
}