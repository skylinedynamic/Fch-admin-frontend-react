import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Agreement Builder › Editor: a page's text ran into its bottom padding (and
 * was clipped by the page). The page planner (pagination.ts, shared with the
 * preview and signing) lays blocks out with collapsed margins - the gap
 * between two blocks is the larger of their margins - and no top margin on a
 * page's first block. The editor drew more: the insert line between blocks
 * was a flex box, which stops margins collapsing, so both margins showed; and
 * a page's first block kept its top margin. The editor now draws what the
 * planner planned.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/agreement-builder.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The last value of `prop` across every rule for exactly `selector`. */
const lastValue = (selector: string, prop: string) => {
  let value: string | null = null
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!match[1].split(',').map((s) => s.trim()).includes(selector)) continue
    for (const decl of match[2].split(';')) {
      const [k, ...v] = decl.split(':')
      if (k?.trim() === prop) value = v.join(':').trim()
    }
  }
  return value
}

describe('agreement-builder.css - the editor pages blocks as the planner does', () => {
  it('lets margins collapse across the insert line between blocks (a block box, not flex)', () => {
    expect(lastValue('.ab4-iz', 'display')).toBe('block')
  })

  it("drops the top margin of a page's first block", () => {
    expect(lastValue('.ab4-page-first > div > .ab4-block', 'margin-top')).toMatch(/^0(px)?$/)
  })
})
