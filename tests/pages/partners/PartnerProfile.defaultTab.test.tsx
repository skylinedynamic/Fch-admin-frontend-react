import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

/**
 * A partner's profile opens on its first tab, Partner information - also on a
 * reload, which keeps no tab. A link may still open another tab (?tab=).
 */
const partner = {
  status: true,
  message: 'ok',
  data: { id: 21, user_id: 77, company_name: 'Pentagon Funding Group', email: 'owner@pentagon.test', partner_type: 'White-Label Partner (WL)', is_host: false, has_sign: false },
}

const open = async (route: string) => {
  signIn({ is_host: 1, permissions: ['view partners', 'update partners'] })
  allowBackgroundCalls()
  api('get', '/admin/partners-details/21', partner)
  renderPage(<PartnerProfile />, { path: '/partners/:id', route })
  return within(await screen.findByRole('tablist', { name: 'Partner sections' }))
}

describe('PartnerProfile - the tab it opens on', () => {
  it('opens an existing partner on Partner information', async () => {
    const tabs = await open('/partners/21')

    await waitFor(() => expect(tabs.getByRole('tab', { name: 'Partner information' })).toHaveAttribute('aria-selected', 'true'))
    expect(tabs.getByRole('tab', { name: 'Status & Agent' })).toHaveAttribute('aria-selected', 'false')
  })

  it('still opens the tab a link asks for', async () => {
    const tabs = await open('/partners/21?tab=statusAgent')

    await waitFor(() => expect(tabs.getByRole('tab', { name: 'Status & Agent' })).toHaveAttribute('aria-selected', 'true'))
  })
})
