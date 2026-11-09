import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { auditKeys, useFundingApplicationAuditTrail } from '../../../src/modules/application-audit/queries'
import { expectIdle, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

describe('useFundingApplicationAuditTrail', () => {
  it('reads the trail for the application with its filters', async () => {
    const seen = stub('get', '/common/request-application/funding-application/6/audit-trail', {
      status: true,
      data: [{ id: 3, event: 'downloaded' }],
      pagination: { total: 1, per_page: 25, current_page: 1, last_page: 1 },
      integrity: { valid: true, broken_at: null, checked: 1 },
    })

    const { result } = await runQuery(() => useFundingApplicationAuditTrail('6', { page: 1, event: 'downloaded' }))

    expect(new URL(seen.urls[0]).searchParams.get('event')).toBe('downloaded')
    expect(result.current.data?.data[0].id).toBe(3)
  })

  it('waits for an application id', () => {
    expectIdle(() => useFundingApplicationAuditTrail(''))
  })

  it('keys each application and filter set apart', () => {
    expect(auditKeys.trail('6', { page: 1 })).not.toEqual(auditKeys.trail('6', { page: 2 }))
    expect(auditKeys.trail('6', { page: 1 }).slice(0, 2)).toEqual(auditKeys.all('6'))
  })
})
