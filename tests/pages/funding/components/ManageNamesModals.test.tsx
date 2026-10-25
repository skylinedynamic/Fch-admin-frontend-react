import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test-utils'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn() }) }
})

const api = vi.hoisted(() => ({
  createFundingGroup: vi.fn(),
  updateFundingGroup: vi.fn(),
  createLenderProductCategory: vi.fn(),
  updateLenderProductCategory: vi.fn(),
}))

vi.mock('../../../../src/modules/funding/services', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/funding/services')>()),
  createFundingGroup: api.createFundingGroup,
  updateFundingGroup: api.updateFundingGroup,
}))
vi.mock('../../../../src/modules/lender/services', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/lender/services')>()),
  createLenderProductCategory: api.createLenderProductCategory,
  updateLenderProductCategory: api.updateLenderProductCategory,
}))

import { toast } from 'react-toastify'
import FundingGroupModal from '../../../../src/pages/funding/components/FundingGroupModal'
import LenderProductCategoryModal from '../../../../src/pages/lenders/components/LenderProductCategoryModal'

const items = [{ id: 7, name: 'Loans' }]

const cases = [
  {
    title: 'Manage Funding Groups',
    render: () => <FundingGroupModal visible onHide={vi.fn()} onSuccess={vi.fn()} groups={items} />,
    create: api.createFundingGroup,
    update: api.updateFundingGroup,
    added: 'Funding group added successfully',
    updated: 'Funding group updated successfully',
  },
  {
    title: 'Manage Product Categories',
    render: () => <LenderProductCategoryModal visible onHide={vi.fn()} onSuccess={vi.fn()} categories={items} />,
    create: api.createLenderProductCategory,
    update: api.updateLenderProductCategory,
    added: 'Product category added successfully',
    updated: 'Product category updated successfully',
  },
]

/**
 * BUG-049 (OP-FSEQ-12) / BUG-050 (OP-LEND-11): renaming a funding group or a
 * product category said "... added successfully".
 */
describe.each(cases)('$title', (c) => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear()
    c.create.mockReset().mockResolvedValue({})
    c.update.mockReset().mockResolvedValue({})
  })

  const rename = async (submit: 'click' | 'enter') => {
    const user = userEvent.setup()
    renderWithProviders(c.render())
    await user.click(await screen.findByTitle('Edit'))
    const input = screen.getByDisplayValue('Loans')
    await user.clear(input)
    await user.type(input, 'Term Loans')
    if (submit === 'enter') await user.keyboard('{Enter}')
    else await user.click(document.body.querySelector('.btn-success') as HTMLElement)
  }

  it.each(['click', 'enter'] as const)('says updated, not added, when an item is renamed (%s)', async (submit) => {
    await rename(submit)

    expect(c.update).toHaveBeenCalledWith(7, { name: 'Term Loans' })
    expect(c.create).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith(c.updated)
    expect(toast.success).not.toHaveBeenCalledWith(c.added)
  })

  it('shows the API message for a duplicate name under the edited item', async () => {
    c.update.mockRejectedValue({ response: { status: 422, data: { errors: { name: 'This name already exists.' } } } })
    await rename('click')

    expect(await screen.findByText('This name already exists.')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
