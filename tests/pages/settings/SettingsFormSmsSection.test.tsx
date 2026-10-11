import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import SettingsForm from '../../../src/pages/settings/components/SettingsForm'
import { SMS_CONFIGURATION_PERMISSION } from '../../../src/config/smsConfiguration'

function signInWith(permissions: string[]) {
  useAuthStore.setState({
    token: 't',
    user: { id: 1, name: 'Pat Partner', permissions, partner_id: 2, is_host: 0 },
    userSubscription: null,
  } as never)
}

function renderSettings() {
  server.use(
    http.get('*/common/sms-configuration', () =>
      HttpResponse.json({ status: true, data: { configuration: null, options: { countries: [] } } })
    ),
    http.get('*/common/email-configurations', () => HttpResponse.json({ status: true, data: [] }))
  )

  return renderWithProviders(
    <SettingsForm fetching={false} activeSection="sms_configuration" setActiveSection={vi.fn()} />
  )
}

afterEach(() => server.resetHandlers())

describe('Settings menu - SMS Configuration', () => {
  it('is listed right after Email Configuration for a user with the permission', () => {
    signInWith(['update email configuration settings', SMS_CONFIGURATION_PERMISSION])

    renderSettings()

    const labels = screen.getAllByRole('button').map((b) => b.textContent?.trim())
    const email = labels.indexOf('Email Configuration')
    expect(email).toBeGreaterThan(-1)
    expect(labels[email + 1]).toBe('SMS Configuration')
  })

  it('is hidden without the permission', () => {
    signInWith(['update email configuration settings'])

    renderSettings()

    expect(screen.queryByRole('button', { name: 'SMS Configuration' })).not.toBeInTheDocument()
  })
})
