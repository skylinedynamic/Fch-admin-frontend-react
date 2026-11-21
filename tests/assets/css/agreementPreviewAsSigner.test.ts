import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Agreement Builder › Preview as Partner / Borrower (its signer list and the
 * "Previewing as" chip) and the Agreement tab's Preview Agreement dialog: they
 * match the app's other dialogs - 4px corners, a 37.5px search field - and the
 * tab's preview box carries the colours its status icon reads.
 */
const read = (file: string) => readFileSync(resolve(__dirname, '../../..', 'assets/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const builderCss = read('agreement-builder.css')
const customCss = read('custom.css')

const ruleFor = (css: string, selector: string) => {
  let body = ''
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].split(',').map((s) => s.trim()).includes(selector)) body += match[2] + ';'
  }
  return body
}

describe('agreement-builder.css - Preview as Partner / Borrower', () => {
  it('has no Partners / Clients tabs - each agreement lists only its own signers', () => {
    expect(ruleFor(builderCss, '.ab4-signers__tabs')).toBe('')
  })

  it('has a 37.5px search field with 4px corners', () => {
    const rule = ruleFor(builderCss, '.ab4-signers__search .form-control')
    expect(rule).toMatch(/height\s*:\s*37\.5px/)
    expect(rule).toMatch(/border-radius\s*:\s*4px/)
  })

  it('scrolls a long list inside the dialog', () => {
    const rule = ruleFor(builderCss, '.ab4-signers__list')
    expect(rule).toMatch(/max-height\s*:/)
    expect(rule).toMatch(/overflow-y\s*:\s*auto/)
  })

  it('lists each signer as a 4px-cornered row, the one previewed marked', () => {
    expect(ruleFor(builderCss, '.ab4-signers__row')).toMatch(/border-radius\s*:\s*4px/)
    expect(ruleFor(builderCss, '.ab4-signers__row--on')).toMatch(/border-color\s*:/)
  })

  it("marks each signer's enrollment and sign status in 4px badges, signed and not signed told apart by colour", () => {
    expect(ruleFor(builderCss, '.ab4-signers__tag')).toMatch(/border-radius\s*:\s*4px/)
    expect(ruleFor(builderCss, '.ab4-signers__status')).toMatch(/border-radius\s*:\s*4px/)
    const signed = ruleFor(builderCss, '.ab4-signers__status--signed').match(/(?:^|;)\s*color\s*:\s*([^;]+)/)?.[1]
    const unsigned = ruleFor(builderCss, '.ab4-signers__status--unsigned').match(/(?:^|;)\s*color\s*:\s*([^;]+)/)?.[1]
    expect(signed).toBeTruthy()
    expect(unsigned).toBeTruthy()
    expect(signed).not.toBe(unsigned)
  })

  it('shows who the preview is shown as in a 4px chip', () => {
    expect(ruleFor(builderCss, '.ab4-preview-as')).toMatch(/border-radius\s*:\s*4px/)
  })
})

describe('agreement-builder.css - Agreement tab preview', () => {
  it('opens wide, with the agreement filling the dialog', () => {
    expect(ruleFor(builderCss, '.ab4-agreement-preview')).toMatch(/max-width\s*:\s*960px/)
    const frame = ruleFor(builderCss, '.ab4-agreement-preview__frame')
    expect(frame).toMatch(/width\s*:\s*100%/)
    expect(frame).toMatch(/border-radius\s*:\s*4px/)
  })
})

describe('custom.css - Agreement tab "Not signed yet" box', () => {
  it('is a 4px-cornered box that defines the colours its status icon uses', () => {
    const rule = ruleFor(customCss, '.agr-preview')
    expect(rule).toMatch(/border-radius\s*:\s*4px/)
    expect(rule).toMatch(/--agr-primary\s*:/)
    expect(rule).toMatch(/--agr-primary-rgb\s*:/)
  })

  it('keeps Preview Agreement on one line at the end of the Awaiting signature row', () => {
    const rule = ruleFor(customCss, '.agr-preview__btn')
    expect(rule).toMatch(/margin-left\s*:\s*auto/)
    expect(rule).toMatch(/white-space\s*:\s*nowrap/)
  })
})
