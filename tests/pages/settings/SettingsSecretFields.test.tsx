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
import { SAVED_SECRET_PLACEHOLDER, SETTINGS_SECRET_MASK } from '../../../src/config/appConfig'

/**
 * Defect (BUG-022, OP-CMS-03 / OP-SET-07): secrets were loaded into the page in
 * full - the reCAPTCHA secret as plain text, the MicroBilt client secret (and
 * the Credit Profile OpenAI key) in a password field holding the real value.
 * The API now sends only a mask; the form shows "Saved - leave blank to keep",
 * never puts the mask in the input, and a blank secret on save keeps the
 * stored one.
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

  it('shows a saved secret as a blank password field and saves it blank', async () => {
    api('get', '/admin/cms/site-settings', { status: true, data: SETTINGS })
    const save = api('post', '/admin/cms/site-settings', { status: true, data: SETTINGS })
    const { container } = renderPage(<SiteSettings />, { path: '/cms/site-settings' })

    await screen.findByDisplayValue('site-key-public')
    const secret = secretInput(container, 'recaptcha_secret_key')
    expect(secret.type).toBe('password')
    expect(secret.value).toBe('')
    expect(secret.placeholder).toBe(SAVED_SECRET_PLACEHOLDER)

    await userEvent.setup().click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0].recaptcha_secret_key).toBe('')
  })
})

describe('MicroBilt Config - client secret', () => {
  const CONFIG = {
    microbilt_mode: 'production', microbilt_base_url_production: 'https://api.microbilt.test',
    microbilt_client_id_production: 'client-id', microbilt_client_secret_production: SETTINGS_SECRET_MASK,
    microbilt_base_url_sandbox: '', microbilt_client_id_sandbox: '', microbilt_client_secret_sandbox: '',
  }

  it('never holds the saved secret and saves without asking for it again', async () => {
    api('post', '/common/app-configurations', { status: true, data: CONFIG })
    const save = api('post', '/common/app-configurations/save', { status: true, data: null })
    const { container } = renderPage(<MicroBiltConfigForm />, { path: '/settings' })

    await screen.findByDisplayValue('client-id')
    const secret = secretInput(container, 'client_secret_production')
    expect(secret.value).toBe('')
    expect(secret.placeholder).toBe(SAVED_SECRET_PLACEHOLDER)

    await userEvent.setup().click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0].microbilt_client_secret_production).toBe('')
    expect(screen.queryByText('Client Secret is required.')).not.toBeInTheDocument()
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
