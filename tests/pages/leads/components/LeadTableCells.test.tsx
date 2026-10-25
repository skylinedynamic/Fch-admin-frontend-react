import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  LeadContactInfoCell,
  LeadNameCell,
  LeadPartnerCell,
  LeadStatusCell,
} from '../../../../src/pages/leads/components/LeadTableCells'

/**
 * The Leads table's stacked cells: every value shows, a missing one as a
 * muted dash or not at all. Defect (BUG-003, OP-LEAD-04): a missing value
 * showed the word "Null", and the string "null" a cleared field carries was
 * shown as text.
 */
describe('LeadTableCells', () => {
  it('stacks the company under the contact', () => {
    const { container } = render(<LeadNameCell lead={{ contact_person: 'Lee Lead', company_name: 'Lead Co' }} />)

    expect(container).toHaveTextContent('Lee LeadLead Co')
  })

  it('shows a dash for a lead with no contact, and no empty company line', () => {
    const { container } = render(<LeadNameCell lead={{ contact_person: '', company_name: '  ' }} />)

    expect(container).toHaveTextContent(/^—$/)
  })

  it('stacks the phone under the email, letting a long email wrap only after the @', () => {
    const { container } = render(<LeadContactInfoCell lead={{ email: 'lee-lead@example.test', phone_number: '(555) 123-4567' }} />)

    expect(container).toHaveTextContent('lee-lead@example.test(555) 123-4567')
    // A break is allowed only between "name@" and the domain; neither half
    // breaks inside itself, and the phone stays on one line.
    const email = screen.getByText((_, el) => el?.textContent === 'lee-lead@example.test' && !!el.querySelector(':scope > wbr'))
    const halves = Array.from(email.querySelectorAll('.text-nowrap')).map((h) => h.textContent)
    expect(halves).toEqual(['lee-lead@', 'example.test'])
    expect(email.querySelector('wbr')).not.toBeNull()
    expect(email).not.toHaveClass('text-nowrap')
    expect(screen.getByText('(555) 123-4567')).toHaveClass('text-nowrap')
  })

  it('shows whichever contact detail exists, or a dash for neither', () => {
    const { container, rerender } = render(<LeadContactInfoCell lead={{ email: '', phone_number: '(555) 123-4567' }} />)
    expect(container).toHaveTextContent(/^\(555\) 123-4567$/)

    rerender(<LeadContactInfoCell lead={{ email: '', phone_number: '' }} />)
    expect(container).toHaveTextContent(/^—$/)
  })

  it('shows the partner company over its owner, or the owner alone', () => {
    const { container, rerender } = render(<LeadPartnerCell lead={{ partner: { id: 2, full_name: 'Wil Label', company_name: 'WLP Co' } }} />)
    expect(container).toHaveTextContent('WLP CoWil Label')

    rerender(<LeadPartnerCell lead={{ partner: { id: 2, full_name: 'Wil Label', company_name: null } }} />)
    expect(container).toHaveTextContent(/^Wil Label$/)

    rerender(<LeadPartnerCell lead={{ partner: undefined }} />)
    expect(container).toHaveTextContent(/^—$/)
  })

  it('puts the lead type under the status only when asked', () => {
    const badge = <span className="badge">New Lead</span>
    const { container, rerender } = render(<LeadStatusCell badge={badge} leadType="Borrower" showType />)
    expect(container).toHaveTextContent('New LeadBorrower')

    rerender(<LeadStatusCell badge={badge} leadType="Borrower" showType={false} />)
    expect(container).toHaveTextContent(/^New Lead$/)
  })
})

describe('LeadTableCells - "null" text from the API', () => {
  it('treats the strings "null" and "undefined" as empty', () => {
    const { container, rerender } = render(<LeadContactInfoCell lead={{ email: 'null', phone_number: 'undefined' }} />)
    expect(container).toHaveTextContent(/^—$/)

    rerender(<LeadNameCell lead={{ contact_person: 'NULL', company_name: 'null' }} />)
    expect(container).toHaveTextContent(/^—$/)
  })
})
