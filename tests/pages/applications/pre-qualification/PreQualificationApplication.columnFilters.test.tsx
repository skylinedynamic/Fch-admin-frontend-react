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
 * R3-BUG-054: Intake & Review > Pre-Qualification list column filters.
 * - A failed list request said "No applications found", hiding the error.
 * - Requested Amount and Date had no column filter.
 */
const LIST = '/common/request-application/pre-qualification'
const ROW = { id: 7, full_name: 'QA-TEST Run2', business_name: 'Run2 Co', funding_type: 'Working Capital', requested_amount: '$80,000.00', date: '12 Nov 2026', status: 'pending' }

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ is_host: 1, permissions: ['view pre-qualification', 'view applications'] })
  allowBackgroundCalls()
  api('get', '/common/funding-types', { status: true, message: 'ok', data: [] })
})

const open = () => renderPage(<PreQualificationApplication />, { path: '/pre-qualification', route: '/pre-qualification' })

/** The filter menu button in the header cell titled `header`. */
const filterButtonOf = (header: string) => {
  const th = screen.getByText(header, { selector: '.p-column-title' }).closest('th') as HTMLElement
  return th.querySelector('.p-column-filter-menu-button') as HTMLElement
}

describe('Pre-Qualification list - column filters', () => {
  it('says the list could not be loaded when the request fails, not that there are no applications', async () => {
    api('post', LIST, { status: false, message: 'Failed to retrieve pre-qualification application.' }, 500)
    open()

    expect(await screen.findByText(/could not load the applications/i)).toBeInTheDocument()
    expect(screen.queryByText('No applications found')).not.toBeInTheDocument()
  })

  it('still says "No applications found" when the list is empty', async () => {
    api('post', LIST, paginated([]))
    open()

    expect(await screen.findByText('No applications found')).toBeInTheDocument()
  })

  it('offers a column filter on Requested Amount and Date', async () => {
    api('post', LIST, paginated([ROW]))
    open()
    await screen.findByText('Run2 Co')

    expect(filterButtonOf('Requested Amount')).toBeInTheDocument()
    expect(filterButtonOf('Date')).toBeInTheDocument()
  })

  it('filters by requested amount with a number comparison', async () => {
    const list = api('post', LIST, paginated([ROW]))
    const user = userEvent.setup()
    open()
    await screen.findByText('Run2 Co')

    await user.click(filterButtonOf('Requested Amount'))
    await user.type(await screen.findByPlaceholderText('Search amount'), '80000')
    // The menu's button bar is [Clear, Apply].
    const buttons = document.querySelectorAll('.p-column-filter-buttonbar button')
    await user.click(buttons[buttons.length - 1] as HTMLElement)

    await waitFor(() => {
      const constraint = list.bodies[list.bodies.length - 1]?.filters?.requested_amount?.constraints?.[0]
      expect(constraint?.value).toBe(80000)
      expect(['equals', 'lt', 'lte', 'gt', 'gte', 'notEquals']).toContain(constraint?.matchMode)
    })
  })
})
