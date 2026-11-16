import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Closed (Completed) modal: the Admin / Partner Commission Rate are set by the
 * partner's commission and can't be changed. Disabled, they still looked like
 * white, typeable fields; they read as read-only - grey, muted, the ordinary
 * arrow cursor (no "blocked" cursor), and never a text caret: a click passes
 * through them.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/funded-amount-modal.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const ruleFor = (selector: string) => {
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].split(',').map((s) => s.trim()).includes(selector)) return match[2]
  }
  return ''
}

describe('funded-amount-modal.css - read-only commission rates', () => {
  it('fills the field grey, mutes its text, and shows no caret or blocked cursor', () => {
    const rule = ruleFor('.fam-input .form-control.fam-rate--readonly')

    expect(rule).toMatch(/background(-color)?\s*:\s*var\(--fam-light\)/)
    expect(rule).toMatch(/(^|[;\s])color\s*:\s*var\(--fam-muted\)/)
    expect(rule).toMatch(/(^|[;\s])cursor\s*:\s*default/)
    expect(rule).not.toMatch(/not-allowed/)
    expect(rule).toMatch(/caret-color\s*:\s*transparent/)
    expect(rule).toMatch(/pointer-events\s*:\s*none/)
    expect(rule).toMatch(/opacity\s*:\s*1/)
  })
})
