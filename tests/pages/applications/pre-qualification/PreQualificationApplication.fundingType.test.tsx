import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../../test-utils'
import { allowBackgroundCalls, api, paginated, renderPage, signIn } from '../../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), warning: vi.fn() }) }
})

import PreQualificationApplication from '../../../../src/pages/applications/pre-qualification/PreQualificationApplication'

/**
 * Request 2026-11-05: the Pre-Qualification list's "Funding Type" filter offers
 * the common funding types (GET /common/funding-types - the lender product
 * categories) instead of a hard-coded list, and sends the one picked.
 */
const categories = ['Term Loan', 'Equipment Financing', 'Working Capital']

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ is_host: 1, permissions: ['view pre-qualification', 'view applications'] })
  allowBackgroundCalls()
  api('get', '/common/funding-types', { status: true, message: 'ok', data: categories })
})

describe('Pre-Qualification list - Funding Type filter', () => {
  it('offers the common funding types and filters the list by the one picked', async () => {
    const list = api('post', '/common/request-application/pre-qualification', paginated([]))
    const user = userEvent.setup()
    renderPage(<PreQualificationApplication />, { path: '/pre-qualification', route: '/pre-qualification' })

    await user.click(await screen.findByText('All Types', { selector: '.p-dropdown-label' }))
    const offered = await waitFor(() => {
      const items = Array.from(document.querySelectorAll('.p-dropdown-item')).map((el) => el.textContent?.trim())
      expect(items).toEqual(['All Types', ...categories])
      return items
    })
    expect(offered).not.toContain('Equipment')

    await user.click(screen.getByText('Equipment Financing', { selector: '.p-dropdown-item, .p-dropdown-item *' }))
    await user.click(screen.getByRole('button', { name: /^filters$/i }))

    await waitFor(() => expect(list.bodies.some((b: any) => b?.funding_type === 'Equipment Financing')).toBe(true))
  })
})
