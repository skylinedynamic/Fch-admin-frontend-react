import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../../test-utils'
// @ts-ignore - PropertyPanel is untyped JSX-in-TSX
import { PropertyPanel } from '../../../../../src/pages/settings/components/AgreementBuilder/PropertyPanel'
import { makeBlock } from '../../../../../src/pages/settings/components/AgreementBuilder/utils'
import { AGREEMENT_MERGE_FIELDS } from '../../../../../src/config/agreementMergeFields'

/**
 * Text blocks get an "Insert field" menu: a merge field such as
 * {{signer.name}} goes where the cursor is, and the server fills it with the
 * signer's details (fch-api AgreementMergeFields) - so nobody retypes their
 * name and address and no one's details are hard-coded into a template.
 */
const renderPanel = (block: any, u = vi.fn()) => {
  renderWithProviders(
    <PropertyPanel selected={block} u={u} onUpdate={vi.fn()} setBlocks={vi.fn()} selectedId={block.id}
      pagePad={80} setPagePad={vi.fn()} docBg="#ffffff" setDocBg={vi.fn()} />,
  )
  return u
}

describe('Agreement Builder › Insert field', () => {
  it('offers the merge fields the server fills, and nothing sensitive', () => {
    expect(AGREEMENT_MERGE_FIELDS.map((f) => f.key)).toEqual([
      'signer.name', 'signer.email', 'signer.phone', 'signer.address', 'signer.business_name', 'signer.business_address',
      'owner.company_name', 'owner.email', 'owner.phone', 'owner.address', 'today',
    ])
  })

  it('puts the field where the cursor is in the text being edited', async () => {
    const block = { ...makeBlock('text'), id: 't1', content: 'Signed by  today' }
    const editor = document.createElement('div')
    editor.className = 'ab4-editor'
    editor.contentEditable = 'true'
    editor.textContent = 'Signed by  today'
    document.body.appendChild(editor)
    const onInput = vi.fn()
    editor.addEventListener('input', onInput)
    const range = document.createRange()
    range.setStart(editor.firstChild!, 'Signed by '.length)
    range.collapse(true)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)
    const user = userEvent.setup()
    const u = renderPanel(block)

    await user.click(screen.getByRole('button', { name: /Insert field/ }))
    await user.click(screen.getByRole('menuitem', { name: "Signer's name" }))

    // Shown as a chip; the editor saves it as the bare {{signer.name}} (mergeChips).
    const chip = editor.querySelector('.ab4-merge-chip')
    expect(chip?.getAttribute('data-merge')).toBe('signer.name')
    expect(editor.textContent).toBe("Signed by Signer's name today")
    expect(onInput).toHaveBeenCalled()
    expect(u).not.toHaveBeenCalled()
    editor.remove()
  })

  it('adds the field at the end of the text when no text is being edited', async () => {
    window.getSelection()!.removeAllRanges()
    const block = { ...makeBlock('text'), id: 't1', content: 'Between ' }
    const user = userEvent.setup()
    const u = renderPanel(block)

    await user.click(screen.getByRole('button', { name: /Insert field/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Your company name' }))

    expect(u).toHaveBeenCalledWith({ content: 'Between {{owner.company_name}}' })
  })
})

describe('Agreement Builder › table controls', () => {
  it('adds and removes rows and columns of a table block', async () => {
    const user = userEvent.setup()
    const block = { ...makeBlock('table'), id: 't1' }
    const u = renderPanel(block)
    const rows = (content: string) => (content.match(/<tr>/g) || []).length

    await user.click(screen.getByRole('button', { name: 'Add row' }))
    expect(rows(u.mock.lastCall![0].content)).toBe(rows(block.content) + 1)

    await user.click(screen.getByRole('button', { name: 'Add column' }))
    expect(u.mock.lastCall![0].content.match(/<th>/g)).toHaveLength(4)

    await user.click(screen.getByRole('button', { name: 'Remove row' }))
    expect(rows(u.mock.lastCall![0].content)).toBe(rows(block.content) - 1)

    await user.click(screen.getByRole('button', { name: 'Remove column' }))
    expect(u.mock.lastCall![0].content.match(/<th>/g)).toHaveLength(2)
  })

  it('shows table controls only for a text block holding a table', () => {
    renderPanel({ ...makeBlock('text'), id: 't2' })
    expect(screen.queryByRole('button', { name: 'Add row' })).not.toBeInTheDocument()
  })
})

describe('Agreement Builder › header, logo and signature options', () => {
  it('a header\'s text takes merge fields from Insert field', async () => {
    const user = userEvent.setup()
    const u = renderPanel({ ...makeBlock('header'), id: 'h1', content: 'Acme' })

    await user.click(screen.getByRole('button', { name: /Insert field/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Your company phone' }))

    expect(u).toHaveBeenCalledWith({ content: expect.stringContaining('{{owner.phone}}') })
  })

  it('a header\'s logo size can be set', () => {
    renderPanel({ ...makeBlock('header'), id: 'h1' })

    expect(screen.getByRole('slider', { name: 'Logo width' })).toBeInTheDocument()
  })

  it('a logo is only a logo: no text to style', () => {
    renderPanel({ ...makeBlock('logo'), id: 'l1' })

    expect(screen.queryByRole('button', { name: /Insert field/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Logo style' })).not.toBeInTheDocument()
  })

  it('can print the signer\'s name under the signing line, off by default', async () => {
    const user = userEvent.setup()
    const u = renderPanel({ ...makeBlock('signature'), id: 's1' })

    const option = screen.getByRole('checkbox', { name: "Print the signer's name under the line" })
    expect(option).not.toBeChecked()
    await user.click(option)

    expect(u).toHaveBeenCalledWith({ showSignerName: true })
  })
})
