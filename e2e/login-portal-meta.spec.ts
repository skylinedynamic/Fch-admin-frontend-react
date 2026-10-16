import { test, expect, type Page } from '@playwright/test'

// The login page, like every page, carries the partner's own title, description,
// link-preview tags, favicon and logo. Link previews read the raw HTML, which
// Nginx fills in per domain with an SSI include of the API's /api/portal-meta;
// the running page then keeps the same tags from the public branding.
//
// Branding is mocked here, so the partner is deterministic.
const BRANDING = {
  site_name: 'Acme Capital',
  site_slogan: 'Capital for Main Street',
  logo_sidebar_full_url: 'https://api.example.test/storage/acme-sidebar.png',
  logo_document_full_url: 'https://api.example.test/storage/acme-doc.png',
  favicon_full_url: 'https://api.example.test/storage/acme-fav.png',
}

async function mockBranding(page: Page) {
  await page.route('**/common/branding', (route) =>
    route.fulfill({ json: { success: true, data: { branding: BRANDING, css_vars: null, css_vars_version: 1 } } })
  )
  // Images from the mocked API host would only add noise to the run.
  await page.route('https://api.example.test/**', (route) => route.fulfill({ status: 204 }))
}

const meta = (page: Page, selector: string) => page.locator(`head ${selector}`).getAttribute('content')

test.describe('Login page › partner link-preview tags', () => {
  test('the login page carries the partner in the tab, the preview tags and the logo', async ({ page }) => {
    await mockBranding(page)
    await page.goto('/login')

    await expect(page).toHaveTitle('Acme Capital | Partner Dashboard')
    await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1)
    expect(await meta(page, 'meta[property="og:title"]')).toBe('Acme Capital | Partner Dashboard')
    expect(await meta(page, 'meta[property="og:site_name"]')).toBe('Acme Capital')
    expect(await meta(page, 'meta[property="og:description"]')).toBe('Capital for Main Street')
    expect(await meta(page, 'meta[name="description"]')).toBe('Capital for Main Street')
    expect(await meta(page, 'meta[property="og:image"]')).toBe(BRANDING.logo_sidebar_full_url)

    const icons = page.locator('head link[rel~="icon"]')
    await expect(icons).toHaveCount(1)
    expect(await icons.getAttribute('href')).toContain(BRANDING.favicon_full_url)

    await expect(page.locator('img.auth-logo-img')).toHaveAttribute('src', BRANDING.logo_sidebar_full_url)
  })

  test('the raw login HTML asks Nginx for the partner tags and has the defaults as its stub', async ({ request }) => {
    const html = await (await request.get('/login')).text()

    expect(html).toContain('<!--# include virtual="/__portal-meta" stub="portal_meta_default" -->')
    expect(html).toContain('<!--# block name="portal_meta_default" -->')
    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html).toContain('<meta property="og:title" content="Four Corner Funding | Partner Dashboard" />')
  })

  // Against an Nginx with the portal-meta SSI include configured (see
  // docs/deploy/portal-meta-ssi.md), e.g. E2E_SSI_BASE_URL=http://localhost:8089.
  test('behind Nginx with SSI, the login HTML carries the tags from the API', async ({ request }) => {
    const base = process.env.E2E_SSI_BASE_URL
    test.skip(!base, 'Set E2E_SSI_BASE_URL to an Nginx serving this build with SSI on.')

    const html = await (await request.get(`${base}/login`)).text()

    expect(html).not.toContain('<!--#')
    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html.match(/property="og:title"/g)).toHaveLength(1)
    expect(html).toMatch(/<title>[^<]+ \| Partner Dashboard<\/title>/)
    expect(html).toMatch(/<meta property="og:url" content="https:\/\/[^"]+\/">/)
  })
})
