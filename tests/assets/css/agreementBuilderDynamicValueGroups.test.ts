import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Agreement Builder › Insert Dynamic Value: the drawer lists the groups as rows
 * to click (icon, name, count, a chevron), and a group opens in a modal over
 * the drawer with its values - 4px corners like the builder's other dialogs.
 */
const css = readFileSync(resolve(__dirname, '../../..', 'assets/css/agreement-builder.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const ruleFor = (selector: string) => {
  let body = ''
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].split(',').map((s) => s.trim()).includes(selector)) body += match[2] + ';'
  }
  return body
}

describe('agreement-builder.css - dynamic value groups', () => {
  it('shows each group as a full-width row with its count and a chevron', () => {
    const row = ruleFor('.ab4-insert-popover__group-btn')
    expect(row).toMatch(/display\s*:\s*flex/)
    expect(row).toMatch(/width\s*:\s*100%/)
    expect(row).toMatch(/cursor\s*:\s*pointer/)
    expect(ruleFor('.ab4-insert-popover__group-btn .ab4-insert-popover__group-count')).toMatch(/margin-left\s*:\s*auto/)
    expect(ruleFor('.ab4-insert-popover__group-btn.is-active')).toMatch(/background/)
  })

  it('opens a group in a modal above the drawer, with a backdrop', () => {
    const backdrop = ruleFor('.ab4-insert-group-backdrop')
    expect(backdrop).toMatch(/position\s*:\s*fixed/)
    const drawerZ = Number((ruleFor('.ab4-insert-popover').match(/z-index\s*:\s*(\d+)/) ?? [])[1])
    const backdropZ = Number((backdrop.match(/z-index\s*:\s*(\d+)/) ?? [])[1])
    expect(backdropZ).toBeGreaterThan(drawerZ)

    const modal = ruleFor('.ab4-insert-group')
    expect(modal).toMatch(/border-radius\s*:\s*4px/)
    expect(modal).toMatch(/max-height/)
    expect(ruleFor('.ab4-insert-group__list')).toMatch(/overflow-y\s*:\s*auto/)
  })
})

describe('agreement-builder.css - the Plan & Fee warning in a group', () => {
  it('is an amber warning box with 4px corners and its icon', () => {
    const note = ruleFor('.ab4-insert-group__warning')
    expect(note).toMatch(/display\s*:\s*flex/)
    expect(note).toMatch(/border-radius\s*:\s*4px/)
    expect(note).toMatch(/background\s*:\s*rgba\(var\(--vz-warning-rgb/)
    expect(note).toMatch(/border\s*:\s*1px solid rgba\(var\(--vz-warning-rgb/)
    expect(ruleFor('.ab4-insert-group__warning i')).toMatch(/color\s*:\s*var\(--vz-warning/)
  })
})

describe("agreement-builder.css - a field's own menu (MergeChipMenu)", () => {
  it('shows the current value, marks its group, and checks the current value in the group', () => {
    expect(ruleFor('.ab4-chip-menu__current')).toMatch(/display\s*:\s*flex/)
    expect(ruleFor('.ab4-chip-menu__group-btn.is-current')).toMatch(/background/)
    expect(ruleFor('.ab4-insert-popover__check')).toMatch(/color\s*:\s*var\(--vz-primary/)
  })

  it('stays under the group modal it opens', () => {
    const menuZ = Number((ruleFor('.ab4-chip-menu').match(/z-index\s*:\s*(\d+)/) ?? [])[1])
    const backdropZ = Number((ruleFor('.ab4-insert-group-backdrop').match(/z-index\s*:\s*(\d+)/) ?? [])[1])
    expect(backdropZ).toBeGreaterThan(menuZ)
  })
})

describe('agreement-builder.css - how the enrollment table works, in its group', () => {
  it('is a blue info box with 4px corners, listing the rows per enrollment type', () => {
    const info = ruleFor('.ab4-insert-group__info')
    expect(info).toMatch(/display\s*:\s*flex/)
    expect(info).toMatch(/border-radius\s*:\s*4px/)
    expect(info).toMatch(/background\s*:\s*rgba\(var\(--vz-primary-rgb/)
    expect(ruleFor('.ab4-insert-group__info i')).toMatch(/color\s*:\s*var\(--vz-primary/)
    expect(ruleFor('.ab4-insert-group__info ul')).toMatch(/padding-left/)
  })
})

describe('agreement-builder.css - the enrollment table in its group', () => {
  it('lists the rows of each enrollment type inside the warning box, the type inline with its rows', () => {
    expect(ruleFor('.ab4-insert-group__variants ul')).toMatch(/padding-left/)
    // The warning's own title is a block; a type's name in the list is not.
    expect(ruleFor('.ab4-insert-group__variants li strong')).toMatch(/display\s*:\s*inline/)
  })

  it('puts the Add button on the right, under the warning, with 4px corners', () => {
    const actions = ruleFor('.ab4-insert-group__actions')
    expect(actions).toMatch(/display\s*:\s*flex/)
    expect(actions).toMatch(/justify-content\s*:\s*flex-end/)
    expect(ruleFor('.ab4-insert-group__add')).toMatch(/border-radius\s*:\s*4px/)
  })
})
