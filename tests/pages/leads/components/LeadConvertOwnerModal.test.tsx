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
import { LEAD_CONVERT_AS } from '../../../../src/modules/leads/types'

const OPTIONS = [
  { value: LEAD_CONVERT_AS.HOST, company_name: 'Host Co' },
  { value: LEAD_CONVERT_AS.LEAD_PARTNER, company_name: 'WLP Co' },
]

const LEAD = { contact_person: 'Lee Lead', company_name: 'Lead Co 7' }

describe('LeadConvertOwnerModal', () => {
  const renderModal = (props: Partial<React.ComponentProps<typeof LeadConvertOwnerModal>> = {}) => {
    const onSelect = vi.fn()
    const onHide = vi.fn()
    render(<LeadConvertOwnerModal show options={OPTIONS} lead={LEAD} onSelect={onSelect} onHide={onHide} {...props} />)
    return { onSelect, onHide }
  }

  it('names the lead and whose it is', () => {
    renderModal()

    expect(screen.getByText(/^Lead:/)).toHaveTextContent('Lead: Lee Lead · Lead Co 7')
    expect(screen.getByText(/^Owned by:/)).toHaveTextContent('Owned by: WLP Co')
  })

  it('lists the lead owner first, already selected, then the host', () => {
    renderModal()

    const rows = screen.getAllByRole('radio')
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual(['WLP Co, Lead owner', 'Host Co, Host partner'])
    expect(rows[0]).toBeChecked()
    expect(rows[1]).not.toBeChecked()
  })

  it('continues as the lead owner without another click', async () => {
    const { onSelect } = renderModal()

    await userEvent.click(screen.getByRole('button', { name: /Continue/ }))

    expect(onSelect).toHaveBeenCalledWith('lead_partner')
  })

  it('continues as the host once the host is picked', async () => {
    const { onSelect } = renderModal()

    await userEvent.click(screen.getByRole('radio', { name: /Host Co/ }))
    await userEvent.click(screen.getByRole('button', { name: /Continue/ }))

    expect(onSelect).toHaveBeenCalledWith('host')
  })

  it('falls back to the role when a partner has no company name', () => {
    renderModal({ options: [{ value: LEAD_CONVERT_AS.HOST, company_name: null }, { value: LEAD_CONVERT_AS.LEAD_PARTNER, company_name: '' }] })

    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(['Lead Owner Partner, Lead owner', 'Host Partner, Host partner'])
  })

  it('selects the lead owner again each time it opens', async () => {
    const onSelect = vi.fn()
    const { rerender } = render(<LeadConvertOwnerModal show options={OPTIONS} lead={LEAD} onSelect={onSelect} onHide={vi.fn()} />)
    await userEvent.click(screen.getByRole('radio', { name: /Host Co/ }))

    rerender(<LeadConvertOwnerModal show={false} options={OPTIONS} lead={LEAD} onSelect={onSelect} onHide={vi.fn()} />)
    rerender(<LeadConvertOwnerModal show options={OPTIONS} lead={LEAD} onSelect={onSelect} onHide={vi.fn()} />)

    expect(screen.getByRole('radio', { name: /WLP Co/ })).toBeChecked()
  })

  it('closes without a choice on Cancel', async () => {
    const { onSelect, onHide } = renderModal()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onHide).toHaveBeenCalledOnce()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
