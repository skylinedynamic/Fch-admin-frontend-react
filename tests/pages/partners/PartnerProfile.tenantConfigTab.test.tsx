import { describe, expect, it, vi } from 'vitest'
import { screen } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

/**
 * Partner profile › Tenant Config: the page header's button saves the tab's
 * form and says what it saves, like the other tabs' (Save Mail Notification,
 * Save Commission).
 */
const partner = {
  status: true,
  message: 'ok',
  data: { id: 21, user_id: 77, company_name: 'Noble and Brady Co', email: 'owner@noble.test', partner_type: 'White-Label Partner (WL)', is_host: 0, has_sign: false },
}

describe('PartnerProfile - Tenant Config tab', () => {
  it('names its header button Save Tenant Configuration', async () => {
    signIn({ is_host: 1, permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/21', partner)
    api('get', '/admin/partners/tenant-config/21', {
      status: true,
      data: { active_custom_url: true, partner_domain: 'portal.noble.test', borrower_domain: '', partner_subdomain: 'noble' },
    })

    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/21?tab=tenantConfig' })

    const save = await screen.findByRole('button', { name: 'Save Tenant Configuration' })
    expect(save).toHaveAttribute('form', 'tenant-config-form')
    expect(screen.queryByRole('button', { name: /^update$/i })).not.toBeInTheDocument()
  })
})
