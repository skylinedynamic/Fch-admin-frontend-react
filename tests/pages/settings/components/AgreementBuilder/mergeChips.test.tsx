import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import {
  createMergeChip,
  decorateMergeFields,
  registerMergeFieldLabels,
  undecorateMergeFields,
} from '../../../../../src/pages/settings/components/AgreementBuilder/mergeChips'
// @ts-ignore - BlockComponents is untyped JSX-in-TSX
import { TextBlock } from '../../../../../src/pages/settings/components/AgreementBuilder/BlockComponents'
import { makeBlock } from '../../../../../src/pages/settings/components/AgreementBuilder/utils'

/**
 * In the builder's canvas a merge field shows as a labelled chip ("Signer's
 * name") that can't be half-deleted; the saved text keeps the bare
 * {{signer.name}} the server fills.
 */
describe('merge field chips', () => {
  it('shows each known merge field as a labelled chip', () => {
    const html = decorateMergeFields('Between {{owner.company_name}} and {{ signer.name }}.')

    const div = document.createElement('div')
    div.innerHTML = html
    const chips = Array.from(div.querySelectorAll('.ab4-merge-chip'))
    expect(chips.map((c) => [c.getAttribute('data-merge'), c.textContent, c.getAttribute('contenteditable')])).toEqual([
      ['owner.company_name', 'Your company name', 'false'],
      ['signer.name', "Signer's name", 'false'],
    ])
  })

  // Plan & Fee keys come from the API and may hold digits (an "11-month" plan).
  it('shows a Plan & Fee value as a chip labelled from the list the builder loaded', () => {
    registerMergeFieldLabels([{
      key: 'plan.partner_enrollment.white_label_partner_wl.payment_plan_11_month_plan.total_amount',
      label: 'White-Label Partner (WL) · Payment Plan (11-month plan): Total amount',
      group: 'Plan & Fee: Partner enrollment', sample: '$7,696.70',
    }])
    const div = document.createElement('div')
    div.innerHTML = decorateMergeFields('Fee {{plan.partner_enrollment.white_label_partner_wl.payment_plan_11_month_plan.total_amount}}')

    const chip = div.querySelector('.ab4-merge-chip')
    expect(chip?.getAttribute('data-merge')).toBe('plan.partner_enrollment.white_label_partner_wl.payment_plan_11_month_plan.total_amount')
    expect(chip?.textContent).toBe('White-Label Partner (WL) · Payment Plan (11-month plan): Total amount')
  })

  // Not loaded yet, or the plan was switched off: still a chip, so it is not typed over.
  it('shows a Plan & Fee value it has no label for as a plain Plan & Fee chip', () => {
    const div = document.createElement('div')
    div.innerHTML = decorateMergeFields('{{plan.borrower_enrollment.old_plan.total_amount}}')

    expect(div.querySelector('.ab4-merge-chip')?.textContent).toBe('Plan & Fee value')
  })

  it('leaves unknown fields as typed', () => {
    expect(decorateMergeFields('{{signer.ssn}}')).toBe('{{signer.ssn}}')
  })

  it('saves chips back as bare merge fields, and the rest unchanged', () => {
    const original = '<b>Between</b> {{owner.company_name}} and {{signer.name}}.'

    expect(undecorateMergeFields(decorateMergeFields(original))).toBe(original.replace('{{ signer.name }}', '{{signer.name}}'))
  })
})

describe('TextBlock with merge fields', () => {
  it('shows merge fields as chips and saves the bare fields as it is edited', () => {
    const onUpdate = vi.fn()
    const block = { ...makeBlock('text'), id: 't1', content: 'Signed by {{signer.name}}' }
    const { container } = render(<TextBlock block={block} onUpdate={onUpdate} onFocused={vi.fn()} onBlurred={vi.fn()} />)

    const editor = container.querySelector('.ab4-editor') as HTMLElement
    expect(editor.querySelector('.ab4-merge-chip')?.textContent).toBe("Signer's name")

    editor.appendChild(document.createTextNode(' today'))
    fireEvent.input(editor)

    expect(onUpdate).toHaveBeenLastCalledWith({ content: 'Signed by {{signer.name}} today' })
  })

  it('shows content changed from outside the editor, such as a field added from the menu', () => {
    const block = { ...makeBlock('text'), id: 't1', content: 'Between ' }
    const props = { onUpdate: vi.fn(), onFocused: vi.fn(), onBlurred: vi.fn() }
    const { container, rerender } = render(<TextBlock block={block} {...props} />)

    rerender(<TextBlock block={{ ...block, content: 'Between {{owner.company_name}}' }} {...props} />)

    const chip = container.querySelector('.ab4-editor .ab4-merge-chip')
    expect(chip?.getAttribute('data-merge')).toBe('owner.company_name')
  })
})

describe('mapping a merge chip to another value', () => {
  const renderBlock = () => {
    const onUpdate = vi.fn()
    const block = { ...makeBlock('text'), id: 't1', content: 'Signed by {{signer.name}} today' }
    const { container } = render(<TextBlock block={block} onUpdate={onUpdate} onFocused={vi.fn()} onBlurred={vi.fn()} />)
    const chip = container.querySelector('.ab4-merge-chip') as HTMLElement
    return { onUpdate, chip }
  }
  const menu = () => screen.getByRole('menu', { name: 'Fill this field with' })

  // As Insert Dynamic Value: the groups first, a group's values in a modal.
  it('opens a menu of the groups when the field is clicked, its own group marked, and a Remove button', () => {
    const { chip } = renderBlock()

    fireEvent.click(chip)

    expect(within(menu()).getByText("Signer's name")).toBeInTheDocument()
    const groups = within(menu()).getAllByRole('menuitem').filter((el) => el.getAttribute('aria-haspopup') === 'dialog')
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['Signer', 'Your company', 'Other'])
    expect(within(menu()).getByRole('menuitem', { name: 'Signer' })).toHaveClass('is-current')
    expect(within(menu()).getByRole('menuitem', { name: 'Your company' })).not.toHaveClass('is-current')
    expect(within(menu()).queryAllByRole('menuitemradio')).toHaveLength(0)
    expect(within(menu()).getByRole('menuitem', { name: 'Remove field' })).toBeInTheDocument()
  })

  it("opens a group's values in a modal, the field's value checked", () => {
    const { chip } = renderBlock()

    fireEvent.click(chip)
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Signer' }))

    const modal = screen.getByRole('dialog', { name: 'Signer' })
    expect(within(modal).getByRole('menuitemradio', { name: /Signer's name/ })).toHaveAttribute('aria-checked', 'true')
    expect(within(modal).getByRole('menuitemradio', { name: /Signer's email/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('fills the field with the value picked in the group, and closes', () => {
    const { onUpdate, chip } = renderBlock()

    fireEvent.click(chip)
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Your company' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Your company' })).getByRole('menuitemradio', { name: /Your company email/ }))

    expect(onUpdate).toHaveBeenLastCalledWith({ content: 'Signed by {{owner.email}} today' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // Defect: the group's modal takes the focus, the text loses it and rewrites
  // its HTML - the chip the menu was opened from was no longer on the page, so
  // the value picked changed nothing.
  it('fills the field even when the text was redrawn while the group was open', () => {
    const { onUpdate, chip } = renderBlock()
    const editor = chip.closest('.ab4-editor') as HTMLElement

    fireEvent.click(chip)
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Your company' }))
    editor.innerHTML = editor.innerHTML
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Your company' })).getByRole('menuitemradio', { name: /Your company email/ }))

    expect(onUpdate).toHaveBeenLastCalledWith({ content: 'Signed by {{owner.email}} today' })
  })

  it('removes the field', () => {
    const { onUpdate, chip } = renderBlock()

    fireEvent.click(chip)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove field' }))

    expect(onUpdate).toHaveBeenLastCalledWith({ content: 'Signed by  today' })
  })

  it('Escape closes the group first, then the menu, without changing anything', () => {
    const { onUpdate, chip } = renderBlock()

    fireEvent.click(chip)
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Signer' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Signer' })).toBeNull()
    expect(menu()).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it("a click in the group's modal does not close the menu behind it", () => {
    const { chip } = renderBlock()

    fireEvent.click(chip)
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Signer' }))
    fireEvent.mouseDown(screen.getByRole('dialog', { name: 'Signer' }))

    expect(screen.getByRole('dialog', { name: 'Signer' })).toBeInTheDocument()
    expect(menu()).toBeInTheDocument()
  })
})

describe('what a merge chip means', () => {
  it('says on hover that it fills in by itself, and that a click changes it', () => {
    const chip = createMergeChip('signer.name')

    expect(chip.title).toBe("Filled in automatically with the signer's name when the agreement is signed ({{signer.name}}). Click to change.")
  })
})
