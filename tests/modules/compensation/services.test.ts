import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchCompensation,
  fetchEmployeeCompensation,
  fetchUserCompensation,
  saveCompensation,
  saveEmployeeCompensation,
  saveUserCompensation,
} from '../../../src/modules/compensation/services'

afterEach(() => server.resetHandlers())

const captureFetch = () => {
  const seen: { body: unknown } = { body: null }
  server.use(
    http.post('*/common/compensations/fetch-compensation', async ({ request }) => {
      seen.body = await request.json()
      return HttpResponse.json({ status: true, data: { paid_by: 'Hourly', compensations: [{ amount: 25 }] } })
    })
  )
  return seen
}

const captureSave = () => {
  const seen: { body: unknown } = { body: null }
  server.use(
    http.post('*/common/compensations', async ({ request }) => {
      seen.body = await request.json()
      return HttpResponse.json({ status: true, data: { paid_by: 'Salary', compensations: [{ amount: 60000 }] } })
    })
  )
  return seen
}

describe('fetchCompensation', () => {
  it('identifies the entity in the body and unwraps the response', async () => {
    const seen = captureFetch()

    const result = await fetchCompensation({ entity_type: 'employee', entity_id: 5 })

    expect(seen.body).toEqual({ entity_type: 'employee', entity_id: 5 })
    expect(result).toEqual({ paid_by: 'Hourly', compensations: [{ amount: 25 }] })
  })
})

describe('saveCompensation', () => {
  it('merges the entity and the payload into one body', async () => {
    const seen = captureSave()
    const payload = { paid_by: 'Salary', compensations: [{ amount: 60000 }] }

    const result = await saveCompensation({ entity_type: 'user', entity_id: 3 }, payload)

    expect(seen.body).toEqual({ entity_type: 'user', entity_id: 3, ...payload })
    expect(result.paid_by).toBe('Salary')
  })
})

describe('entity shortcuts', () => {
  it('fetchEmployeeCompensation uses the employee slug and a numeric id', async () => {
    const seen = captureFetch()
    await fetchEmployeeCompensation('12')
    expect(seen.body).toEqual({ entity_type: 'employee', entity_id: 12 })
  })

  it('fetchUserCompensation uses the user slug and a numeric id', async () => {
    const seen = captureFetch()
    await fetchUserCompensation('8')
    expect(seen.body).toEqual({ entity_type: 'user', entity_id: 8 })
  })

  it('saveEmployeeCompensation writes against the employee', async () => {
    const seen = captureSave()
    await saveEmployeeCompensation(12, { paid_by: 'None', compensations: [] })
    expect(seen.body).toEqual({ entity_type: 'employee', entity_id: 12, paid_by: 'None', compensations: [] })
  })

  it('saveUserCompensation writes against the user', async () => {
    const seen = captureSave()
    await saveUserCompensation('8', { paid_by: 'None', compensations: [] })
    expect(seen.body).toEqual({ entity_type: 'user', entity_id: 8, paid_by: 'None', compensations: [] })
  })
})
