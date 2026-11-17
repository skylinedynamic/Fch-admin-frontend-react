import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Agreement Builder › Save as Template dialog and the Templates dialog's "Your
 * templates": the dialog matches the builder's other dialogs (4px corners, a
 * 37.5px name field), and each saved template's delete button sits in its
 * card's corner without covering the card.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/agreement-builder.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const ruleFor = (selector: string) => {
  let body = ''
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].split(',').map((s) => s.trim()).includes(selector)) body += match[2] + ';'
  }
  return body
}

describe('agreement-builder.css - Save as Template dialog', () => {
  it('is a white 4px-cornered dialog like the others', () => {
    const rule = ruleFor('.ab4-save-template')
    expect(rule).toMatch(/border-radius\s*:\s*4px/)
    expect(rule).toMatch(/background\s*:\s*#fff/)
    expect(rule).toMatch(/max-width\s*:\s*440px/)
  })

  it('has a 37.5px name field with 4px corners', () => {
    const rule = ruleFor('.ab4-save-template .form-control')
    expect(rule).toMatch(/height\s*:\s*37\.5px/)
    expect(rule).toMatch(/border-radius\s*:\s*4px/)
  })

  it('puts Cancel and Save Template on the right', () => {
    const rule = ruleFor('.ab4-save-template__actions')
    expect(rule).toMatch(/display\s*:\s*flex/)
    expect(rule).toMatch(/justify-content\s*:\s*flex-end/)
  })
})

describe('agreement-builder.css - Your templates', () => {
  it('heads each section of the Templates dialog', () => {
    expect(ruleFor('.ab4-templates__section-title')).toMatch(/text-transform\s*:\s*uppercase/)
    expect(ruleFor('.ab4-templates__section + .ab4-templates__section')).toMatch(/margin-top\s*:\s*20px/)
  })

  it("puts a saved template's delete button in its card's top-right corner", () => {
    expect(ruleFor('.ab4-templates__saved')).toMatch(/position\s*:\s*relative/)
    const rule = ruleFor('.ab4-templates__delete')
    expect(rule).toMatch(/position\s*:\s*absolute/)
    expect(rule).toMatch(/top\s*:\s*8px/)
    expect(rule).toMatch(/right\s*:\s*8px/)
    expect(rule).toMatch(/border-radius\s*:\s*4px/)
  })

  it('stretches a saved card to its cell, leaving room for the rename and delete buttons', () => {
    const rule = ruleFor('.ab4-templates__saved .ab4-templates__card')
    expect(rule).toMatch(/width\s*:\s*100%/)
    expect(rule).toMatch(/padding-right\s*:\s*76px/)
  })

  it('turns the delete button red on hover', () => {
    expect(ruleFor('.ab4-templates__delete:hover')).toMatch(/color\s*:\s*#dc2626/)
  })
})

describe('agreement-builder.css - editing a saved template', () => {
  it("puts Rename beside Delete in the card's corner, with room left in the card", () => {
    const rule = ruleFor('.ab4-templates__rename')
    expect(rule).toMatch(/position\s*:\s*absolute/)
    expect(rule).toMatch(/top\s*:\s*8px/)
    expect(rule).toMatch(/right\s*:\s*40px/)
    expect(ruleFor('.ab4-templates__saved .ab4-templates__card')).toMatch(/padding-right\s*:\s*76px/)
  })

  it('gives the rename form a 37.5px field with 4px corners', () => {
    const rule = ruleFor('.ab4-templates__rename-form .form-control')
    expect(rule).toMatch(/height\s*:\s*37\.5px/)
    expect(rule).toMatch(/border-radius\s*:\s*4px/)
  })

  it('stacks the new / replace choice in the save dialog', () => {
    const rule = ruleFor('.ab4-save-template__modes')
    expect(rule).toMatch(/display\s*:\s*grid/)
  })

  it("styles the replace dropdown like the builder's fields: 37.5px, 4px corners, a full-width panel", () => {
    const field = ruleFor('.ab4-save-template .p-dropdown')
    expect(field).toMatch(/height\s*:\s*37\.5px/)
    expect(field).toMatch(/border-radius\s*:\s*4px/)
    expect(field).toMatch(/width\s*:\s*100%/)
    const panel = ruleFor('.ab4-save-template .p-dropdown-panel')
    expect(panel).toMatch(/border-radius\s*:\s*4px/)
    expect(panel).toMatch(/width\s*:\s*100%/)
    expect(ruleFor('.ab4-save-template .p-dropdown-item.p-highlight')).toMatch(/color\s*:\s*var\(--vz-primary/)
  })
})
