import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Agreement Builder › a block that runs over several pages is shown in slices
 * (clip windows), each showing its part of the block. They clipped with
 * `overflow: hidden`, which also cut off the block's toolbar floating above
 * it. Slices now clip with clip-path: the top and bottom stay exact (the
 * text above and below a slice stays hidden), while the first slice leaves
 * room above it for the toolbar.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/agreement-builder.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('agreement-builder.css - slices of a block over several pages', () => {
  it('clip with clip-path, not overflow, keeping the top and bottom edges exact', () => {
    expect(lastValue('.ab4-block-clip-window', 'overflow')).toBe('visible')
    expect(lastValue('.ab4-block-clip-window', 'clip-path')).toMatch(/^inset\(0(px)? -\d+px 0(px)? -\d+px\)$/)
  })

  it("lift the first slice above the gaps' hover areas while its block is hovered or selected, as a whole block's toolbar is", () => {
    // clip-path makes the slice its own stacking context, so the toolbar's z-index 30 no longer counts on its own.
    expect(lastValue('.ab4-block-clip-window--head:has(.ab4-block:hover)', 'z-index')).toBe('30')
    expect(lastValue('.ab4-block-clip-window--head:has(.ab4-block--sel)', 'z-index')).toBe('30')
  })

  it("leave room above the first slice for the block's toolbar", () => {
    expect(lastValue('.ab4-block-clip-window--head', 'clip-path')).toMatch(/^inset\(-(2[4-9]|[3-9]\d)px -\d+px 0(px)? -\d+px\)$/)
  })
})
