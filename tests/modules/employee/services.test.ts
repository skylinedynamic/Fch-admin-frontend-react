import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchEmployees, updateEmployee, fetchDepartmentStatus, fetchAvailableEmployeesForUser } from '../../../src/modules/employee/services'

afterEach(() => server.resetHandlers())

describe('fetchEmployees', () => {
  it('fills in required fields with defaults when the caller omits them', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/employees/fetch-employees', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ data: [], meta: {} })
      })
    )
    await fetchEmployees()
    expect(receivedBody).toEqual({ department: '', search: '', job_status: '', filters: {} })
  })

  it('normalizes a non-array data field to an empty employees array', async () => {
    server.use(
      http.post('*/common/employees/fetch-employees', () => HttpResponse.json({ data: null, meta: { total: 0 } }))
    )
    const result = await fetchEmployees()
    expect(result.employees).toEqual([])
    expect(result.meta).toEqual({ total: 0 })
  })

  it('returns the real employee list and meta when present', async () => {
    server.use(
      http.post('*/common/employees/fetch-employees', () =>
        HttpResponse.json({ data: [{ id: 1, name: 'Jane' }], meta: { total: 1 } })
      )
    )
    const result = await fetchEmployees({ search: 'jane' })
    expect(result.employees).toEqual([{ id: 1, name: 'Jane' }])
    expect(result.meta).toEqual({ total: 1 })
  })
})

describe('updateEmployee', () => {
  it('with FormData appends _method=PUT and POSTs (Laravel file-upload workaround)', async () => {
    let receivedMethodField: string | null = null
    server.use(
      http.post('*/common/employees/9', async ({ request }) => {
        const body = await request.formData()
        receivedMethodField = body.get('_method') as string
        return HttpResponse.json({ id: 9 })
      })
    )
    const form = new FormData()
    form.append('name', 'Updated')
    await updateEmployee(9, form)
    expect(receivedMethodField).toBe('PUT')
  })

  it('with a plain object issues a real PUT', async () => {
    let calledMethod = ''
    server.use(http.put('*/common/employees/9', ({ request }) => { calledMethod = request.method; return HttpResponse.json({ id: 9 }) }))
    await updateEmployee(9, { name: 'Updated' })
    expect(calledMethod).toBe('PUT')
  })
})

describe('fetchDepartmentStatus', () => {
  it('returns the data array on success', async () => {
    server.use(
      http.post('*/common/departments/fetch-departments', () =>
        HttpResponse.json({ status: true, data: [{ label: 'Sales', value: 'sales' }] })
      )
    )
    await expect(fetchDepartmentStatus({ type: 'department' })).resolves.toEqual([{ label: 'Sales', value: 'sales' }])
  })

  it('swallows errors and returns an empty array instead of throwing', async () => {
    server.use(http.post('*/common/departments/fetch-departments', () => HttpResponse.error()))
    await expect(fetchDepartmentStatus({ type: 'status' })).resolves.toEqual([])
  })
})

describe('fetchAvailableEmployeesForUser', () => {
  it("returns the partner's employees that have no user account yet", async () => {
    const employees = [
      { id: 7, first_name: 'Jane', last_name: 'Doe', full_name: 'Jane Doe', email: 'jane@example.test', phone_number_1: '(555) 123-4567' },
    ]
    server.use(
      http.get('*/common/employees-available-for-user', () =>
        HttpResponse.json({ status: true, message: 'ok', data: employees })
      )
    )
    await expect(fetchAvailableEmployeesForUser()).resolves.toEqual(employees)
  })

  it('normalizes a missing data field to an empty list', async () => {
    server.use(http.get('*/common/employees-available-for-user', () => HttpResponse.json({ status: true })))
    await expect(fetchAvailableEmployeesForUser()).resolves.toEqual([])
  })
})
