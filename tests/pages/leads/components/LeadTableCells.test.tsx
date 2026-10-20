import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  LeadContactInfoCell,
  LeadNameCell,
  LeadPartnerCell,
  LeadStatusCell,
} from '../../../../src/pages/leads/components/LeadTableCells'

/** The Leads table's stacked cells: every value shows, a missing one as "Null" or not at all. */
describe('LeadTableCells', () => {
  it('stacks the company under the contact', () => {
    const { container } = render(<LeadNameCell lead={{ contact_person: 'Lee Lead', company_name: 'Lead Co' }} />)

    expect(container).toHaveTextContent('Lee LeadLead Co')
  })

  it('shows Null for a lead with no contact, and no empty company line', () => {
    const { container } = render(<LeadNameCell lead={{ contact_person: '', company_name: '  ' }} />)

    expect(container).toHaveTextContent(/^Null$/)
  })

  it('stacks the phone under the email, keeping the email on one line', () => {
    const { container } = render(<LeadContactInfoCell lead={{ email: 'lee-lead@example.test', phone_number: '(555) 123-4567' }} />)

    expect(container).toHaveTextContent('lee-lead@example.test(555) 123-4567')
    expect(screen.getByText('lee-lead@example.test')).toHaveClass('text-nowrap')
  })

  it('shows whichever contact detail exists, or Null for neither', () => {
    const { container, rerender } = render(<LeadContactInfoCell lead={{ email: '', phone_number: '(555) 123-4567' }} />)
    expect(container).toHaveTextContent(/^\(555\) 123-4567$/)

    rerender(<LeadContactInfoCell lead={{ email: '', phone_number: '' }} />)
    expect(container).toHaveTextContent(/^Null$/)
  })

  it('shows the partner company over its owner, or the owner alone', () => {
    const { container, rerender } = render(<LeadPartnerCell lead={{ partner: { id: 2, full_name: 'Wil Label', company_name: 'WLP Co' } }} />)
    expect(container).toHaveTextContent('WLP CoWil Label')

    rerender(<LeadPartnerCell lead={{ partner: { id: 2, full_name: 'Wil Label', company_name: null } }} />)
    expect(container).toHaveTextContent(/^Wil Label$/)

    rerender(<LeadPartnerCell lead={{ partner: undefined }} />)
    expect(container).toHaveTextContent(/^Null$/)
  })

  it('puts the lead type under the status only when asked', () => {
    const badge = <span className="badge">New Lead</span>
    const { container, rerender } = render(<LeadStatusCell badge={badge} leadType="Borrower" showType />)
    expect(container).toHaveTextContent('New LeadBorrower')

    rerender(<LeadStatusCell badge={badge} leadType="Borrower" showType={false} />)
    expect(container).toHaveTextContent(/^New Lead$/)
  })
})
