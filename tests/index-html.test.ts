import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * index.html carries the partner's title, description, Open Graph tags and
 * favicon for link previews (WhatsApp, Facebook, LinkedIn, Slack), which read the
 * raw HTML and never run the app. Nginx fills them in per domain with an SSI
 * include of the API's /api/portal-meta; the include's stub holds the packaged
 * defaults, which is also what is served wherever SSI is not switched on.
 */
const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8')

const BLOCK_START = '<!--# block name="portal_meta_default" -->'
const BLOCK_END = '<!--# endblock -->'
const INCLUDE = '<!--# include virtual="/__portal-meta" stub="portal_meta_default" -->'

const head = () => new DOMParser().parseFromString(html, 'text/html').head

describe('index.html link-preview tags', () => {
  it('asks Nginx for the partner tags, with the defaults as the stub', () => {
    expect(html).toContain(INCLUDE)
    // Nginx only knows a stub block that was defined before the include.
    expect(html.indexOf(BLOCK_START)).toBeGreaterThan(-1)
    expect(html.indexOf(BLOCK_END)).toBeGreaterThan(html.indexOf(BLOCK_START))
    expect(html.indexOf(INCLUDE)).toBeGreaterThan(html.indexOf(BLOCK_END))
  })

  it('serves the packaged defaults where SSI is not on', () => {
    const doc = head()

    expect(doc.querySelectorAll('title')).toHaveLength(1)
    expect(doc.querySelector('title')?.textContent).toBe('Four Corner Funding | Partner Portal')
    expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Four Corner Funding | Partner Portal')
    expect(doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')).toBe('Four Corner Funding')
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBeTruthy()
    expect(doc.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBeTruthy()
    expect(doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary')
    expect(doc.querySelectorAll('link[rel~="icon"]')).toHaveLength(1)
    expect(doc.querySelector('link[rel~="icon"]')?.getAttribute('href')).toBe('/favicon.png')
  })

  // R3-BUG-040: the packaged icon sat outside the stub, so a partner's served
  // HTML carried the host's icon ahead of its own. Inside the stub, the API's
  // fragment (which always names an icon) replaces it.
  it('keeps the packaged favicon inside the stub, so a partner portal serves only its own', () => {
    const stub = html.slice(html.indexOf(BLOCK_START), html.indexOf(BLOCK_END))
    const outside = html.slice(0, html.indexOf(BLOCK_START)) + html.slice(html.indexOf(BLOCK_END))

    expect(stub).toContain('<link rel="icon" href="/favicon.png" />')
    expect(outside).not.toMatch(/rel="icon"/)
  })

  it('ships the packaged favicon at the fixed path the API names when there is no upload', () => {
    expect(existsSync(resolve(__dirname, '../public/favicon.png'))).toBe(true)
  })

  it('keeps every tag the API replaces inside the stub, so none is doubled', () => {
    const outside = html.slice(0, html.indexOf(BLOCK_START)) + html.slice(html.indexOf(BLOCK_END))

    expect(outside).not.toMatch(/<title>/i)
    expect(outside).not.toMatch(/<meta[^>]+(property="og:|name="twitter:|name="description")/i)
  })

  it('has the tags in place before the branding script runs, so it updates them rather than adding more', () => {
    expect(html.indexOf(BLOCK_START)).toBeGreaterThan(-1)
    expect(html.indexOf(BLOCK_START)).toBeLessThan(html.indexOf('<script>'))
  })
})
