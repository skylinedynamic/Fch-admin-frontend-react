import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Lender Information table (funding request and funding application details,
 * 2026-11-11): with the new Lender Code column the table grew wider than its
 * card, so Match and Actions (Assign) were cut off and Lender Name wrapped to
 * four lines. Lender Name gets room, the code stays compact, and a long
 * category ("Business Credit Building") wraps instead of widening the table.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/funding-requests.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const rule = (selector: string) => css.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? ''

describe('Lender Information table layout', () => {
  it('gives Lender Name at least 180px', () => {
    const minWidth = Number(rule('fr-style-4ff6cdc1').match(/min-width:\s*(\d+)px/)?.[1])
    expect(minWidth).toBeGreaterThanOrEqual(180)
  })

  it('keeps the Lender Code column as narrow as its code, on one line', () => {
    const code = rule('fr-lender-code-col')
    expect(code).toMatch(/white-space:\s*nowrap/)
    expect(code).toMatch(/width:\s*1%/)
  })

  it('lets a long category wrap rather than widen the table', () => {
    expect(rule('fr-style-1db6650e')).toMatch(/white-space:\s*normal/)
  })

  // Assign must be visible at first glance, without scrolling the table sideways.
  it('pins the Actions column (Assign) to the right edge, on a solid background', () => {
    const actions = rule('fr-actions-col')
    expect(actions).toMatch(/position:\s*sticky/)
    expect(actions).toMatch(/right:\s*0/)
    expect(actions).toMatch(/background/)
    expect(actions).toMatch(/z-index/)
  })
})
