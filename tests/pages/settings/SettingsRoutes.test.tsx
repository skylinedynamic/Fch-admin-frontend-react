import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes, useLocation } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import Settings from '../../../src/pages/settings/Settings'
import { settingsPath } from '../../../src/config/settingsSections'

/**
 * Each Settings menu item is its own route (/settings/branding,
 * /settings/email-configuration, ...), so a section can be linked to,
 * bookmarked and reached with the back button.
 */
function Where() {
  const location = useLocation()
  return <output aria-label="location">{location.pathname}</output>
}

const renderAt = (path: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/:section" element={<Settings />} />
      </Routes>
      <Where />
    </>,
    { route: path }
  )

const location = () => screen.getByLabelText('location').textContent

const menuItem = (name: string) =>
  screen.getAllByRole('button', { name: new RegExp(name) }).find((b) => b.classList.contains('list-group-item'))!

beforeEach(() => {
  useAuthStore.setState({
    token: 't',
    user: {
      id: 1,
      name: 'Pat Partner',
      partner_id: 2,
      is_host: 0,
      permissions: ['update payment settings', 'update email configuration settings', 'update branding settings'],
    },
    userSubscription: null,
  } as never)
  // The section forms load their own settings; their content is not what
  // these tests are about.
  server.use(
    http.get('*/common/mail-configurations', () =>
      HttpResponse.json({
        status: true,
        data: {
          configurations: [], providers: [], uses_own_configuration: false,
          fallback: { is_configured: true, is_verified: true, from_address: 'noreply@fch.test' },
          can_manage_fallback: false,
        },
      })
    ),
    http.all('*', () => HttpResponse.json({ status: true, data: [] })),
  )
})

afterEach(() => server.resetHandlers())

describe('Settings routes', () => {
  it('builds each section a path of its own', () => {
    expect(settingsPath('email_configuration')).toBe('/settings/email-configuration')
    expect(settingsPath('branding')).toBe('/settings/branding')
    expect(settingsPath('test_mail')).toBe('/settings/test-mail')
    expect(settingsPath('payment')).toBe('/settings/payment-integration')
  })

  it('opens the section the path names', async () => {
    renderAt('/settings/branding')

    await waitFor(() => expect(menuItem('Branding')).toHaveClass('active'))
    expect(menuItem('Payment Integration')).not.toHaveClass('active')
    expect(location()).toBe('/settings/branding')
  })

  it('goes to the section a menu item is clicked for', async () => {
    const user = userEvent.setup()
    renderAt('/settings/payment-integration')

    await user.click(menuItem('Email Configuration'))

    await waitFor(() => expect(location()).toBe('/settings/email-configuration'))
    expect(menuItem('Email Configuration')).toHaveClass('active')
  })

  it('opens the first available section for /settings itself', async () => {
    renderAt('/settings')

    await waitFor(() => expect(location()).toBe('/settings/payment-integration'))
  })

  it('opens the first available section for a path it does not know', async () => {
    renderAt('/settings/nope')

    await waitFor(() => expect(location()).toBe('/settings/payment-integration'))
  })

  it('names the section in the breadcrumb', async () => {
    renderAt('/settings/email-configuration')

    expect(await screen.findByRole('listitem', { current: 'page' })).toHaveTextContent('Email Configuration')
  })
})
