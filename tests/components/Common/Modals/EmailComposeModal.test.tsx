import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'

// Summernote crashes under jsdom (no <canvas>); the editor itself is not under test.
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: EmailComposeModal } = await import('../../../../src/components/Common/Modals/EmailComposeModal')

// Opened the way ActivitySidebar does: context on window, then Bootstrap's show event.
function openAsContext(ctx: Record<string, unknown>) {
  ; (window as any)._activityEntityContext = ctx
  fireEvent(document.getElementById('emailComposeModal')!, new Event('show.bs.modal', { bubbles: true }))
}

describe('EmailComposeModal (New Email, same design as New Event)', () => {
  afterEach(() => {
    delete (window as any)._activityEntityContext
  })

  it('uses the New Event look: the shared modal class, header icon and field ids', () => {
    renderWithProviders(<EmailComposeModal entityId={1} entityType="Client" lead={undefined} />)

    const modal = document.getElementById('emailComposeModal')!
    expect(modal).toHaveClass('acm')
    expect(modal.querySelector('.acm-header .ri-mail-send-line')).not.toBeNull()
    expect(screen.getByText('New Email')).toBeInTheDocument()
    expect(document.getElementById('emailSubject')).toBeInTheDocument()
    expect(document.getElementById('emailAttachmentBtn')).toHaveTextContent('Add Attachment')
    expect(screen.getByRole('button', { name: /discard/i, hidden: true })).toBeInTheDocument()
  })

  it("offers who to send to as cards on a partner's funding request", async () => {
    renderWithProviders(<EmailComposeModal entityId={9} entityType="Funding Request" lead={undefined} />)
    // The modal re-reads the context a moment after it opens
    openAsContext({ entityId: 9, entityType: 'Funding Request', partnerId: 2, isHost: true, borrowerEmail: 'borrower@example.test' })

    const toPartner = await screen.findByLabelText('Email to Partner')
    const toBorrower = screen.getByLabelText('Email to Borrower')
    expect(toBorrower).toBeChecked()
    expect(toBorrower.closest('label')).toHaveClass('is-checked')

    fireEvent.click(toPartner)
    expect(toPartner).toBeChecked()
    expect(toPartner.closest('label')).toHaveClass('is-checked')
  })

  it('has no recipient cards elsewhere', () => {
    renderWithProviders(<EmailComposeModal entityId={1} entityType="Client" lead={undefined} />)
    openAsContext({ entityId: 1, entityType: 'Client', isHost: true })

    expect(screen.queryByLabelText('Email to Borrower')).not.toBeInTheDocument()
  })

  it('still sends the email as before', async () => {
    let body: FormData | null = null
    server.use(
      http.post('*/common/activity-logs', async ({ request }) => {
        body = await request.formData()
        return HttpResponse.json({ status: true, message: 'Email sent', data: { id: 1 } }, { status: 201 })
      })
    )
    renderWithProviders(<EmailComposeModal entityId={1} entityType="Client" lead={undefined} />)
    openAsContext({ entityId: 1, entityType: 'Client', isHost: true })

    fireEvent.change(document.querySelector('#emailComposeModal input[name="to_emails"]')!, { target: { value: 'client@example.test' } })
    fireEvent.change(document.getElementById('emailSubject')!, { target: { name: 'subject', value: 'Statements' } })
    fireEvent.click(screen.getByRole('button', { name: /send email/i, hidden: true }))

    await waitFor(() => expect(body).not.toBeNull())
    expect(body!.get('log_type')).toBe('email')
    expect(body!.get('to_emails')).toBe('client@example.test')
    expect(body!.get('subject')).toBe('Statements')
  })
})
