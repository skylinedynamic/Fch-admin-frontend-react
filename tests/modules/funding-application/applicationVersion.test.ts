import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  adoptLoadedVersion,
  currentApplicationVersion,
  isStaleApplicationError,
  rememberSavedVersion,
  resetApplicationVersion,
  withExpectedVersion,
} from '../../../src/modules/funding-application/applicationVersion'
import {
  fetchFundingRequest,
  saveBusinessInfo,
  saveFundingRequest,
} from '../../../src/modules/funding-application/services'

/**
 * Defect: R2 BUG-033 - with the same application open in two tabs, the
 * stale tab's save silently overwrote what the other tab had saved: each step
 * sends the whole step and nothing said which copy it came from. The wizard
 * now sends the version it is working from; the API refuses an older one (409).
 */
describe('applicationVersion', () => {
  afterEach(() => {
    resetApplicationVersion()
    server.resetHandlers()
  })

  it('sends nothing until a version is known, so a new application saves as before', () => {
    expect(withExpectedVersion({ id: null })).toEqual({ id: null })
  })

  it('takes the version of the first load only', () => {
    adoptLoadedVersion({ version: '2026-10-21 10:00:00' })
    adoptLoadedVersion({ version: '2026-10-21 10:05:00' })

    expect(currentApplicationVersion()).toBe('2026-10-21 10:00:00')
  })

  it('moves on to the version each save returns', () => {
    adoptLoadedVersion({ version: '2026-10-21 10:00:00' })
    rememberSavedVersion({ version: '2026-10-21 10:01:00' })

    expect(withExpectedVersion({ id: 9 })).toEqual({ id: 9, expected_version: '2026-10-21 10:01:00' })
  })

  it('ignores responses without a version', () => {
    rememberSavedVersion({ version: '2026-10-21 10:01:00' })
    rememberSavedVersion({ id: 3 })
    rememberSavedVersion(null)

    expect(currentApplicationVersion()).toBe('2026-10-21 10:01:00')
  })

  it('starts over for a new wizard', () => {
    rememberSavedVersion({ version: '2026-10-21 10:01:00' })
    resetApplicationVersion()

    expect(currentApplicationVersion()).toBeNull()
  })

  it('recognises the API refusing an older copy', () => {
    expect(isStaleApplicationError({ response: { status: 409 } })).toBe(true)
    expect(isStaleApplicationError({ response: { status: 422 } })).toBe(false)
    expect(isStaleApplicationError(new Error('network'))).toBe(false)
  })

  it('a step save sends the loaded version and keeps the one returned', async () => {
    const bodies: Record<string, unknown>[] = []
    server.use(
      http.get('*/common/funding-application/funding-request', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { version: '2026-10-21 10:00:00' } })
      ),
      http.post('*/common/funding-application/funding-request', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json({ status: true, message: 'ok', data: { version: '2026-10-21 10:01:00' } })
      }),
      http.post('*/common/funding-application/business-info', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json({ status: true, message: 'ok', data: { version: '2026-10-21 10:02:00' } })
      })
    )

    await fetchFundingRequest(47)
    await saveFundingRequest({ id: 90, requested_amount: '12000', purpose_of_funds: null, preferred_funding_type: null, timeframe_needed: '1 Month', collateral_available: null, purpose_note: null })
    await saveBusinessInfo({ id: 90 } as any)

    expect(bodies[0].expected_version).toBe('2026-10-21 10:00:00')
    expect(bodies[1].expected_version).toBe('2026-10-21 10:01:00')
    expect(currentApplicationVersion()).toBe('2026-10-21 10:02:00')
  })
})
