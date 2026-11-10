import { describe, expect, it, vi } from 'vitest'

vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))

import { missingLogoSurfaces } from '../../../../src/pages/settings/components/BrandingForm'

const NONE = { logo_sidebar: '', logo_document: '', logo_mail: '', logo_mobile: '', favicon: '' }

describe('Branding › "No logo set for ..." note', () => {
  // Defect: BUG-166 - a partner with no Square mark was not told, and its tab
  // and collapsed menu silently showed the host's mark.
  it('lists the square mark when it is not set', () => {
    expect(missingLogoSurfaces({ ...NONE, logo_sidebar: 'partners/63/side.png' })).toContain('square mark (browser tab, collapsed menu)')
  })

  it('lists only the surfaces that are missing', () => {
    expect(missingLogoSurfaces({ ...NONE, logo_sidebar: 'a.png', logo_mobile: 'b.png', favicon: 'c.png' })).toEqual(['documents', 'email'])
  })
})
