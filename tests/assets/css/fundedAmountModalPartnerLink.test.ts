import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Closed (Completed) modal › Partner Commission "Not set": the "Set partner
 * commissions" link reads as a small theme-coloured link under the detail line.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/funded-amount-modal.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const ruleFor = (selector: string) => {
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].split(',').map((s) => s.trim()).includes(selector)) return match[2]
  }
  return ''
}

describe('funded-amount-modal.css - Set partner commissions link', () => {
  it('is a small, bold link in the theme colour, under the detail line', () => {
    const rule = ruleFor('.fam-partner__link')

    expect(rule).toMatch(/(^|[;\s])color\s*:\s*var\(--fam-primary\)/)
    expect(rule).toMatch(/font-weight\s*:\s*600/)
    expect(rule).toMatch(/font-size\s*:\s*12\.5px/)
    expect(rule).toMatch(/margin-top\s*:\s*4px/)
    expect(rule).toMatch(/text-decoration\s*:\s*none/)
  })

  it('underlines on hover and focus', () => {
    expect(ruleFor('.fam-partner__link:hover')).toMatch(/text-decoration\s*:\s*underline/)
    expect(ruleFor('.fam-partner__link:focus-visible')).toMatch(/text-decoration\s*:\s*underline/)
  })
})
