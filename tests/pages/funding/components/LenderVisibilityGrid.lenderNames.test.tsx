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

  // 2026-11-11: two lenders may now share a name and a legal name; the
  // picker names each "Lender Name - Lender Code".
  it('names each lender by its name and Lender Code', async () => {
    allowBackgroundCalls()
    renderWithProviders(
      <LenderVisibilityGrid
        visibilities={[]}
        setVisibilities={vi.fn()}
        lenders={[
          { id: 1, lender_code: 'LND-1111', name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' },
          { id: 2, lender_code: 'LND-2222', name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' },
        ]}
        errors={{}}
        setErrors={vi.fn()}
        stateOptions={[]}
        industryTypes={[]}
        productCategories={[]}
      />,
      { route: '/funding-sequencing/create/configuration' }
    )

    const picker = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown')).find((el) => el.textContent?.includes('Please select a lender'))
      if (!found) throw new Error('no Lender picker')
      return found as HTMLElement
    })
    await userEvent.click(picker)

    // Design A: the name on the left, the code apart on the right.
    const items = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown-panel .p-dropdown-item'))
      if (found.length < 2) throw new Error('no options yet')
      return found.map((el) => [el.querySelector('.lender-option-name')?.textContent, el.querySelector('.lender-option-code')?.textContent])
    })
    expect(items).toEqual([['Kabbage', 'LND-1111'], ['Kabbage', 'LND-2222']])

    // The picked lender shows in the box with its code right after the name.
    await userEvent.click(document.querySelectorAll('.p-dropdown-panel .p-dropdown-item')[1] as HTMLElement)
    const shown = await waitFor(() => {
      const value = document.querySelector('.p-dropdown-label .lender-option-inline')
      if (!value) throw new Error('no picked lender shown')
      return value as HTMLElement
    })
    expect(shown.querySelector('.lender-option-code')).toHaveTextContent('LND-2222')
  })
})

// Design A in "Filter by Lender" (the rules list): name left, code right; a
// lender made Inactive since keeps its rules and says so.
describe('Underwriting Logic: Filter by Lender', () => {
  const renderList = () =>
    renderWithProviders(
      <LenderVisibilityGrid
        visibilities={[
          { id: 1, lender_id: 1, lender_product_category_id: 3, min_fico: 600, lender: { id: 1, lender_code: 'LND-1111', name: 'Kabbage', legal_name: 'Kabbage Inc.', status: 'Active' } },
          { id: 2, lender_id: 7, lender_product_category_id: 3, min_fico: 650, lender: { id: 7, lender_code: 'LND-7777', name: 'Old Bank', legal_name: 'Old Bank LLC', status: 'Inactive' } },
        ]}
        setVisibilities={vi.fn()}
        lenders={[{ id: 1, lender_code: 'LND-1111', name: 'Kabbage', legal_name: 'Kabbage Inc.', display_name: 'Kabbage - Kabbage Inc.' }]}
        errors={{}}
        setErrors={vi.fn()}
        stateOptions={[]}
        industryTypes={[]}
        productCategories={[{ id: 3, name: 'Term Loan' }] as never}
      />,
      { route: '/funding-sequencing/create' }
    )

  const openFilter = async () => {
    const filter = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown')).find((el) => el.textContent?.includes('Filter by Lender'))
      if (!found) throw new Error('no Filter by Lender')
      return found as HTMLElement
    })
    await userEvent.click(filter)
    return waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown-panel .p-dropdown-item')) as HTMLElement[]
      if (found.length < 3) throw new Error('no options yet')
      return found
    })
  }

  it('names each lender by name and code, an inactive one marked after its name', async () => {
    allowBackgroundCalls()
    renderList()

    const items = (await openFilter()).map((el) => [
      el.querySelector('.lender-option-name')?.textContent ?? el.textContent?.trim(),
      el.querySelector('.lender-option-code')?.textContent ?? null,
    ])

    expect(items).toEqual([['All Lenders', null], ['Kabbage', 'LND-1111'], ['Old Bank (Inactive)', 'LND-7777']])
  })

  it.each([
    [1, 'LND-1111', 'Kabbage'],
    [2, 'LND-7777', 'Old Bank (Inactive)'],
  ])('shows the picked lender in the box with its code (option %i)', async (index, code, name) => {
    allowBackgroundCalls()
    renderList()

    await userEvent.click((await openFilter())[index])

    const shown = await waitFor(() => {
      const value = Array.from(document.querySelectorAll('.p-dropdown-label .lender-option-inline')).find((el) => el.textContent?.includes(code))
      if (!value) throw new Error('no picked lender shown')
      return value as HTMLElement
    })
    expect(shown.querySelector('.lender-option-name')?.textContent).toBe(name)
  })
})
