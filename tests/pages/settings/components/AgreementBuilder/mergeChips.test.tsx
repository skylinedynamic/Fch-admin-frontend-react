import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import {
  createMergeChip,
  decorateMergeFields,
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

  it('opens a menu of the values a field can be filled with when it is clicked', () => {
    const { chip } = renderBlock()

    fireEvent.click(chip)

    const menu = screen.getByRole('menu', { name: 'Fill this field with' })
    expect(within(menu).getByRole('menuitemradio', { name: /Signer's name/ })).toHaveAttribute('aria-checked', 'true')
    expect(within(menu).getByRole('menuitemradio', { name: /Your company name/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('fills the field with the value picked', () => {
    const { onUpdate, chip } = renderBlock()

    fireEvent.click(chip)
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Signer's email/ }))

    expect(onUpdate).toHaveBeenLastCalledWith({ content: 'Signed by {{signer.email}} today' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('removes the field', () => {
    const { onUpdate, chip } = renderBlock()

    fireEvent.click(chip)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove field' }))

    expect(onUpdate).toHaveBeenLastCalledWith({ content: 'Signed by  today' })
  })

  it('closes on Escape without changing anything', () => {
    const { onUpdate, chip } = renderBlock()

    fireEvent.click(chip)
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('menu')).toBeNull()
    expect(onUpdate).not.toHaveBeenCalled()
  })
})

describe('what a merge chip means', () => {
  it('says on hover that it fills in by itself, and that a click changes it', () => {
    const chip = createMergeChip('signer.name')

    expect(chip.title).toBe("Filled in automatically with the signer's name when the agreement is signed ({{signer.name}}). Click to change.")
  })
})
