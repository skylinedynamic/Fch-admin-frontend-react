import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import SettingsForm from '../../../src/pages/settings/components/SettingsForm'

afterEach(() => server.resetHandlers())

describe('Settings menu - Email Configuration', () => {
  it('opens the mail configuration with its fallback note', async () => {
    useAuthStore.setState({
      token: 't',
      user: { id: 1, name: 'Pat Partner', permissions: ['update email configuration settings'], partner_id: 2, is_host: 0 },
      userSubscription: null,
    } as never)
    server.use(
      http.get('*/common/mail-configurations', () =>
        HttpResponse.json({
          status: true,
          data: {
            configurations: [],
            providers: [{ value: 'smtp', label: 'SMTP', fields: [{ key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, secret: false, options: [] }] }],
            uses_own_configuration: false,
            fallback: { is_configured: true, is_verified: true },
            can_manage_fallback: false,
          },
        })
      )
    )

    renderWithProviders(<SettingsForm fetching={false} activeSection="email_configuration" setActiveSection={vi.fn()} />)

    expect(await screen.findByText(
      'Until the mail configuration is verified, all mail will be sent using the fallback mail configuration.'
    )).toBeInTheDocument()
  })
})
