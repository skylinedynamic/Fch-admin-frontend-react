import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test-utils'
import { allowBackgroundCalls } from '../../pageHarness'
import LenderVisibilityGrid from '../../../../src/pages/funding/components/LenderVisibilityGrid'

vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))

/**
 * Defect: R2 BUG-008 - two lenders named "Kabbage" were two identical
 * "Kabbage" entries in Underwriting Logic's Lender picker. Each now reads
 * "Lender Name - Legal Name".
 */
describe('Underwriting Logic: the Lender picker', () => {
  it('names each lender with its legal name', async () => {
    allowBackgroundCalls()
    renderWithProviders(
      <LenderVisibilityGrid
        visibilities={[]}
        setVisibilities={vi.fn()}
        lenders={[
          { id: 1, name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' },
          { id: 2, name: 'Kabbage', legal_name: 'Kabbage Funding LLC' },
        ]}
        errors={{}}
        setErrors={vi.fn()}
        stateOptions={[]}
        industryTypes={[]}
        productCategories={[]}
      />,
      // The form view (adding a lender's rules), where the Lender picker is.
      { route: '/funding-sequencing/create/configuration' }
    )

    const picker = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown')).find((el) => el.textContent?.includes('Please select a lender'))
      if (!found) throw new Error('no Lender picker')
      return found as HTMLElement
    })
    await userEvent.click(picker)

    const items = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).map((el) => el.textContent?.trim())
      if (found.length < 2) throw new Error('no options yet')
      return found
    })
    expect(items).toEqual(['Kabbage - Kabbage Inc.', 'Kabbage - Kabbage Funding LLC'])
    expect(screen.queryByText(/^Kabbage$/)).not.toBeInTheDocument()
  })
})
