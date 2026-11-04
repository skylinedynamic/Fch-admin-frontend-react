import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from '../../src/utils/sanitizeHtml'

/**
 * BUG-004 (QA round 2): a lead named `<img src=x onerror=...>` ran script in
 * the Activity panel, which renders descriptions as HTML. Rich text (notes
 * written in the editor) must keep its formatting; anything that can run
 * script must go.
 */
describe('sanitizeHtml', () => {
  it('drops event handler attributes', () => {
    const out = sanitizeHtml('Lead profile created for R2-XSS <img src=x onerror=console.log("xss")>')
    expect(out).not.toMatch(/onerror/i)
    expect(out).toContain('Lead profile created for R2-XSS')
  })

  it('drops script tags and their content', () => {
    expect(sanitizeHtml('a<script>alert(1)</script>b')).toBe('ab')
  })

  it('drops javascript: links but keeps the text', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>')
    expect(out).not.toMatch(/javascript:/i)
    expect(out).toContain('click')
  })

  it('drops iframes, objects and inline svg handlers', () => {
    const out = sanitizeHtml('<iframe src="https://evil.test"></iframe><object data="x"></object><svg onload="alert(1)"></svg>')
    expect(out).not.toMatch(/iframe|object|onload/i)
  })

  it('keeps editor formatting and ordinary links', () => {
    const html = '<p><b>Call</b> <i>notes</i></p><ul><li>one</li></ul><a href="https://example.test">site</a>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  it('keeps a new-tab link, cut off from this page', () => {
    const out = sanitizeHtml('<a href="https://example.test" target="_blank">site</a>')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it('treats empty input as an empty string', () => {
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(undefined)).toBe('')
    expect(sanitizeHtml('')).toBe('')
  })
})
