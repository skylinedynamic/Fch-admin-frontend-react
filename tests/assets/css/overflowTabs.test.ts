import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A page's tabs stay on one line (OverflowTabs): the line never wraps, tabs
 * show a pointer (not-allowed when disabled), and More's dropdown matches the
 * app's 4px corners and sits above the page.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/custom.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const ruleFor = (selector: string) => {
  let body = ''
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].split(',').map((s) => s.trim()).includes(selector)) body += match[2] + ';'
  }
  return body
}

describe('custom.css - OverflowTabs', () => {
  it('keeps the tabs on one line', () => {
    const rule = ruleFor('.overflow-tabs__list')
    expect(rule).toMatch(/flex-wrap\s*:\s*nowrap/)
    expect(rule).toMatch(/white-space\s*:\s*nowrap/)
  })

  it('shows a pointer over a tab, and not-allowed over a disabled one', () => {
    expect(ruleFor('.overflow-tabs__list .nav-link')).toMatch(/cursor\s*:\s*pointer/)
    const disabled = ruleFor('.overflow-tabs__list .nav-link.disabled')
    expect(disabled).toMatch(/cursor\s*:\s*not-allowed/)
    // Bootstrap's .disabled turns pointer events off, which would hide the cursor.
    expect(disabled).toMatch(/pointer-events\s*:\s*auto/)
  })

  it('shows a pointer over More and its tabs', () => {
    expect(ruleFor('.overflow-tabs__more-btn')).toMatch(/cursor\s*:\s*pointer/)
    expect(ruleFor('.overflow-tabs__item')).toMatch(/cursor\s*:\s*pointer/)
  })

  it('keeps More unseen while the tabs are measured', () => {
    expect(ruleFor('.overflow-tabs--measuring .overflow-tabs__more')).toMatch(/visibility\s*:\s*hidden/)
  })

  it("opens More's list with 4px corners, above the page", () => {
    const rule = ruleFor('.overflow-tabs__menu')
    expect(rule).toMatch(/border-radius\s*:\s*4px/)
    expect(rule).toMatch(/z-index\s*:/)
  })
})
