import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import Sidebar from '../../../src/components/Layout/Sidebar'
import { useAuthStore } from '../../../src/store/auth'
import { useConfigStore } from '../../../src/store/config/configStore'

/**
 * Defect (BUG-170, OP-GLOB-10): when the sidebar logo could not be loaded the
 * admin portal showed an empty broken-image box - the img had no alt and no
 * error handler. As on the borrower portals (BUG-141), the site name is shown
 * in its place.
 */
const SITE = 'Four Corner Funding'

beforeEach(() => {
  server.use(http.get('*/common/notifications', () => HttpResponse.json({ status: true, data: [], meta: { unread_count: 0 } })))
  useAuthStore.setState({ token: 't', user: { id: 1, name: 'Hal Host', is_host: 1, entity_type: 'Employee', permissions: [] }, userSubscription: null } as never)
  useConfigStore.setState({
    branding: {
      site_name: SITE,
      logo_sidebar_full_url: 'https://cdn.test/storage/partners/1/missing-wide.png',
      logo_document_full_url: 'https://cdn.test/storage/partners/1/missing.png',
      favicon_full_url: 'https://cdn.test/storage/partners/1/missing-icon.png',
    },
  } as never)
})
afterEach(() => useConfigStore.setState({ branding: null } as never))

describe('Sidebar logo', () => {
  it('names the site in the alt text of every logo', () => {
    const { container } = renderWithProviders(<Sidebar />)

    const logos = Array.from(container.querySelectorAll('.navbar-brand-box img'))
    expect(logos.length).toBeGreaterThan(0)
    for (const img of logos) expect(img).toHaveAttribute('alt', SITE)
  })

  it('shows the site name instead of a broken image when the logo cannot load', () => {
    const { container } = renderWithProviders(<Sidebar />)

    for (const img of Array.from(container.querySelectorAll('.navbar-brand-box .logo-lg img'))) fireEvent.error(img)

    expect(container.querySelectorAll('.navbar-brand-box .logo-lg img')).toHaveLength(0)
    expect(screen.getAllByText(SITE).length).toBeGreaterThan(0)
  })
})
