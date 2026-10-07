import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import CreditAuthorizationPanel from '../../../../src/pages/applications/credit-profile-requests/components/CreditAuthorizationPanel'
import type { CreditAuthorization } from '../../../../src/modules/credit-profile-request/types'

const auth = (over: Partial<CreditAuthorization>): CreditAuthorization => ({
  id: 1,
  authorization_version: '1.0',
  authorization_url: 'https://example.com/auth',
  citation: 'cite',
  credit_authorization_accepted: true,
  e_consent_accepted: true,
  consented_at: 'Sep 01, 2026 10:00 AM',
  ip_address: '10.0.0.1',
  user_agent: 'Mozilla/5.0',
  isoftpull_transaction_id: 'TXN-123',
  pulled_at: null,
  ...over,
})

describe('Credit Authorization panel', () => {
  it('does not show the iSoftPull transaction id', () => {
    render(<CreditAuthorizationPanel borrowerId={3} rows={[auth({})]} />)

    expect(screen.queryByText(/iSoftPull txn/i)).not.toBeInTheDocument()
    expect(screen.queryByText('TXN-123')).not.toBeInTheDocument()
  })

  it('shows when each authorization was pulled, or that it was not', () => {
    render(
      <CreditAuthorizationPanel
        borrowerId={3}
        rows={[
          auth({ id: 2, pulled_at: 'Sep 15, 2026 08:30 AM' }),
          auth({ id: 1, pulled_at: null }),
        ]}
      />,
    )

    expect(screen.getByRole('columnheader', { name: /pulled/i })).toBeInTheDocument()
    const table = within(screen.getByRole('table'))
    expect(table.getByText('Sep 15, 2026 08:30 AM')).toBeInTheDocument()
    expect(table.getByText(/not pulled yet/i)).toBeInTheDocument()
  })

  it('states the most recent iSoftPull pull, as the API worked it out', () => {
    render(
      <CreditAuthorizationPanel
        borrowerId={3}
        lastPulledAt="Oct 01, 2026 09:00 AM"
        rows={[
          auth({ id: 2, pulled_at: 'Oct 01, 2026 09:00 AM' }),
          // Sorts after "Oct" as text, though it is earlier.
          auth({ id: 1, pulled_at: 'Sep 16, 2026 02:30 AM' }),
        ]}
      />,
    )

    expect(screen.getByText(/last pulled from isoftpull/i)).toHaveTextContent('Oct 01, 2026 09:00 AM')
  })

  it('shows the times exactly as the API sends them, with no UTC label', () => {
    render(
      <CreditAuthorizationPanel
        borrowerId={3}
        rows={[auth({ consented_at: 'Sep 01, 2026 10:00 AM', pulled_at: 'Sep 15, 2026 08:30 AM' })]}
      />,
    )

    expect(screen.queryByText(/UTC/)).not.toBeInTheDocument()
    expect(screen.getByText('Sep 01, 2026 10:00 AM')).toBeInTheDocument()
  })

  it('says nothing has been pulled when no authorization has a pull', () => {
    render(<CreditAuthorizationPanel borrowerId={3} lastPulledAt={null} rows={[auth({ pulled_at: null })]} />)

    expect(screen.getByText(/last pulled from isoftpull/i)).toHaveTextContent(/never/i)
  })
})
