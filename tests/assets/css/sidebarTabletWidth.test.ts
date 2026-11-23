import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Defect (R2 BUG-096, R2-OP-GLOB-02): from 768 to 991 px responsive.css takes
 * the page's left margin away (the app's mobile layout) but the theme only hides
 * the sidebar below 768 px, so the full sidebar covered the page's left 250 px.
 * There the sidebar is off-canvas until the menu button opens it, with the
 * overlay behind it (measured in Chromium with the app's CSS; pinned here).
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/responsive.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('responsive.css - sidebar from 768 to 991 px', () => {
  const tablet = mediaBlocks('(min-width: 768px) and (max-width: 991.98px)')

  it('keeps the sidebar off-canvas until the menu button opens it', () => {
    expect(lastValue(tablet, '[data-layout=vertical] .app-menu', 'margin-left')).toBe('-100%')
  })

  it('shows the overlay behind the open sidebar, so a click on the page closes it', () => {
    expect(lastValue(tablet, '.vertical-sidebar-enable .vertical-overlay', 'display')).toBe('block')
  })
})
