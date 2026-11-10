import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../../test-utils'
// @ts-ignore - PropertyPanel is untyped JSX-in-TSX
import { PropertyPanel } from '../../../../../src/pages/settings/components/AgreementBuilder/PropertyPanel'
import { makeBlock } from '../../../../../src/pages/settings/components/AgreementBuilder/utils'
import { AGREEMENT_MERGE_FIELDS } from '../../../../../src/config/agreementMergeFields'
import { MergeFieldsContext } from '../../../../../src/pages/settings/components/AgreementBuilder/mergeFieldsContext'

/**
 * "Insert Dynamic Value" (its own section at the top of the panel): a merge field such as
 * {{signer.name}} goes where the cursor is, and the server fills it with the
 * signer's details (fch-api AgreementMergeFields) - so nobody retypes their
 * name and address and no one's details are hard-coded into a template.
 */
const renderPanel = (block: any, u = vi.fn(), onAddDynamicValue = vi.fn()) => {
  const view = renderWithProviders(
    <PropertyPanel selected={block} u={u} onUpdate={vi.fn()} setBlocks={vi.fn()} selectedId={block?.id ?? null}
      pagePad={80} setPagePad={vi.fn()} docBg="#ffffff" setDocBg={vi.fn()} onAddDynamicValue={onAddDynamicValue} />,
  )
  return Object.assign(u, { onAddDynamicValue, container: view.container })
}

describe('Agreement Builder › Insert Dynamic Value', () => {
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

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
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

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Your company name' }))

    expect(u).toHaveBeenCalledWith({ content: 'Between {{owner.company_name}}' })
  })

  it('sits in its own section at the top of the panel, even with nothing selected', () => {
    const { container } = renderPanel(null)

    const panel = container.querySelector('.ab4-props') as HTMLElement
    const section = panel.firstElementChild as HTMLElement
    expect(section).toHaveClass('ab4-dynamic-values')
    expect(section).toHaveTextContent('Insert Dynamic Value')
    expect(screen.queryByRole('button', { name: /Insert field/ })).not.toBeInTheDocument()
  })

  it('stays at the top, once, when a block is selected', () => {
    const { container } = renderPanel({ ...makeBlock('text'), id: 't1' })

    const panel = container.querySelector('.ab4-props') as HTMLElement
    expect(panel.firstElementChild).toHaveClass('ab4-dynamic-values')
    expect(screen.getAllByRole('button', { name: /Insert Dynamic Value/ })).toHaveLength(1)
  })

  // An empty page has no text block to put it in, so it comes in a new one.
  it('adds the value as a new text block when nothing is selected', async () => {
    window.getSelection()!.removeAllRanges()
    const user = userEvent.setup()
    const panel = renderPanel(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.click(screen.getByRole('menuitem', { name: "Signer's name" }))

    expect(panel.onAddDynamicValue).toHaveBeenCalledWith('{{signer.name}}')
  })

  it('adds the value as a new text block when the selected block holds no text', async () => {
    window.getSelection()!.removeAllRanges()
    const user = userEvent.setup()
    const panel = renderPanel({ ...makeBlock('divider'), id: 'd1' })

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.click(screen.getByRole('menuitem', { name: "Today's date" }))

    expect(panel.onAddDynamicValue).toHaveBeenCalledWith('{{today}}')
    expect(panel).not.toHaveBeenCalled()
  })
})

const PLAN_FIELDS = [
  { key: 'plan.borrower_enrollment.one_time_payment.total_amount', label: 'One Time Payment: Total amount', group: 'Plan & Fee: Borrower enrollment', sample: '$2,497.00' },
  { key: 'plan.borrower_enrollment.installment.total_amount', label: 'Installment: Total amount', group: 'Plan & Fee: Borrower enrollment', sample: '$3,000.00' },
  { key: 'plan.borrower_enrollment.installment.installments', label: 'Installment: Number of installments', group: 'Plan & Fee: Borrower enrollment', sample: '36' },
]

/** The panel with the builder's full list: the fixed fields plus Plan & Fee from the API. */
const renderWithPlanFields = (block: any, onAddDynamicValue = vi.fn()) => {
  renderWithProviders(
    <MergeFieldsContext.Provider value={[...AGREEMENT_MERGE_FIELDS, ...PLAN_FIELDS]}>
      <PropertyPanel selected={block} u={vi.fn()} onUpdate={vi.fn()} setBlocks={vi.fn()} selectedId={block?.id ?? null}
        pagePad={80} setPagePad={vi.fn()} docBg="#ffffff" setDocBg={vi.fn()} onAddDynamicValue={onAddDynamicValue} />
    </MergeFieldsContext.Provider>,
  )
  return onAddDynamicValue
}

describe('Agreement Builder › Plan & Fee dynamic values and search', () => {
  it('lists the Plan & Fee values the builder was given, under their own group', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))

    expect(screen.getByText('Plan & Fee: Borrower enrollment')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Installment: Total amount/ })).toBeInTheDocument()
  })

  it('adds a Plan & Fee value like any other', async () => {
    window.getSelection()!.removeAllRanges()
    const user = userEvent.setup()
    const onAdd = renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.click(screen.getByRole('menuitem', { name: /Installment: Number of installments/ }))

    expect(onAdd).toHaveBeenCalledWith('{{plan.borrower_enrollment.installment.installments}}')
  })

  it('filters the values by what is typed in the search box, across groups', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    const search = screen.getByRole('searchbox', { name: 'Search dynamic values' })
    expect(search).toHaveFocus()
    await user.type(search, 'install')

    expect(screen.getAllByRole('menuitem').map((item) => item.getAttribute('aria-label'))).toEqual([
      'Installment: Total amount', 'Installment: Number of installments',
    ])
    // Groups with nothing left are hidden.
    expect(screen.queryByText('Signer')).not.toBeInTheDocument()
  })

  it('also matches the group name, ignoring case', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Search dynamic values' }), 'YOUR COMPANY')

    expect(screen.getAllByRole('menuitem')).toHaveLength(4)
  })

  it('says so when nothing matches', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Search dynamic values' }), 'zzz')

    expect(screen.queryAllByRole('menuitem')).toHaveLength(0)
    expect(screen.getByText('No dynamic values match "zzz".')).toBeInTheDocument()
  })

  it('closes when you click outside it', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    expect(screen.getByRole('menu', { name: 'Dynamic values' })).toBeInTheDocument()
    await user.click(document.body)

    expect(screen.queryByRole('menu', { name: 'Dynamic values' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Insert Dynamic Value/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('stays open while you click inside it', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.click(screen.getByRole('searchbox', { name: 'Search dynamic values' }))

    expect(screen.getByRole('menu', { name: 'Dynamic values' })).toBeInTheDocument()
  })

  it('opens with a heading, and closes from its close button', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    const drawer = screen.getByRole('dialog', { name: 'Insert dynamic value' })
    expect(drawer).toHaveTextContent('Filled in automatically when the agreement is signed.')
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog', { name: 'Insert dynamic value' })).not.toBeInTheDocument()
  })

  it('shows how many values each group holds', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))

    const title = screen.getByText('Plan & Fee: Borrower enrollment').closest('.ab4-insert-popover__group-title') as HTMLElement
    expect(title.querySelector('.ab4-insert-popover__group-count')?.textContent).toBe('3')
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu', { name: 'Dynamic values' })).not.toBeInTheDocument()
  })

  it('picks a value with the arrow keys and Enter, from the search box', async () => {
    window.getSelection()!.removeAllRanges()
    const user = userEvent.setup()
    const onAdd = renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Search dynamic values' }), 'install')
    await user.keyboard('{ArrowDown}{Enter}')

    // The first match is active from the start; one step down is the second.
    expect(onAdd).toHaveBeenCalledWith('{{plan.borrower_enrollment.installment.installments}}')
  })

  it('shows the price next to a Plan & Fee value, and the field key on hover', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    const item = screen.getByRole('menuitem', { name: /Installment: Total amount/ })

    expect(item).toHaveTextContent('$3,000.00')
    expect(item).toHaveAttribute('title', '{{plan.borrower_enrollment.installment.total_amount}}')
    // The signer's details are only examples while a template is built: no value shown.
    expect(screen.getByRole('menuitem', { name: "Signer's name" })).not.toHaveTextContent('Jane Doe')
  })

  it('highlights what matched the search', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Search dynamic values' }), 'install')

    // "Install" is in the plan's name, shown as the heading over its rows.
    expect(document.querySelector('.ab4-insert-popover__plan mark')?.textContent).toBe('Install')
  })

  // Long Plan & Fee names would wrap and crowd the price: the plan's name heads its
  // rows, and each row is the short field name with the price beside it.
  it('heads each plan\'s rows with its name, and keeps the rows short', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))

    const headings = Array.from(document.querySelectorAll('.ab4-insert-popover__plan')).map((h) => h.textContent)
    expect(headings).toEqual(['One Time Payment', 'Installment'])
    const item = screen.getByRole('menuitem', { name: 'Installment: Number of installments' })
    expect(item.querySelector('.ab4-insert-popover__label')?.textContent).toBe('Number of installments')
    expect(item.querySelector('.ab4-insert-popover__value')?.textContent).toBe('36')
    // The fixed fields have no plan heading.
    expect(screen.getByRole('menuitem', { name: "Signer's name" }).querySelector('.ab4-insert-popover__label')?.textContent).toBe("Signer's name")
  })

  it('starts with an empty search each time it opens', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)
    const toggle = screen.getByRole('button', { name: /Insert Dynamic Value/ })

    await user.click(toggle)
    await user.type(screen.getByRole('searchbox', { name: 'Search dynamic values' }), 'zzz')
    await user.click(toggle)
    await user.click(toggle)

    expect(screen.getByRole('searchbox', { name: 'Search dynamic values' })).toHaveValue('')
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
  it('a header\'s text takes merge fields from Insert Dynamic Value', async () => {
    const user = userEvent.setup()
    const u = renderPanel({ ...makeBlock('header'), id: 'h1', content: 'Acme' })

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Your company phone' }))

    expect(u).toHaveBeenCalledWith({ content: expect.stringContaining('{{owner.phone}}') })
  })

  it('a header\'s logo size can be set', () => {
    renderPanel({ ...makeBlock('header'), id: 'h1' })

    expect(screen.getByRole('slider', { name: 'Logo width' })).toBeInTheDocument()
  })

  it('a logo is only a logo: no text to style', () => {
    renderPanel({ ...makeBlock('logo'), id: 'l1' })

    // Only the panel's own "Insert Dynamic Value" section; nothing in the logo's settings.
    expect(screen.getAllByRole('button', { name: /Insert Dynamic Value/ })).toHaveLength(1)
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
