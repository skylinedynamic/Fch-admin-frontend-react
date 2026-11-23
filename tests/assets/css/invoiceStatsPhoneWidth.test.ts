import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Defect (R2 BUG-095, R2-OP-GLOB-01): at 375 px the Invoices summary cards sat
 * two per row (responsive.css, <= 991 px), leaving each amount an 82 px text
 * area with overflow hidden. $386,266.37 showed as "$386,26", $236,505.87 as
 * "$236,50", $139,566.80 as "$139,566". On a phone (<= 575.98 px) the Invoices
 * cards are one per row, so the whole amount fits (measured in Chromium with
 * the app's CSS; jsdom has no layout, so the rule is pinned here).
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/responsive.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The bodies of every @media block with this condition, braces balanced. */
const mediaBlocks = (condition: string) => {
  const blocks: string[] = []
  let from = 0
  for (;;) {
    const at = css.indexOf(`@media ${condition}`, from)
    if (at === -1) return blocks
    const open = css.indexOf('{', at)
    let depth = 1
    let i = open + 1
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
    }
    blocks.push(css.slice(open + 1, i - 1))
    from = i
  }
}

/** The last value of a property for a selector inside these blocks. */
const lastValue = (blocks: string[], selector: string, prop: string) => {
  let value: string | null = null
  for (const block of blocks) {
    for (const match of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!match[1].split(',').map((s) => s.trim()).includes(selector)) continue
      for (const decl of match[2].split(';')) {
        const [k, ...v] = decl.split(':')
        if (k?.trim() === prop) value = v.join(':').trim()
      }
    }
  }
  return value
}

describe('responsive.css - Invoices summary cards on a phone', () => {
  const phone = mediaBlocks('(max-width: 575.98px)')

  it('puts the Invoices cards one per row, so a whole amount fits', () => {
    for (const selector of ['.invoice-section>div', '.invoice-section [class*="col-"]']) {
      expect(lastValue(phone, selector, 'flex')).toBe('0 0 100% !important')
      expect(lastValue(phone, selector, 'width')).toBe('100% !important')
      expect(lastValue(phone, selector, 'max-width')).toBe('100% !important')
    }
  })

  it('comes after the two-per-row rule it overrides', () => {
    const twoPerRow = css.indexOf('.invoice-section>div,')
    const onePerRow = css.lastIndexOf('.invoice-section>div')
    expect(twoPerRow).toBeGreaterThan(-1)
    expect(onePerRow).toBeGreaterThan(twoPerRow)
  })
})
