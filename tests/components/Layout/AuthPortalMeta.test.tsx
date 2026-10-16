import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import SignIn from '../../../src/pages/singin/SignIn.jsx'

/**
 * The login page carries the partner's own title, description, preview tags,
 * favicon and logo as soon as the public branding arrives.
 */
const content = (selector: string) => document.head.querySelector(selector)?.getAttribute('content')

beforeEach(() => {
  localStorage.clear()
  document.title = 'Four Corner Funding | Partner Portal'
  document.head.innerHTML = [
    '<meta property="og:title" content="Four Corner Funding | Partner Portal">',
    '<link rel="icon" href="/assets/images/Favicon.png">',
  ].join('')
  server.use(
    http.get('*/common/branding', () =>
      HttpResponse.json({
        success: true,
        data: {
          branding: {
            site_name: 'Acme Capital',
            site_slogan: 'Capital for Main Street',
            logo_sidebar_full_url: 'https://api.test/storage/acme-sidebar.png',
            logo_document_full_url: 'https://api.test/storage/acme-doc.png',
            favicon_full_url: 'https://api.test/storage/acme-fav.png',
          },
          css_vars: null,
        },
      })
    )
  )
})

afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})

describe('Login page branding', () => {
  it('shows the partner in the tab, the preview tags and the logo', async () => {
    const { container } = renderWithProviders(<SignIn />)

    await waitFor(() => expect(document.title).toBe('Acme Capital | Partner Portal'))
    expect(content('meta[property="og:title"]')).toBe('Acme Capital | Partner Portal')
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(content('meta[property="og:description"]')).toBe('Capital for Main Street')
    expect(content('meta[property="og:image"]')).toBe('https://api.test/storage/acme-sidebar.png')

    const icons = document.head.querySelectorAll('link[rel~="icon"]')
    expect(icons).toHaveLength(1)
    expect(icons[0].getAttribute('href')).toContain('https://api.test/storage/acme-fav.png')

    await waitFor(() =>
      expect(container.querySelector('.auth-logo-img')?.getAttribute('src')).toBe('https://api.test/storage/acme-sidebar.png')
    )
  })
})
