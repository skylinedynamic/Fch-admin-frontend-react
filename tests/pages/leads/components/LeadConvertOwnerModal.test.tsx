import { describe, expect, it, vi } from 'vitest'
// Bootstrap's real Modal fires transition callbacks after unmount and throws
// against a ref that is gone; a synchronous fake (as in
// EditConfirmationModal.test.tsx) avoids depending on transition events.
vi.mock('bootstrap/js/dist/modal', () => {
  class FakeModal {
    private el: HTMLElement
    constructor(el: HTMLElement) {
      this.el = el
    }
    show() {
      this.el.classList.add('show')
      this.el.removeAttribute('aria-hidden')
    }
    hide() {
      this.el.classList.remove('show')
      this.el.setAttribute('aria-hidden', 'true')
    }
    dispose() {}
  }
  return { default: FakeModal }
})

import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import LeadConvertOwnerModal from '../../../../src/pages/leads/components/LeadConvertOwnerModal'

const LEAD = {
  contact_person: 'Lee Lead',
  company_name: 'Lead Co 7',
  email: 'lee@example.test',
  phone_number: '(555) 123-4567',
  convert_on_behalf_of: { id: 2, company_name: 'WLP Co' },
}

describe('LeadConvertOwnerModal', () => {
  const renderModal = (props: Partial<React.ComponentProps<typeof LeadConvertOwnerModal>> = {}) => {
    const onContinue = vi.fn()
    const onHide = vi.fn()
    render(<LeadConvertOwnerModal show lead={LEAD} onContinue={onContinue} onHide={onHide} {...props} />)
    return { onContinue, onHide }
  }

  it('shows the lead\'s details and the partner that owns it', () => {
    renderModal()

    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['Lead', 'Company', 'Email', 'Phone', 'Lead Partner'])
    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual(['Lee Lead', 'Lead Co 7', 'lee@example.test', '(555) 123-4567', 'WLP Co'])
  })

  it('alerts the host that it is the partner\'s lead, converted on that partner\'s behalf', () => {
    renderModal()

    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('alert-warning')
    expect(alert).toHaveTextContent('This lead belongs to WLP Co. You are converting it to a borrower on behalf of WLP Co - the borrower will belong to WLP Co, not to your company.')
  })

  it('leads the alert with a round warning icon', () => {
    renderModal()

    const badge = screen.getByRole('alert').querySelector('.avatar-title')
    expect(badge).toHaveClass('rounded-circle', 'bg-warning-subtle', 'text-warning')
    expect(badge?.querySelector('i')).toHaveClass('ri-error-warning-line')
    expect(screen.getByRole('alert').firstElementChild).toContainElement(badge as HTMLElement)
  })

  it('is a little wider than a default modal', () => {
    renderModal()

    expect(document.querySelector('.modal-dialog')).toHaveStyle({ maxWidth: '600px' })
    expect(document.querySelector('.modal-dialog')).not.toHaveClass('modal-lg')
  })

  it('offers no choice of owner', () => {
    renderModal()

    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  it('shows a dash for a missing detail and names an unnamed partner generically', () => {
    renderModal({ lead: { ...LEAD, company_name: '', phone_number: null, convert_on_behalf_of: { id: 2, company_name: null } } })

    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual(['Lee Lead', '-', 'lee@example.test', '-', 'the lead partner'])
    expect(screen.getByRole('alert')).toHaveTextContent('This lead belongs to the lead partner.')
  })

  it('continues to the conversion', async () => {
    const { onContinue, onHide } = renderModal()

    await userEvent.click(screen.getByRole('button', { name: /Continue/ }))

    expect(onContinue).toHaveBeenCalledOnce()
    expect(onHide).not.toHaveBeenCalled()
  })

  it('closes without converting on Cancel', async () => {
    const { onContinue, onHide } = renderModal()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onHide).toHaveBeenCalledOnce()
    expect(onContinue).not.toHaveBeenCalled()
  })
})
