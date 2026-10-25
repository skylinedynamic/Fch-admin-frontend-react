import { describe, expect, it, vi } from 'vitest'

// Bootstrap's real Modal fires its show-transition callback after the test has
// unmounted and throws against an element that is gone - an unhandled error
// that fails the run. A synchronous fake (as in EditConfirmationModal.test.tsx)
// avoids depending on transition events.
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

import { render, screen } from '@testing-library/react'
import DeleteBlockedModal from '../../../../src/components/Common/Modals/DeleteBlockedModal'

/**
 * The note under a blocked delete - "Unselect this lead to delete the other
 * selected leads." - lays out as an icon beside its text, so a wrapped line
 * lines up under the text, never under the icon.
 */
describe('DeleteBlockedModal › note', () => {
  const renderModal = (note?: string) =>
    render(<DeleteBlockedModal show title="Lead Cannot Be Deleted" message="Cara has already been converted and cannot be deleted." note={note} onClose={vi.fn()} />)

  it('sets the icon beside the text, each its own block', () => {
    renderModal('Unselect this lead to delete the other selected leads.')

    const note = screen.getByTestId('blocked-others')
    expect(note).toHaveClass('d-flex', 'align-items-start')
    const [icon, text] = Array.from(note.children)
    expect(icon).toHaveClass('ri-information-line', 'flex-shrink-0')
    expect(text.tagName).toBe('SPAN')
    expect(text).toHaveTextContent('Unselect this lead to delete the other selected leads.')
    expect(note.childNodes).toHaveLength(2)
  })

  it('is an info note', () => {
    renderModal('Unselect this lead to delete the other selected leads.')

    expect(screen.getByTestId('blocked-others')).toHaveClass('alert', 'alert-info')
    expect(screen.getByTestId('blocked-others')).toHaveAttribute('role', 'note')
  })

  it('is left out when there is nothing to add', () => {
    renderModal()

    expect(screen.queryByTestId('blocked-others')).not.toBeInTheDocument()
  })
})

/**
 * A danger tone - used by Credit Accounts - puts the reason in a red alert
 * with a danger icon; without it the dialog stays as the other lists show it.
 */
describe('DeleteBlockedModal › tone', () => {
  const message = 'Borrowers have applied for Ink Cash, so it cannot be deleted and was not selected.'

  it('danger: the reason is a danger alert, under a danger icon', () => {
    render(<DeleteBlockedModal show tone="danger" title="Card Cannot Be Deleted" message={message} onClose={vi.fn()} />)

    const alert = screen.getByTestId('blocked-message')
    expect(alert).toHaveClass('alert', 'alert-danger')
    expect(alert).toHaveAttribute('role', 'alert')
    expect(alert).toHaveTextContent(message)
    expect(screen.getByTestId('blocked-icon')).toHaveClass('bg-danger-subtle', 'text-danger')
  })

  it('default: unchanged - a warning icon and the reason as plain text', () => {
    render(<DeleteBlockedModal show title="Lead Cannot Be Deleted" message="Cara has already been converted." onClose={vi.fn()} />)

    expect(screen.getByTestId('blocked-message')).not.toHaveClass('alert-danger')
    expect(screen.getByTestId('blocked-icon')).toHaveClass('bg-warning-subtle', 'text-warning')
  })
})
