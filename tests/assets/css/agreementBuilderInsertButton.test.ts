import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Agreement Builder › the + between two blocks. The insert line floats over the
 * gap with a transform, which makes it its own stacking context: the gap's
 * invisible hover area (.ab4-iz::after, z-index 1) then sat on top of the whole
 * line, + button included, and swallowed the click - the + showed but did
 * nothing. And every gap has the same z-index, so the gaps further down the
 * page painted over the open block picker and swallowed its clicks too. The line must stack above that hover area, and let clicks beside the
 * button through to it; the button and its picker take clicks.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/agreement-builder.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Every declaration of `prop` in rules for exactly `selector`; the last one wins. */
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

describe('agreement-builder.css - the + between blocks takes the click', () => {
  it('stacks the insert line above the gap hover area', () => {
    const hoverArea = Number(lastValue('.ab4-iz::after', 'z-index'))
    expect(Number(lastValue('.ab4-iz-line', 'z-index'))).toBeGreaterThan(hoverArea)
  })

  it('lets clicks beside the button through, but not on the button or its picker', () => {
    expect(lastValue('.ab4-iz-line', 'pointer-events')).toBe('none')
    expect(lastValue('.ab4-iz-btn', 'pointer-events')).toBe('auto')
    expect(lastValue('.ab4-iz-picker', 'pointer-events')).toBe('auto')
  })

  it('lifts the open gap, and its block picker, above the gaps after it', () => {
    const gap = Number(lastValue('.ab4-iz', 'z-index'))
    expect(Number(lastValue('.ab4-iz.ab4-iz--active', 'z-index'))).toBeGreaterThan(gap)
  })
})
