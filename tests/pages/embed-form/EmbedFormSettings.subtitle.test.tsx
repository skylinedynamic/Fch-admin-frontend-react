import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'
import EmbedFormSettings from '../../../src/pages/embed-form/EmbedFormSettings'

/**
 * R3-BUG-043: the Form Configuration card's subtitle still offered
 * "notifications" after the Notification Email setting was removed. It names
 * only what the card holds: the title, the status and the allowed domains.
 */
const CONFIG = {
  form_title: 'Loan Application', is_active: true, allowed_domains: ['acme.test'],
  public_key: 'pk_live_abc123', direct_url: 'https://forms.fcf.test/f/pk_live_abc123',
  form_url_available: true,
  embed_script_url: 'https://forms.fcf.test/form/assets/embed.js',
}

beforeEach(() => {
  signIn({ permissions: ['view configuration', 'update configuration'] })
  allowBackgroundCalls()
})

describe('Embed form settings › Form Configuration subtitle (R3-BUG-043)', () => {
  it('names what the card holds, and no notifications', async () => {
    api('get', '/common/embed-forms/config', { status: true, data: CONFIG })
    renderPage(<EmbedFormSettings />, { path: '/embed-form/settings' })
    await screen.findByDisplayValue('Loan Application')

    expect(screen.getByText('Configure the title, status, and allowed domains for your embedded form')).toBeInTheDocument()
    expect(screen.queryByText(/notification/i)).not.toBeInTheDocument()
  })
})
