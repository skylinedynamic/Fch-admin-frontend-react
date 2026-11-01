import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { BlockBody } from '../../../../../src/pages/settings/components/AgreementBuilder/BlockComponents'
import { makeBlock } from '../../../../../src/pages/settings/components/AgreementBuilder/utils'

const helpers = {
  onUpdate: () => {}, onDelete: () => {}, onMove: () => {}, onInsert: () => {},
  onSelect: () => {}, onFocused: () => {}, onBlurred: () => {}, selectedId: null, openFmForBlock: () => {},
}

const triggers = (kind: 'month' | 'year') =>
  document.querySelectorAll(`.fp-yd-trigger[data-kind="${kind}"]`)

describe('BlockBody date pickers', () => {
  it('a date field uses the shared month and year dropdowns', async () => {
    render(<BlockBody block={{ id: 'b1', type: 'date', fieldLabel: 'Label' } as any} helpers={helpers} />)

    await waitFor(() => {
      expect(triggers('year')).toHaveLength(1)
      expect(triggers('month')).toHaveLength(1)
    })
  })

  // The date signed is filled in on the signing page, so the builder shows where it goes, not a picker.
  it('a signature shows its signing line and where the date signed goes, without a picker', () => {
    const { container } = render(<BlockBody block={{ id: 'b1', type: 'signature', fieldLabel: 'Client signature' } as any} helpers={helpers} />)

    expect(container.querySelector('.p-sign-tag')?.textContent).toContain('Sign here')
    expect(container.textContent).toContain('Date signed')
    expect(triggers('year')).toHaveLength(0)
  })
})

/** The Header block: its text beside the logo is edited on the page, like any text block. */
describe('BlockBody header', () => {
  it('edits the text beside the logo in place', () => {
    const onUpdate = vi.fn()
    const block = { ...makeBlock('header'), id: 'h1' }
    const { container } = render(<BlockBody block={block as any} helpers={{ ...helpers, onUpdate }} />)

    const editor = container.querySelector('.p-letterhead-info .ab4-editor') as HTMLElement
    expect(editor.isContentEditable || editor.getAttribute('contenteditable') === 'true').toBe(true)
    editor.innerHTML = 'Acme Lending, licensed lender #123'
    fireEvent.input(editor)

    expect(onUpdate).toHaveBeenLastCalledWith('h1', { content: 'Acme Lending, licensed lender #123' })
  })

  it('opens the file manager from the logo', () => {
    const openFmForBlock = vi.fn()
    const { getByRole } = render(<BlockBody block={{ ...makeBlock('header'), id: 'h1' } as any} helpers={{ ...helpers, openFmForBlock }} />)

    fireEvent.click(getByRole('button', { name: 'Add your logo' }))

    expect(openFmForBlock).toHaveBeenCalledWith('h1')
  })
})
