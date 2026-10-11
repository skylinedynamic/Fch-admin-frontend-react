import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import {
  useAvailableEmployeesForUser,
  useCreateEmployee,
  useDeleteEmployee,
  useEmployee,
  useEmployees,
  useUpdateEmployee,
} from '../../../src/modules/employee/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

describe('employee queries', () => {
  it('useEmployees posts the default filter set and splits employees from meta', async () => {
    const seen = stub('post', '/common/employees/fetch-employees', {
      status: true, data: [{ id: 1, full_name: 'Erin' }], meta: { total: 1 },
    })

    const { result } = await runQuery(() => useEmployees())

    expect(seen.bodies[0]).toMatchObject({ department: '', search: '', job_status: '', filters: {} })
    expect(result.current.data).toEqual({ employees: [{ id: 1, full_name: 'Erin' }], meta: { total: 1 } })
  })

  it('useEmployees returns an empty list when the API sends no array', async () => {
    stub('post', '/common/employees/fetch-employees', { status: true, data: null })

    const { result } = await runQuery(() => useEmployees())

    expect(result.current.data).toEqual({ employees: [], meta: {} })
  })

  it('useAvailableEmployeesForUser does not fetch when disabled', () => {
    expectIdle(() => useAvailableEmployeesForUser(false))
  })

  it('useAvailableEmployeesForUser unwraps the list', async () => {
    stub('get', '/common/employees-available-for-user', { status: true, data: [{ id: 3, full_name: 'Free Agent' }] })

    const { result, queryClient } = await runQuery(() => useAvailableEmployeesForUser())

    expect(result.current.data).toEqual([{ id: 3, full_name: 'Free Agent' }])
    expect(queryClient.getQueryData(queryKeys.employee.availableForUser())).toHaveLength(1)
  })

  it('useEmployee does not fetch when disabled', () => {
    expectIdle(() => useEmployee(1, false))
  })

  it('useEmployee fetches and unwraps one employee', async () => {
    stub('get', '/common/employees/21', { status: true, data: { id: 21, full_name: 'Erin' } })

    const { result } = await runQuery(() => useEmployee(21))

    expect(result.current.data).toEqual({ id: 21, full_name: 'Erin' })
  })
})

describe('employee mutations', () => {
  it('useCreateEmployee posts the employee and refreshes the list', async () => {
    const seen = stub('post', '/common/employees', { status: true, data: { employee: { id: 5 } } })
    const payload = { first_name: 'Nina', email: 'nina@x.com' }

    const { invalidated } = await runMutation(() => useCreateEmployee(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.employee.list()])
  })

  it('useUpdateEmployee uses PUT for a plain payload and refreshes the record and the list', async () => {
    const seen = stub('put', '/common/employees/21', { status: true, data: {} })
    const payload = { designation: 'Lead' }

    const { invalidated } = await runMutation(() => useUpdateEmployee(), { id: 21, payload } as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.employee.detail(21), queryKeys.employee.list()])
  })

  it('useUpdateEmployee switches to POST with a _method override when a file is attached', async () => {
    const post = stub('post', '/common/employees/21', { status: true, data: {} })
    const put = stub('put', '/common/employees/21', { status: true, data: {} })
    const form = new FormData()
    form.append('first_name', 'Erin')

    await runMutation(() => useUpdateEmployee(), { id: 21, payload: form } as never)

    expect(post.calls).toBe(1)
    expect(put.calls).toBe(0)
    expect(form.get('_method')).toBe('PUT')
  })

  // KNOWN BUG: deleteEmployee() calls DELETE /employees/{id}, but the API only
  // registers the resource under /common (routes/common.php: apiResource
  // "employees"), so this request 404s. Nothing in the UI uses it today - the
  // list deletes through /common/employees/multiple-delete - which is why it
  // has gone unnoticed. Remove `.fails` once the path is corrected.
  it.fails('useDeleteEmployee calls the route the API actually registers', async () => {
    const correct = stub('delete', '/common/employees/21', { status: true })

    await runMutation(() => useDeleteEmployee(), 21 as never)

    expect(correct.calls).toBe(1)
  })

  it('useDeleteEmployee refreshes the list once the request succeeds', async () => {
    stub('delete', '/employees/21', { status: true })

    const { invalidated } = await runMutation(() => useDeleteEmployee(), 21 as never)

    expect(invalidated).toEqual([queryKeys.employee.list()])
  })
})
