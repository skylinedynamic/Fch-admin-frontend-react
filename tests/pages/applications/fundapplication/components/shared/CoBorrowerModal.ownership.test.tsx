import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../../../../mocks/server'
import { createTestQueryClient } from '../../../../../test-utils'
import CoBorrowerModal from '../../../../../../src/pages/applications/fundapplication/components/shared/CoBorrowerModal'
import type { CoBorrower } from '../../../../../../src/pages/applications/fundapplication/types'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('react-flatpickr', () => ({
  default: ({ value, onChange, className, placeholder }: any) => (
    <input className={className} value={value || ''} placeholder={placeholder} onChange={(e: any) => onChange([e.target.value], e.target.value)} />
  ),
}))

const draft = {
  id: null, firstName: 'John', lastName: 'Co', role: 'Partner', ownershipPct: '50', email: 'john@example.com',
  mobilePhone: '(512) 555-0101', homePhone: '', streetAddress: '456 Elm St', country: 'United States', city: 'Austin',
  state: 'Texas', zip: '78701', ssn: '123-45-6789', dob: '1985-05-05', driversLicenseNumber: '', driversLicenseState: '',
} as CoBorrower

function Harness({ onSubmit, otherOwnershipTotal }: { onSubmit: (e: any) => void; otherOwnershipTotal: number }) {
  const [coDraft, setCoDraft] = useState<CoBorrower>(draft)
  return <CoBorrowerModal coDraft={coDraft} setCoDraft={setCoDraft} onSubmit={onSubmit} isEditing={false} otherOwnershipTotal={otherOwnershipTotal} />
}

/**
 * Defect (BUG-108, admin): + Add Co-Borrower accepted 50% next to an owner
 * holding 100% - the check went out without what the others already hold.
 */
describe('CoBorrowerModal (admin) — ownership must fit in what the others leave', () => {
  afterEach(() => server.resetHandlers())

  it('sends what the owner and other co-borrowers hold, and does not add a share that would pass 100%', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/funding-application/co-borrower-validation', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: false, message: 'Invalid', errors: { ownership: 'Only 0% is left after the owner and the other co-borrowers.' } }, { status: 422 })
      })
    )
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<QueryClientProvider client={createTestQueryClient()}><Harness onSubmit={onSubmit} otherOwnershipTotal={100} /></QueryClientProvider>)

    await user.click(screen.getByRole('button', { name: /Add Co-Borrower/i, hidden: true }))

    await waitFor(() => expect(receivedBody).not.toBeNull())
    expect(receivedBody).toMatchObject({ ownership: '50', other_ownership_total: 100 })
    expect(await screen.findByText('Only 0% is left after the owner and the other co-borrowers.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
