import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { useAuthStore } from '../../../../src/store/auth'
import { PARTNER_TYPES } from '../../../../src/config/partnerTypeOptions'
import LeadConvertModal from '../../../../src/pages/leads/components/LeadConvertModal'

vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))

/**
 * BUG-059: converting a lead, the partner read "Charged automatically on
 * Partner's card", but the borrower fee is not charged at conversion: it is
 * charged by the billing run, or the partner pays it from Invoices. The
 * dialog now says both.
 */
const PLAN = { id: 1, name: 'One Time', enrollment_type: 'One Time Payment', total_amount: 2497, platform_fee: 0, total_installments_count: 1 }

afterEach(() => server.resetHandlers())

describe('Leads › Convert to Borrower, the partner fee', () => {
  it('tells the partner the fee is auto-charged or can be paid from Invoices', async () => {
    useAuthStore.setState({ user: { id: 7, entity_type: 'Partner', is_host: 0, partner_type: PARTNER_TYPES.WHITE_LABEL, permissions: [] } } as never)
    server.use(
      http.get('*/common/subscriptions/partner-borrower-fee', () => HttpResponse.json({ status: true, data: { borrower_fee_amount: 800 } })),
      http.get('*/common/borrower-plans', () => HttpResponse.json({ status: true, data: [PLAN] })),
      http.all('*', () => HttpResponse.json({ status: true, data: [] }))
    )

    renderWithProviders(
      <LeadConvertModal show onHide={() => {}} onConfirm={() => {}} lead={{ id: 5, contact_person: 'Lee Lead' }} isHost={false} loading={false} onFieldChange={() => {}} />
    )

    expect(await screen.findByText("You'll be charged automatically when the client pays their enrollment, or you can pay it manually from Invoices.")).toBeInTheDocument()
    const note = screen.getByText(/two separate invoices are created/i)
    expect(note).toHaveTextContent("$800.00 will be charged to you automatically when the client pays, or you can pay it manually from Invoices.")
    expect(screen.queryByText(/charged automatically on partner's card/i)).not.toBeInTheDocument()
  })
})
