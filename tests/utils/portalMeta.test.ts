import { afterEach, describe, expect, it } from 'vitest'
import { applyPortalMeta, portalMeta } from '../../src/utils/portalMeta'

/**
 * The page's title, description, Open Graph tags and favicon, kept in step with
 * the tenant's branding once the app is running. Mirrors what the API's
 * /api/portal-meta gives Nginx for the raw HTML.
 */
const content = (selector: string) => document.head.querySelector(selector)?.getAttribute('content')

afterEach(() => {
  document.head.innerHTML = ''
  document.title = ''
})

describe('portalMeta', () => {
  it('names the tenant and the portal', () => {
    const meta = portalMeta({ site_name: 'Acme Capital', site_slogan: 'Capital for Main Street' })

    expect(meta.title).toBe('Acme Capital | Partner Portal')
    expect(meta.siteName).toBe('Acme Capital')
    expect(meta.description).toBe('Capital for Main Street')
  })

  it('describes the portal when the tenant has no slogan', () => {
    expect(portalMeta({ site_name: 'Acme Capital', site_slogan: 'null' }).description)
      .toBe('Sign in to the Acme Capital partner portal to manage your borrowers and their funding.')
  })

  it('uses the sidebar logo as the preview image', () => {
    const meta = portalMeta({
      site_name: 'Acme',
      logo_sidebar_full_url: 'https://api.test/storage/sidebar.png',
      logo_document_full_url: 'https://api.test/storage/doc.png',
    })

    expect(meta.image).toBe('https://api.test/storage/sidebar.png')
  })

  it('falls back to the next logo a preview can show', () => {
    const meta = portalMeta({
      site_name: 'Acme',
      logo_sidebar_full_url: 'https://api.test/storage/sidebar.svg',
      logo_document_full_url: 'null',
      logo_mail_full_url: 'https://api.test/storage/mail.png',
      logo_mobile_full_url: 'https://api.test/storage/mobile.png',
    })

    expect(meta.image).toBe('https://api.test/storage/mail.png')
  })

  it('asks for the name placeholder as PNG', () => {
    expect(portalMeta({ site_name: 'Acme', logo_document_full_url: 'https://placehold.co/230x70?text=Acme' }).image)
      .toBe('https://placehold.co/230x70/png?text=Acme')
  })

  it('has no favicon of its own when the tenant has none', () => {
    expect(portalMeta({ site_name: 'Acme', favicon_full_url: 'null' }).favicon).toBeNull()
  })
})

describe('applyPortalMeta', () => {
  it('writes the tenant into the title, description, Open Graph and Twitter tags', () => {
    applyPortalMeta({
      site_name: 'Acme Capital',
      site_slogan: 'Capital for Main Street',
      logo_document_full_url: 'https://api.test/storage/doc.png',
    })

    expect(document.title).toBe('Acme Capital | Partner Portal')
    expect(content('meta[name="description"]')).toBe('Capital for Main Street')
    expect(content('meta[property="og:title"]')).toBe('Acme Capital | Partner Portal')
    expect(content('meta[property="og:site_name"]')).toBe('Acme Capital')
    expect(content('meta[property="og:description"]')).toBe('Capital for Main Street')
    expect(content('meta[property="og:image"]')).toBe('https://api.test/storage/doc.png')
    expect(content('meta[name="twitter:title"]')).toBe('Acme Capital | Partner Portal')
    expect(content('meta[name="twitter:image"]')).toBe('https://api.test/storage/doc.png')
  })

  it('updates the tags already in the page rather than adding more', () => {
    document.head.innerHTML = '<meta property="og:title" content="Four Corner Funding | Partner Portal"><link rel="icon" href="/assets/images/Favicon.png">'

    applyPortalMeta({ site_name: 'Acme', favicon_full_url: 'https://api.test/storage/fav.png' })

    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(content('meta[property="og:title"]')).toBe('Acme | Partner Portal')
    const icons = document.head.querySelectorAll('link[rel~="icon"]')
    expect(icons).toHaveLength(1)
    expect(icons[0].getAttribute('href')).toMatch(/^https:\/\/api\.test\/storage\/fav\.png\?_t=\d+$/)
  })

  it('keeps the packaged favicon when the tenant has none', () => {
    document.head.innerHTML = '<link rel="icon" href="/assets/Favicon-abc.png">'

    applyPortalMeta({ site_name: 'Acme', favicon_full_url: null })

    const icons = document.head.querySelectorAll('link[rel~="icon"]')
    expect(icons).toHaveLength(1)
    expect(icons[0].getAttribute('href')).toBe('/assets/Favicon-abc.png')
  })

  it('drops a preview image the tenant no longer has', () => {
    document.head.innerHTML = '<meta property="og:image" content="https://api.test/old.png"><meta name="twitter:image" content="https://api.test/old.png">'

    applyPortalMeta({ site_name: 'Acme' })

    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull()
    expect(document.head.querySelector('meta[name="twitter:image"]')).toBeNull()
  })

  it('leaves the page alone without branding', () => {
    document.title = 'Four Corner Funding | Partner Portal'

    applyPortalMeta(null)

    expect(document.title).toBe('Four Corner Funding | Partner Portal')
  })
})
