import { describe, expect, it } from 'vitest'
import { SEO_META_TITLE_MAX_LENGTH, suggestSeoTitle } from '../../src/config/seo'

describe('suggestSeoTitle', () => {
  it('adds the brand when it fits', () => {
    expect(suggestSeoTitle('About Us')).toBe('About Us | Four Corner Funding')
  })

  it('drops the brand when the page name and brand are too long together', () => {
    const name = 'How to Build Business Credit Fast With Net-30 Vendor Accounts and Keep Your Personal Credit Out of It'
    expect(suggestSeoTitle(name)).toBe(name)
  })

  it('cuts a page name that is longer than the limit on its own', () => {
    const suggestion = suggestSeoTitle('x'.repeat(150))
    expect(suggestion).toHaveLength(SEO_META_TITLE_MAX_LENGTH)
  })
})
