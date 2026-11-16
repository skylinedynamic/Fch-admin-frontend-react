import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Closed (Completed) modal: while it saves, Confirm & Update is disabled and
 * reads "Processing...". Bootstrap's `.btn:disabled` makes a button with no
 * variant transparent, so the green button vanished and only the text was
 * left. The disabled buttons keep their own look.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/funded-amount-modal.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const ruleFor = (selector: string) => {
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].split(',').map((s) => s.trim()).includes(selector)) return match[2]
  }
  return ''
}

describe('funded-amount-modal.css - buttons while saving', () => {
  it('keeps Confirm & Update green, with white text, when disabled', () => {
    const rule = ruleFor('.fam-footer .fam-btn-confirm:disabled')

    expect(rule).toMatch(/background(-color)?\s*:\s*var\(--fam-success\)/)
    expect(rule).toMatch(/(^|[;\s])color\s*:\s*#fff/)
    expect(rule).toMatch(/border-color\s*:\s*transparent/)
  })

  it('keeps Cancel white with its border when disabled', () => {
    const rule = ruleFor('.fam-footer .fam-btn-cancel:disabled')

    expect(rule).toMatch(/background(-color)?\s*:\s*#fff/)
    expect(rule).toMatch(/border-color\s*:\s*var\(--fam-line\)/)
  })
})
