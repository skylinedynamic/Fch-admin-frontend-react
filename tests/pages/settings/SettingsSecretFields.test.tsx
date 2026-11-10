import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import SiteSettings from '../../../src/pages/cms/SiteSettings'
import MicroBiltConfigForm from '../../../src/pages/settings/components/MicroBiltConfigForm'
import CreditProfileConfigForm from '../../../src/pages/settings/components/CreditProfileConfigForm'
import { SAVED_SECRET_PLACEHOLDER, SECRET_DISPLAY_MASK, SETTINGS_SECRET_MASK } from '../../../src/config/appConfig'

/**
 * Defect (BUG-022, OP-CMS-03 / OP-SET-07): secrets were loaded into the page in
 * full - the reCAPTCHA secret as plain text, the MicroBilt client secret (and
 * the Credit Profile OpenAI key) in a password field holding the real value.
 * The API now sends only a mask. MicroBilt and Credit Profile show "Saved -
 * leave blank to keep" and a blank secret keeps the stored one. Site Settings
 * shows the mask itself in the field (it looks saved); clearing it removes the
 * secret.
 */

const secretInput = (container: HTMLElement, name: string) => container.querySelector(`input[name="${name}"]`) as HTMLInputElement

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view site settings', 'update site settings'] })
  allowBackgroundCalls()
})

describe('CMS Site Settings - reCAPTCHA secret', () => {
  const SETTINGS = {
    site_name: 'Four Corner', address: '1 Main St', phone_number: '(555) 010-0100', email: 'hello@example.org',
    map_iframe: '<iframe src="https://maps.example.org"></iframe>', recaptcha_site_key: 'site-key-public',
    recaptcha_secret_key: SETTINGS_SECRET_MASK, social_links: [],
  }

  // The field shows 16 dots, so a saved secret looks saved; the secret itself
  // still never reaches the page. Untouched, the API's own mask goes back and
  // the API keeps the secret.
  it('shows a saved secret as dots and keeps it when left alone', async () => {
    api('get', '/admin/cms/site-settings', { status: true, data: SETTINGS })
    const save = api('post', '/admin/cms/site-settings', { status: true, data: SETTINGS })
    const { container } = renderPage(<SiteSettings />, { path: '/cms/site-settings' })

    await screen.findByDisplayValue('site-key-public')
    const secret = secretInput(container, 'recaptcha_secret_key')
    expect(secret.type).toBe('password')
    expect(secret.value).toBe(SECRET_DISPLAY_MASK)
    expect(secret.value).toHaveLength(16)

    await userEvent.setup().click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0].recaptcha_secret_key).toBe(SETTINGS_SECRET_MASK)
    expect(save.bodies[0]).not.toHaveProperty('remove_recaptcha_secret_key')
  })

  // A blank secret means "keep" to the API, so clearing the field asks for removal.
  it('removes the saved secret when the field is cleared', async () => {
    api('get', '/admin/cms/site-settings', { status: true, data: SETTINGS })
    const save = api('post', '/admin/cms/site-settings', { status: true, data: SETTINGS })
    const { container } = renderPage(<SiteSettings />, { path: '/cms/site-settings' })
    const user = userEvent.setup()

    await screen.findByDisplayValue('site-key-public')
    await user.clear(secretInput(container, 'recaptcha_secret_key'))
    await user.click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0].remove_recaptcha_secret_key).toBe('1')
    expect(save.bodies[0].recaptcha_secret_key).toBe('')
  })

  it('replaces the saved secret with a new one typed in', async () => {
    api('get', '/admin/cms/site-settings', { status: true, data: SETTINGS })
    const save = api('post', '/admin/cms/site-settings', { status: true, data: SETTINGS })
    const { container } = renderPage(<SiteSettings />, { path: '/cms/site-settings' })
    const user = userEvent.setup()

    await screen.findByDisplayValue('site-key-public')
    const secret = secretInput(container, 'recaptcha_secret_key')
    await user.clear(secret)
    await user.type(secret, 'new-secret')
    await user.click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0].recaptcha_secret_key).toBe('new-secret')
    expect(save.bodies[0]).not.toHaveProperty('remove_recaptcha_secret_key')
  })

  it('leaves an unsaved secret empty and asks for no removal', async () => {
    api('get', '/admin/cms/site-settings', { status: true, data: { ...SETTINGS, recaptcha_secret_key: '' } })
    const save = api('post', '/admin/cms/site-settings', { status: true, data: SETTINGS })
    const { container } = renderPage(<SiteSettings />, { path: '/cms/site-settings' })

    await screen.findByDisplayValue('site-key-public')
    const secret = secretInput(container, 'recaptcha_secret_key')
    expect(secret.value).toBe('')
    expect(secret.placeholder).toBe('Secret Key')

    await userEvent.setup().click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0]).not.toHaveProperty('remove_recaptcha_secret_key')
  })
})

describe('MicroBilt Config - client secret', () => {
  const CONFIG = {
    microbilt_mode: 'production', microbilt_base_url_production: 'https://api.microbilt.test',
    microbilt_client_id_production: 'client-id', microbilt_client_secret_production: SETTINGS_SECRET_MASK,
    microbilt_base_url_sandbox: '', microbilt_client_id_sandbox: '', microbilt_client_secret_sandbox: '',
  }

  // As on Site Settings: a saved secret shows as dots (the mask), and the mask
  // sent back keeps it. The secret itself never reaches the page.
  it('shows a saved secret as dots and keeps it when left alone', async () => {
    api('post', '/common/app-configurations', { status: true, data: CONFIG })
    const save = api('post', '/common/app-configurations/save', { status: true, data: null })
    const { container } = renderPage(<MicroBiltConfigForm />, { path: '/settings' })

    await screen.findByDisplayValue('client-id')
    const secret = secretInput(container, 'client_secret_production')
    expect(secret.type).toBe('password')
    expect(secret.value).toBe(SECRET_DISPLAY_MASK)
    expect(secret.value).toHaveLength(16)

    await userEvent.setup().click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0].microbilt_client_secret_production).toBe(SETTINGS_SECRET_MASK)
    expect(screen.queryByText('Client Secret is required.')).not.toBeInTheDocument()
  })

  it('replaces the saved secret with a new one typed in', async () => {
    api('post', '/common/app-configurations', { status: true, data: CONFIG })
    const save = api('post', '/common/app-configurations/save', { status: true, data: null })
    const { container } = renderPage(<MicroBiltConfigForm />, { path: '/settings' })
    const user = userEvent.setup()

    await screen.findByDisplayValue('client-id')
    const secret = secretInput(container, 'client_secret_production')
    await user.clear(secret)
    await user.type(secret, 'new-client-secret')
    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0].microbilt_client_secret_production).toBe('new-client-secret')
  })

  // MicroBilt cannot work without the secret of the mode in use, so clearing a
  // saved one is not a way to remove it: the field asks for one instead.
  it('asks for a secret when the saved one is cleared, and saves nothing', async () => {
    api('post', '/common/app-configurations', { status: true, data: CONFIG })
    const save = api('post', '/common/app-configurations/save', { status: true, data: null })
    const { container } = renderPage(<MicroBiltConfigForm />, { path: '/settings' })
    const user = userEvent.setup()

    await screen.findByDisplayValue('client-id')
    await user.clear(secretInput(container, 'client_secret_production'))
    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    expect(await screen.findByText('Client Secret is required.')).toBeInTheDocument()
    expect(save.calls).toBe(0)
  })

  it("keeps the other mode's saved secret as it is", async () => {
    api('post', '/common/app-configurations', {
      status: true,
      data: { ...CONFIG, microbilt_base_url_sandbox: 'https://sandbox.microbilt.test', microbilt_client_id_sandbox: 'sandbox-id', microbilt_client_secret_sandbox: SETTINGS_SECRET_MASK },
    })
    const save = api('post', '/common/app-configurations/save', { status: true, data: null })
    renderPage(<MicroBiltConfigForm />, { path: '/settings' })

    await screen.findByDisplayValue('client-id')
    await userEvent.setup().click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0].microbilt_client_secret_sandbox).toBe(SETTINGS_SECRET_MASK)
  })

  it('still requires a secret when none is saved', async () => {
    api('post', '/common/app-configurations', { status: true, data: { ...CONFIG, microbilt_client_secret_production: '' } })
    const save = api('post', '/common/app-configurations/save', { status: true, data: null })
    renderPage(<MicroBiltConfigForm />, { path: '/settings' })

    await screen.findByDisplayValue('client-id')
    await userEvent.setup().click(screen.getByRole('button', { name: /save configuration/i }))

    expect(await screen.findByText('Client Secret is required.')).toBeInTheDocument()
    expect(save.calls).toBe(0)
  })
})

describe('Credit Profile Config - OpenAI key', () => {
  it('never holds the saved key and saves without asking for it again', async () => {
    api('post', '/common/app-configurations', {
      status: true,
      data: { credit_profile_parser_mode: 'openai', credit_profile_openai_api_key: SETTINGS_SECRET_MASK, credit_profile_openai_model: 'gpt-4o' },
    })
    const save = api('post', '/common/app-configurations/save', { status: true, data: null })
    const { container } = renderPage(<CreditProfileConfigForm />, { path: '/settings' })

    await waitFor(() => expect(secretInput(container, 'openai_api_key')).toBeTruthy())
    const key = secretInput(container, 'openai_api_key')
    expect(key.value).toBe('')
    expect(key.placeholder).toBe(SAVED_SECRET_PLACEHOLDER)

    await userEvent.setup().click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0].credit_profile_openai_api_key).toBe('')
  })
})
