import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../../../test-utils'

vi.mock('bootstrap/js/dist/modal', () => import('../../../../../mocks/fakeBootstrapModal'))

import CoBorrowerTable from '../../../../../../src/pages/applications/fundapplication/components/shared/CoBorrowerTable'
import type { CoBorrower } from '../../../../../../src/pages/applications/fundapplication/types'

const co = { id: null, firstName: 'QA-TEST', lastName: 'CoBorrower108', role: 'Partner', ownershipPct: '50', email: 'co@example.test', mobilePhone: '(512) 555-0101' } as CoBorrower

/** Defect (BUG-108, admin): Remove deleted the co-borrower at once, with no confirmation. */
describe('CoBorrowerTable (admin) — Remove', () => {
  it('asks first and removes only when confirmed', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<CoBorrowerTable coBorrowers={[co]} onDelete={onDelete} onAdd={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(await screen.findByText('Remove QA-TEST CoBorrower108 as a co-borrower? This cannot be undone.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /yes, delete it/i, hidden: true }))

    expect(onDelete).toHaveBeenCalledWith(0)
  })

  it('keeps the co-borrower when the confirmation is closed', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<CoBorrowerTable coBorrowers={[co]} onDelete={onDelete} onAdd={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /delete/i }))
    await user.click(await screen.findByRole('button', { name: /^close$/i, hidden: true }))

    expect(onDelete).not.toHaveBeenCalled()
  })
})
