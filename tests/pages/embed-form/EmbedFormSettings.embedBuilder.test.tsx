import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), warning: vi.fn() }) }
})

import EmbedFormSettings from '../../../src/pages/embed-form/EmbedFormSettings'

/**
 * Partners fit the iframe code to their own site in Embed Form Settings, from
 * the link and script address the API sends. The direct link stays as it is.
 */
const CONFIG = {
  form_title: 'Loan Application', is_active: true, allowed_domains: [],
  public_key: 'pk_live_abc123', direct_url: 'https://forms.fcf.test/form/pk_live_abc123',
  form_url_available: true,
  embed_script_url: 'https://forms.fcf.test/form/assets/embed.js',
}

const mount = (config: Record<string, unknown> = CONFIG) => {
  api('get', '/common/embed-forms/config', { status: true, data: config })
  return renderPage(<EmbedFormSettings />, { path: '/embed-form/settings' })
}

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view configuration', 'update configuration'] })
  allowBackgroundCalls()
})

describe('Embed form settings › embed code builder', () => {
  it('builds the code from the API link and script, titled with the form', async () => {
    mount()

    const code = (await screen.findByLabelText('Embed code')) as HTMLTextAreaElement
    expect(code.value).toContain(`<iframe src="${CONFIG.direct_url}" data-fch-embed`)
    expect(code.value).toContain(`<script src="${CONFIG.embed_script_url}" async></script>`)
    expect(code.value).toContain('title="Loan Application"')
  })

  it('an option changes the code but never the direct link', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByLabelText('Embed code')

    await user.click(screen.getByRole('checkbox', { name: /show header/i }))

    expect((screen.getByLabelText('Embed code') as HTMLTextAreaElement).value).toContain('?header=0')
    expect(screen.getByDisplayValue(CONFIG.direct_url)).toBeInTheDocument()
  })

  it('is not offered while the form has nowhere to be published', async () => {
    mount({ ...CONFIG, form_url_available: false, form_url_warning: 'Set up your custom domain first.', direct_url: null })

    expect((await screen.findAllByText('Set up your custom domain first.')).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Embed code')).not.toBeInTheDocument()
  })
})
