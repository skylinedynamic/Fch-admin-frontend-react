import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { useAuthStore } from '../../../../src/store/auth'
import { PARTNER_TYPES } from '../../../../src/config/partnerTypeOptions'
import ClientInfoSection from '../../../../src/pages/clients/components/ClientInfoSection'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))
vi.mock('../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

/**
 * BUG-140: on a paid client, Enrollment Details showed the Partner Invoice as
 * $800.00 but the note under it said "$0.00 is automatically charged to the
 * Partner". The line read the client's saved borrower fee; the note read the
 * partner's fee, which is only fetched for a new or free-trial client and so
 * stayed 0. Both now show the same amount.
 */
const CLIENT = {
  id: 159, first_name: 'QA-TEST R2', last_name: 'Wanda', email: 'r2@example.test', phone_number: '(555) 234-5678',
  country: 'United States', business_country: 'United States', is_free_trail: 0,
  enrollment_details: {
    enrollment_type: 'One Time Payment',
    payable_amount: 2497,
    payable_amount_formatted: '$2,497.00',
    borrower_fee_amount: 800,
    borrower_fee_amount_formatted: '$800.00',
  },
}

afterEach(() => server.resetHandlers())

describe('Client › Enrollment Details, the partner fee', () => {
  it('says the same partner amount in the note as on the Partner Invoice line', async () => {
    useAuthStore.setState({ user: { id: 7, entity_type: 'Partner', is_host: 0, partner_type: PARTNER_TYPES.WHITE_LABEL, permissions: [] } } as never)
    server.use(
      http.get('*/common/borrowers/159', () => HttpResponse.json({ status: true, data: CLIENT })),
      http.all('*', () => HttpResponse.json({ status: true, data: [] }))
    )

    renderWithProviders(<ClientInfoSection clientId="159" countries={[]} states={[]} cities={[]} />)

    const note = await screen.findByText(/two completely separate invoices are created/i)
    expect(note).toHaveTextContent('$800.00 is automatically charged to the Partner account')
    expect(note).not.toHaveTextContent('$0.00')
    expect(screen.getByText('Partner Invoice:').closest('div')?.parentElement).toHaveTextContent('$800.00')
  })
})
