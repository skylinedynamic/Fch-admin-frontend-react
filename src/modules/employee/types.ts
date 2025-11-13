export type Employee = {
  id: number | string
  name: string
  title?: string
  email?: string
  phone?: string
  status?: string
  [key: string]: unknown
}