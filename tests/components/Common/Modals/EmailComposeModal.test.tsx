import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { setAuthState, clearAuthState } from '../../../../src/store/auth/authStore'
import { server } from '../../../mocks/server'

// Summernote crashes under jsdom (no <canvas>); the editor itself is not under test.
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: EmailComposeModal } = await import('../../../../src/components/Common/Modals/EmailComposeModal')
const { EMAIL_COMPOSE_TEXT } = await import('../../../../src/config/emailComposeConfig')
const { ACTIVITY_EMAIL_SENDER_HOST, ACTIVITY_EMAIL_SENDER_PARTNER } = await import('../../../../src/modules/activity-log/constants')

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

  // The To box is a Choices.js tag input; jsdom does not load the library, so a
  // small stand-in keeps the tags it is given.
  describe('the To field on open', () => {
    class FakeChoices {
      static last: FakeChoices | null = null
      values: string[] = []
      constructor() { FakeChoices.last = this }
      setValue(items: string[]) { this.values.push(...items) }
      removeActiveItems() { this.values = [] }
      getValue() { return this.values }
      destroy() { }
    }

    afterEach(() => {
      delete (window as any).Choices
      FakeChoices.last = null
    })

    it("has the client's email selected when a host opens New Email on a client", async () => {
      ; (window as any).Choices = FakeChoices
      let body: FormData | null = null
      server.use(
        http.post('*/common/activity-logs', async ({ request }) => {
          body = await request.formData()
          return HttpResponse.json({ status: true, message: 'Email sent', data: { id: 1 } }, { status: 201 })
        })
      )
      renderWithProviders(<EmailComposeModal entityId={165} entityType="Client" lead={undefined} />)
      openAsContext({ entityId: 165, entityType: 'Client', isHost: true, borrowerEmail: 'client@example.test' })

      await waitFor(() => expect(FakeChoices.last?.values).toEqual(['client@example.test']))

      fireEvent.change(document.getElementById('emailSubject')!, { target: { name: 'subject', value: 'Hello' } })
      fireEvent.click(screen.getByRole('button', { name: /send email/i, hidden: true }))
      await waitFor(() => expect(body).not.toBeNull())
      expect(body!.get('to_emails')).toBe('client@example.test')
    })

    it('is styled like Subject: the To box carries the class that matches it', () => {
      renderWithProviders(<EmailComposeModal entityId={165} entityType="Client" lead={undefined} />)

      expect(document.querySelector('#emailComposeModal .acm-tags')).toHaveClass('acm-tags--like-input')
    })
  })

  // Above To, for the host only: who the email goes out from. By default the
  // client's partner's mail settings; a switch sends it from the host's own.
  // One without settings of its own shows (and sends from) the fallback.
  describe('the From section (host only)', () => {
    const partner = { partner_id: 7, name: 'Acme Capital', address: 'mail@acme.test', uses_fallback: false }
    const host = { partner_id: 1, name: 'Four Corner Funding', address: 'noreply@fcf.test', uses_fallback: false }
    const senders = (data: unknown) => {
      const seen: string[] = []
      server.use(http.get('*/common/activity-logs/email-sender', ({ request }) => {
        seen.push(request.url)
        return HttpResponse.json({ status: true, message: '', data })
      }))
      return seen
    }
    const openOnClient = (ctx: Record<string, unknown> = {}) => {
      renderWithProviders(<EmailComposeModal entityId={165} entityType="Client" lead={undefined} />)
      openAsContext({ entityId: 165, entityType: 'Client', isHost: true, partnerId: 7, borrowerEmail: 'client@example.test', ...ctx })
    }

    it("shows the client's partner's address by default, in a warning box above To", async () => {
      const seen = senders({ default: 'partner', options: { partner, host } })
      openOnClient()

      const from = await screen.findByTestId('email-from')
      expect(from).toHaveClass('acm-from')
      expect(from).toHaveTextContent(EMAIL_COMPOSE_TEXT.fromLabel)
      expect(await screen.findByText('mail@acme.test')).toBeInTheDocument()
      expect(screen.getByText('Acme Capital')).toBeInTheDocument()
      expect(new URL(seen[0]).searchParams.get('partner_id')).toBe('7')

      const switchBox = screen.getByRole('switch', { name: EMAIL_COMPOSE_TEXT.useHostSwitch, hidden: true })
      expect(switchBox).not.toBeChecked()

      const to = screen.getByText('To', { exact: false, selector: 'label' })
      expect(from.compareDocumentPosition(to) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it("the switch shows the host's address, and the email is sent from the host", async () => {
      senders({ default: 'partner', options: { partner, host } })
      let body: FormData | null = null
      server.use(http.post('*/common/activity-logs', async ({ request }) => {
        body = await request.formData()
        return HttpResponse.json({ status: true, message: 'Email sent', data: { id: 1 } }, { status: 201 })
      }))
      openOnClient()

      fireEvent.click(await screen.findByRole('switch', { name: EMAIL_COMPOSE_TEXT.useHostSwitch, hidden: true }))
      expect(await screen.findByText('noreply@fcf.test')).toBeInTheDocument()
      expect(screen.queryByText('mail@acme.test')).not.toBeInTheDocument()

      fireEvent.change(document.querySelector('#emailComposeModal input[name="to_emails"]')!, { target: { value: 'client@example.test' } })
      fireEvent.change(document.getElementById('emailSubject')!, { target: { name: 'subject', value: 'Hi' } })
      fireEvent.click(screen.getByRole('button', { name: /send email/i, hidden: true }))
      await waitFor(() => expect(body).not.toBeNull())
      expect(body!.get('send_from')).toBe(ACTIVITY_EMAIL_SENDER_HOST)
    })

    it("by default the email is sent from the client's partner", async () => {
      senders({ default: 'partner', options: { partner, host } })
      let body: FormData | null = null
      server.use(http.post('*/common/activity-logs', async ({ request }) => {
        body = await request.formData()
        return HttpResponse.json({ status: true, message: 'Email sent', data: { id: 1 } }, { status: 201 })
      }))
      openOnClient()
      await screen.findByText('mail@acme.test')

      fireEvent.change(document.querySelector('#emailComposeModal input[name="to_emails"]')!, { target: { value: 'client@example.test' } })
      fireEvent.change(document.getElementById('emailSubject')!, { target: { name: 'subject', value: 'Hi' } })
      fireEvent.click(screen.getByRole('button', { name: /send email/i, hidden: true }))
      await waitFor(() => expect(body).not.toBeNull())
      expect(body!.get('send_from')).toBe(ACTIVITY_EMAIL_SENDER_PARTNER)
    })

    it('says when the address is the fallback, because there is no mail setting of its own', async () => {
      senders({ default: 'partner', options: { partner: { ...partner, address: 'fallback@fcf.test', uses_fallback: true }, host } })
      openOnClient()

      expect(await screen.findByText('fallback@fcf.test')).toBeInTheDocument()
      expect(screen.getByText(EMAIL_COMPOSE_TEXT.fallbackNote)).toBeInTheDocument()
    })

    it('says so when nothing is set up to send from', async () => {
      senders({ default: 'partner', options: { partner: { ...partner, address: null, uses_fallback: true }, host } })
      openOnClient()

      expect(await screen.findByText(EMAIL_COMPOSE_TEXT.noSender)).toBeInTheDocument()
    })

    it("a host record has no switch: it goes out from the host", async () => {
      senders({ default: 'host', options: { partner: null, host } })
      openOnClient({ partnerId: 1 })

      expect(await screen.findByText('noreply@fcf.test')).toBeInTheDocument()
      expect(screen.queryByRole('switch', { name: EMAIL_COMPOSE_TEXT.useHostSwitch, hidden: true })).not.toBeInTheDocument()
    })

    it('a partner does not see it, and nothing is asked', async () => {
      const seen = senders({ default: 'partner', options: { partner, host } })
      openOnClient({ isHost: false })

      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(screen.queryByTestId('email-from')).not.toBeInTheDocument()
      expect(seen).toHaveLength(0)
    })

    // Every place New Email opens, for the host - pages whose context does not
    // say isHost (Lead, Partner, Contact, Employee) read it from the signed-in user.
    describe('everywhere New Email opens', () => {
      afterEach(() => clearAuthState())

      it("a host on a lead sees it, with the lead's partner and the switch", async () => {
        setAuthState({ token: 't', user: { id: 1, is_host: 1 } as never })
        const seen = senders({ default: 'partner', options: { partner, host } })
        renderWithProviders(<EmailComposeModal entityId={33} entityType="Lead" lead={undefined} />)
        openAsContext({ entityId: 33, entityType: 'Lead', partnerId: 7 })

        expect(await screen.findByText('mail@acme.test')).toBeInTheDocument()
        expect(new URL(seen[0]).searchParams.get('partner_id')).toBe('7')
        expect(screen.getByRole('switch', { name: EMAIL_COMPOSE_TEXT.useHostSwitch, hidden: true })).toBeInTheDocument()
      })

      it("a host on a partner's page: that partner is the record's partner", async () => {
        setAuthState({ token: 't', user: { id: 1, is_host: 1 } as never })
        const seen = senders({ default: 'partner', options: { partner, host } })
        renderWithProviders(<EmailComposeModal entityId={7} entityType="Partner" lead={undefined} />)
        openAsContext({ entityId: 7, entityType: 'Partner', partnerEmail: 'owner@acme.test' })

        expect(await screen.findByText('mail@acme.test')).toBeInTheDocument()
        expect(new URL(seen[0]).searchParams.get('partner_id')).toBe('7')
      })

      it('a host on a page with no partner (an employee): the host only, no switch', async () => {
        setAuthState({ token: 't', user: { id: 1, is_host: 1 } as never })
        const seen = senders({ default: 'host', options: { partner: null, host } })
        renderWithProviders(<EmailComposeModal entityId={undefined} entityType={undefined} lead={undefined} />)
        openAsContext({})

        expect(await screen.findByText('noreply@fcf.test')).toBeInTheDocument()
        expect(new URL(seen[0]).searchParams.has('partner_id')).toBe(false)
        expect(screen.queryByRole('switch', { name: EMAIL_COMPOSE_TEXT.useHostSwitch, hidden: true })).not.toBeInTheDocument()
      })

      it('a partner user signed in does not see it on a lead either', async () => {
        setAuthState({ token: 't', user: { id: 9, is_host: 0 } as never })
        const seen = senders({ default: 'partner', options: { partner, host } })
        renderWithProviders(<EmailComposeModal entityId={33} entityType="Lead" lead={undefined} />)
        openAsContext({ entityId: 33, entityType: 'Lead', partnerId: 7 })

        await new Promise((resolve) => setTimeout(resolve, 150))
        expect(screen.queryByTestId('email-from')).not.toBeInTheDocument()
        expect(seen).toHaveLength(0)
      })
    })

    it("the switch is New Event's switch: the same control, label before it", async () => {
      senders({ default: 'partner', options: { partner, host } })
      openOnClient()

      const toggle = await screen.findByRole('switch', { name: EMAIL_COMPOSE_TEXT.useHostSwitch, hidden: true })
      expect(toggle.closest('.form-switch')).toHaveClass('acm-option__switch')
    })
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
