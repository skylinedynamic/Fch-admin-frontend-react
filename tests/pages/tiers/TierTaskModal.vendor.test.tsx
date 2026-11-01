import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import type { ComponentType } from 'react'
import TierTaskModalJsx from '../../../src/pages/tiers/components/TierTaskModal'

// A .jsx component: its prop types are inferred from defaults (vendors = [] -> never[]).
const TierTaskModal = TierTaskModalJsx as unknown as ComponentType<Record<string, unknown>>

/**
 * BUG-095: the Add Task dialog decided "Related Vendor or Verified By Api" -
 * and whether a vendor is required - from a tier object the task list fetched
 * on its own. Until that arrived, a Tier 1 task was treated as any other tier
 * and saved without a vendor; and a vendor list still loading looked empty.
 * The dialog now gets the tier's code from the page, which already has it.
 */
const VENDORS = [{ id: 31, name: 'Uline', category: 'Office Supplies' }]

const open = (props: Record<string, unknown> = {}) => {
  const onSubmit = vi.fn()
  render(<TierTaskModal show onHide={() => {}} onSubmit={onSubmit} tierId={2} tierCode="T1" vendors={VENDORS} {...props} />)
  return { onSubmit }
}

/** The Related Vendor dropdown, and the text it shows (PrimeReact also keeps a hidden copy). */
const vendorDropdown = () => screen.getByText('Related Vendor').parentElement!.querySelector('.p-dropdown') as HTMLElement
const vendorLabel = () => vendorDropdown().querySelector('.p-dropdown-label')?.textContent

describe('TierTaskModal › vendor on Tier 1', () => {
  afterEach(() => cleanup())

  it('asks for the vendor from the tier code alone - no tier object needed', async () => {
    const user = userEvent.setup()
    const { onSubmit } = open({ tier: undefined })

    expect(screen.getByText('Related Vendor')).toBeInTheDocument()
    expect(screen.queryByText('Verified By Api')).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Enter task title'), 'Apply with Uline')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Vendor is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('says the vendors are loading instead of showing an empty list', () => {
    open({ vendors: [], vendorsLoading: true })

    expect(vendorLabel()).toBe('Loading vendors…')
  })

  it('says so when the tier has no active vendors', async () => {
    const user = userEvent.setup()
    open({ vendors: [] })

    expect(vendorLabel()).toBe('Select Vendor')
    await user.click(vendorDropdown())

    expect(await screen.findByText('No active vendors on this tier. Add one in the Vendors tab.')).toBeInTheDocument()
  })

  it('opens the vendor list inside the dialog, not over the page body', async () => {
    const user = userEvent.setup()
    open()

    await user.click(vendorDropdown())

    const option = await waitFor(() => {
      const item = document.querySelector('.p-dropdown-panel .p-dropdown-item')
      expect(item).not.toBeNull()
      return item as HTMLElement
    })
    expect(option).toHaveTextContent('Uline')
    expect(option.closest('.modal')).not.toBeNull()
  })

  it('another tier is verified by an API, with no vendor needed', async () => {
    const user = userEvent.setup()
    const { onSubmit } = open({ tierCode: 'T0', vendors: [] })

    expect(screen.getByText('Verified By Api')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Enter task title'), 'Get an EIN')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tier_id: 2, vendor_id: null })))
  })
})
