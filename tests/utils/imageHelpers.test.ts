import { describe, expect, it } from 'vitest'
import { buildStorageUrl, providerLogoSrc } from '../../src/utils/imageHelpers'

describe('buildStorageUrl', () => {
  it('keeps a full URL as it is', () => {
    expect(buildStorageUrl('https://api.example.com/storage/logos/a.png')).toBe('https://api.example.com/storage/logos/a.png')
  })

  it('builds a /storage URL for a path', () => {
    expect(buildStorageUrl('resource-providers/godaddy_3f9a2c1e.png')).toMatch(/\/storage\/resource-providers\/godaddy_3f9a2c1e\.png$/)
  })

  it('gives the fallback for nothing', () => {
    expect(buildStorageUrl('', 'none')).toBe('none')
  })
})

/**
 * BUG-016: resources/ is private, so a logo just picked from it in the file
 * manager has no /storage URL - the file manager's own (signed) URL shows it
 * until the resource is saved and the logo is kept publicly.
 */
describe('providerLogoSrc', () => {
  it('shows a logo just picked by the URL the file manager gave', () => {
    const signed = 'https://api.example.com/private-files/resources/godaddy.png?expires=1&signature=abc'

    expect(providerLogoSrc({ logo: 'resources/godaddy.png', logo_preview: signed })).toBe(signed)
  })

  it('shows a saved logo by its public storage URL', () => {
    expect(providerLogoSrc({ logo: 'resource-providers/godaddy_3f9a2c1e.png' })).toMatch(/\/storage\/resource-providers\/godaddy_3f9a2c1e\.png$/)
  })

  it('shows nothing when there is no logo', () => {
    expect(providerLogoSrc({ logo: '' })).toBe('')
  })
})
