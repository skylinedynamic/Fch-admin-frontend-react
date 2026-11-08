import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), warning: vi.fn() }) }
})

// Bootstrap's own modal finishes in transitions that outlive the test.
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { toast } from 'react-toastify'
import EmbedFormSettings from '../../../src/pages/embed-form/EmbedFormSettings'

/**
 * Regenerating the public key asked through the browser's own confirm box,
 * with one long sentence. It now opens the app's confirmation modal, which
 * says what stops working and what to do next.
 */
const CONFIG = {
  form_title: 'Loan Application', is_active: true, allowed_domains: [],
  public_key: 'pk_live_abc123', direct_url: 'https://forms.fcf.test/form/pk_live_abc123',
  form_url_available: true,
  embed_script_url: 'https://forms.fcf.test/form/assets/embed.js',
}

const mount = () => {
  api('get', '/common/embed-forms/config', { status: true, data: CONFIG })
  return renderPage(<EmbedFormSettings />, { path: '/embed-form/settings' })
}

const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: /regenerate public key/i }))
  return screen.getByText('Regenerate the public key?').closest('.modal') as HTMLElement
}

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view configuration', 'update configuration'] })
  allowBackgroundCalls()
})

describe('Embed form settings › Regenerate Public Key', () => {
  it('asks in the app modal, not the browser confirm box, and says what will happen', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    mount()

    const modal = await openModal(user)

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(within(modal).getByText(/the current key stops working straight away/i)).toBeInTheDocument()
    // What will happen sits in a warning box.
    const warning = within(modal).getByRole('alert')
    expect(warning).toHaveClass('alert-warning')
    expect(within(warning).getByText(/no longer load on any website/i)).toBeInTheDocument()
    expect(within(modal).getByText(/direct shareable link .* stops working/i)).toBeInTheDocument()
    expect(within(modal).getByText(/site settings/i)).toBeInTheDocument()
    expect(within(modal).getByRole('button', { name: /yes, regenerate key/i})).toHaveClass('btn-danger')
  })

  it('Cancel leaves the key as it is', async () => {
    const user = userEvent.setup()
    mount()
    const regenerate = api('post', '/common/embed-forms/config/generate-key', { status: true, message: 'ok', data: {} })

    const modal = await openModal(user)
    await user.click(within(modal).getByRole('button', { name: /cancel/i}))

    expect(regenerate.calls).toBe(0)
  })

  it('confirming regenerates the key and reloads the settings', async () => {
    const user = userEvent.setup()
    mount()
    const regenerate = api('post', '/common/embed-forms/config/generate-key', { status: true, message: 'Public embed key regenerated successfully.', data: {} })

    const modal = await openModal(user)
    await user.click(within(modal).getByRole('button', { name: /yes, regenerate key/i}))

    await waitFor(() => expect(regenerate.calls).toBe(1))
    expect(toast.success).toHaveBeenCalledWith('Public embed key regenerated successfully.')
  })
})
