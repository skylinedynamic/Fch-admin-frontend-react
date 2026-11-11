import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Defect (found 2026-11-11): Lender Information's rows-per-page box was 65px
 * wide, so the form-select arrow (about 36px with its padding) covered "25"
 * and "50". It needs room for two digits beside the arrow.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/funding-requests.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('Lender Information rows-per-page box', () => {
  it('is wide enough to show the page size beside its arrow', () => {
    const width = css.match(/\.fr-style-5dc02308\s*\{[^}]*width:\s*(\d+)px/)?.[1]

    expect(width).toBeDefined()
    expect(Number(width)).toBeGreaterThanOrEqual(80)
  })
})
