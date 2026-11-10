import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), warning: vi.fn() }) }
})

import { toast } from 'react-toastify'
import EmbedFormSettings from '../../../src/pages/embed-form/EmbedFormSettings'

/**
 * Round 2 BUG-035: Allowed Domains took only full URLs (the box was a URL
 * field, so "x.com" left in it blocked Save with the browser's "Please enter a
 * URL."), and the API's refusal - "The allowed_domains.2 field must be a valid
 * URL." - was shown nowhere on the form. A bare host is fine now; the API
 * stores each entry as its host and names any entry it refuses, shown under
 * the field.
 */
const CONFIG = {
  form_title: 'Loan Application', is_active: true, allowed_domains: ['acme.test'],
  public_key: 'pk_live_abc123', direct_url: 'https://forms.fcf.test/f/pk_live_abc123',
  form_url_available: true,
  embed_script_url: 'https://forms.fcf.test/form/assets/embed.js',
}

const mount = () => {
  api('get', '/common/embed-forms/config', { status: true, data: CONFIG })
  return renderPage(<EmbedFormSettings />, { path: '/embed-form/settings' })
}

const domainBox = () => screen.getByPlaceholderText('yourwebsite.com')
const chips = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.allowed-domain-chip'), (chip) => chip.textContent?.trim())

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view configuration', 'update configuration'] })
  allowBackgroundCalls()
})

describe('Embed form settings › Allowed Domains (R2 BUG-035)', () => {
  it('takes a bare host name - a plain text box, not a URL field', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await screen.findByDisplayValue('Loan Application')

    expect(domainBox()).toHaveAttribute('type', 'text')
    await user.type(domainBox(), 'x.com')
    await user.click(screen.getByRole('button', { name: /add domain/i }))

    expect(chips(container)).toEqual(['acme.test', 'x.com'])
    expect(domainBox()).toHaveValue('')
  })

  it('a repeat is refused under the field, not in a toast, and stays in the box to edit', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await screen.findByDisplayValue('Loan Application')

    await user.type(domainBox(), '  ACME.test ')
    await user.click(screen.getByRole('button', { name: /add domain/i }))

    expect(screen.getByText('"ACME.test" is already in the list.')).toBeInTheDocument()
    expect(chips(container)).toEqual(['acme.test'])
    expect(domainBox()).toHaveValue('  ACME.test ')
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it('shows each entry the API refuses under the field and marks its chip, without a toast', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await screen.findByDisplayValue('Loan Application')
    const save = api('put', '/common/embed-forms/config', invalid({ 'allowed_domains.1': '"*.x.com": wildcards are not supported. Add each site, such as shop.example.com, on its own.' }), 422)

    await user.type(domainBox(), '*.x.com')
    await user.click(screen.getByRole('button', { name: /add domain/i }))
    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(await screen.findByText('"*.x.com": wildcards are not supported. Add each site, such as shop.example.com, on its own.')).toBeInTheDocument()
    const refused = Array.from(container.querySelectorAll('.allowed-domain-chip--refused'), (chip) => chip.textContent?.trim())
    expect(refused).toEqual(['*.x.com'])
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('removing the refused entry clears its message', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await screen.findByDisplayValue('Loan Application')
    api('put', '/common/embed-forms/config', invalid({ 'allowed_domains.1': '"intranet" is not a domain. Enter one such as example.com.' }), 422)

    await user.type(domainBox(), 'intranet')
    await user.click(screen.getByRole('button', { name: /add domain/i }))
    await user.click(screen.getByRole('button', { name: /save configuration/i }))
    await screen.findByText('"intranet" is not a domain. Enter one such as example.com.')

    const chip = Array.from(container.querySelectorAll('.allowed-domain-chip')).find((el) => el.textContent?.includes('intranet')) as HTMLElement
    await user.click(within(chip).getByRole('button', { name: /remove/i }))

    expect(screen.queryByText('"intranet" is not a domain. Enter one such as example.com.')).toBeNull()
  })

  it('after saving, lists the domains as the API stored them', async () => {
    const user = userEvent.setup()
    const { container } = mount()
    await screen.findByDisplayValue('Loan Application')
    api('put', '/common/embed-forms/config', { status: true, message: 'Saved.' })

    await user.type(domainBox(), 'https://X.com/path')
    await user.click(screen.getByRole('button', { name: /add domain/i }))
    api('get', '/common/embed-forms/config', { status: true, data: { ...CONFIG, allowed_domains: ['acme.test', 'x.com'] } })
    await user.click(screen.getByRole('button', { name: /save configuration/i }))

    await waitFor(() => expect(chips(container)).toEqual(['acme.test', 'x.com']))
  })
})
