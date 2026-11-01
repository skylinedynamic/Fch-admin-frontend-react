import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import MailNotVerifiedBanner from '../../../src/components/Layout/MailNotVerifiedBanner'

afterEach(() => server.resetHandlers())

const signIn = (permissions: string[]) =>
  useAuthStore.setState({
    token: 't',
    user: { id: 1, name: 'Pat', permissions, partner_id: 2, is_host: 0 },
    userSubscription: null,
  } as never)

const serve = (usesOwn: boolean, fallback: { is_verified: boolean; from_address: string | null }) =>
  server.use(
    http.get('*/common/mail-configurations', () =>
      HttpResponse.json({
        status: true,
        data: {
          configurations: [],
          providers: [],
          uses_own_configuration: usesOwn,
          fallback: { is_configured: true, ...fallback },
          can_manage_fallback: false,
        },
      })
    )
  )

describe('MailNotVerifiedBanner', () => {
  it('says mail goes out from the fallback address until the partner verifies its own', async () => {
    signIn(['update email configuration settings'])
    serve(false, { is_verified: true, from_address: 'noreply@fch.test' })

    renderWithProviders(<MailNotVerifiedBanner />)

    const alert = await screen.findByRole('alert')
    // The theme's danger alert.
    expect(alert).toHaveClass('alert', 'alert-danger', 'mail-not-verified-banner')
    // The icon carries the breathing animation.
    expect(alert.querySelector('.mail-not-verified-banner__icon')).not.toBeNull()
    expect(alert).toHaveTextContent('Mail is not verified yet. Until it is verified, all mail will be sent using noreply@fch.test.')
    expect(screen.getByRole('link', { name: /verify mail/i })).toHaveAttribute('href', '/settings/email-configuration')
  })

  it('says no mail is sent when the fallback cannot send either', async () => {
    signIn(['update email configuration settings'])
    serve(false, { is_verified: false, from_address: null })

    renderWithProviders(<MailNotVerifiedBanner />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/no mail can be sent until/i)
  })

  it('is hidden once the partner sends with its own verified mail', async () => {
    signIn(['update email configuration settings'])
    serve(true, { is_verified: true, from_address: 'noreply@fch.test' })

    renderWithProviders(<MailNotVerifiedBanner />)

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  // The banner sits in the layout on every page: a reply without the expected
  // shape used to throw ("reading 'from_address'") and blank the whole app.
  it.each([
    ['an empty list', []],
    ['no fallback', { configurations: [], uses_own_configuration: false }],
    ['no data at all', null],
  ])('an unexpected reply (%s) hides the banner and leaves the page working', async (_name, data) => {
    signIn(['update email configuration settings'])
    let answered = false
    server.use(
      http.get('*/common/mail-configurations', () => {
        answered = true
        return HttpResponse.json({ status: true, data })
      })
    )

    renderWithProviders(
      <>
        <MailNotVerifiedBanner />
        <p>Page content</p>
      </>
    )

    await waitFor(() => expect(answered).toBe(true))
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.getByText('Page content')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('is hidden from users who cannot manage email configuration', async () => {
    signIn([])
    serve(false, { is_verified: true, from_address: 'noreply@fch.test' })

    renderWithProviders(<MailNotVerifiedBanner />)

    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
