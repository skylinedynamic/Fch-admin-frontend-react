import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test-utils'
import FundingApplication from '../../../../src/pages/applications/funding/FundingApplication'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import { FUNDING_APPLICATION_STATUS } from '../../../../src/config/borrower'

const calls = vi.hoisted(() => ({ params: [] as Array<Record<string, unknown>> }))

vi.mock('../../../../src/modules/application', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/application')>()),
  useFundingApplications: (params: Record<string, unknown>) => {
    calls.params.push(params)
    return { data: { data: [], meta: { total: 0 } }, isLoading: false, isFetching: false }
  },
  useFundingApplicationStats: () => ({ data: { data: {} }, isLoading: false }),
}))

const statusOptions = () =>
  Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).map((el) => el.textContent)

/**
 * Defect (BUG-048, OP-FAPP-03): Intake & Review > Funding Application offered
 * the pre-qualification statuses (Pending / Intake Received / In Review /
 * Approved / Declined), none of which a funding application has, and the API
 * ignored the chosen status. The filter now lists the funding application
 * statuses and sends the one picked.
 */
describe('FundingApplication status filter', () => {
  beforeEach(() => {
    calls.params = []
    useAuthStore.setState({ user: { id: 1, is_host: 1, partner_id: 1, permissions: [] } as never })
  })

  it('lists the funding application statuses', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<FundingApplication />)

    await user.click(container.querySelector('.employee-filter-dropdown') as HTMLElement)

    const options = statusOptions()
    expect(options).toContain('All Status')
    expect(options).toContain(FUNDING_APPLICATION_STATUS.DRAFT)
    expect(options).toContain(FUNDING_APPLICATION_STATUS.PENDING)
    expect(options).toContain(FUNDING_APPLICATION_STATUS.CLOSED)
    expect(options).not.toContain('Intake Received')
    expect(options).not.toContain('In Review')
  })

  it('sends the picked status when Filters is clicked', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<FundingApplication />)

    await user.click(container.querySelector('.employee-filter-dropdown') as HTMLElement)
    await user.click(
      Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find(
        (el) => el.textContent === FUNDING_APPLICATION_STATUS.CLOSED
      ) as HTMLElement
    )
    await user.click(screen.getByRole('button', { name: /filters/i }))

    expect(calls.params[calls.params.length - 1]).toMatchObject({ status: FUNDING_APPLICATION_STATUS.CLOSED, page: 1 })
  })
})
