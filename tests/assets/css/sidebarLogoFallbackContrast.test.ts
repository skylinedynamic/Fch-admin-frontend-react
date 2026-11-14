import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Defect (BUG-170 retest 10-Nov-26): when the sidebar logo can't load, the
 * site name shown in its place took the logo link's colour, rgb(64,81,137), on
 * the navy sidebar rgb(0,31,63) - about 2.2:1, barely readable (the BUG-141
 * pattern on the borrower portal). It must use the sidebar's own text colour,
 * which the branding works out for the sidebar background.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/brand-tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const token = (name: string) => css.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('sidebar logo fallback name', () => {
  it('is drawn in the sidebar text colour', () => {
    const rule = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).find(([, selector]) =>
      /\.app-menu\s+\.navbar-brand-box\s+\.brand-logo-text/.test(selector)
    )

    expect(rule).toBeDefined()
    expect(rule![2]).toMatch(/color\s*:\s*var\(--brand-on-sidebar\)/)
  })

  it('reads at least 4.5:1 on the default sidebar', () => {
    const bg = token('--brand-sidebar-bg')!
    const text = token('--brand-on-sidebar')!

    expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5)
  })
})
