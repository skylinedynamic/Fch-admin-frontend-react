import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, within } from '../../../../test-utils'
// @ts-ignore - PropertyPanel is untyped JSX-in-TSX
import { PropertyPanel } from '../../../../../src/pages/settings/components/AgreementBuilder/PropertyPanel'
import { makeBlock } from '../../../../../src/pages/settings/components/AgreementBuilder/utils'
import { AGREEMENT_MERGE_FIELDS, AGREEMENT_ENROLLMENT_TABLE_INTRO } from '../../../../../src/config/agreementMergeFields'
import { MergeFieldsContext } from '../../../../../src/pages/settings/components/AgreementBuilder/mergeFieldsContext'

/**
 * "Insert Dynamic Value" (its own section at the top of the panel): a merge field such as
 * {{signer.name}} goes where the cursor is, and the server fills it with the
 * signer's details (fch-api AgreementMergeFields) - so nobody retypes their
 * name and address and no one's details are hard-coded into a template.
 *
 * The menu lists the groups (Signer, Your company, each Plan & Fee group ...);
 * a group opens in a modal with its values. Typing a search lists the matching
 * values straight away.
 */
/** Opens the menu and the group, the way a person picks a value. */
const openGroup = async (user: ReturnType<typeof userEvent.setup>, group: string) => {
  await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
  await user.click(screen.getByRole('button', { name: group }))
  return screen.getByRole('dialog', { name: group })
}

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

    await openGroup(user, 'Signer')
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

    await openGroup(user, 'Your company')
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

    await openGroup(user, 'Signer')
    await user.click(screen.getByRole('menuitem', { name: "Signer's name" }))

    expect(panel.onAddDynamicValue).toHaveBeenCalledWith('{{signer.name}}')
  })

  it('adds the value as a new text block when the selected block holds no text', async () => {
    window.getSelection()!.removeAllRanges()
    const user = userEvent.setup()
    const panel = renderPanel({ ...makeBlock('divider'), id: 'd1' })

    await openGroup(user, 'Other')
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

    const group = await openGroup(user, 'Plan & Fee: Borrower enrollment')

    expect(group).toHaveTextContent('Plan & Fee: Borrower enrollment')
    expect(screen.getByRole('menuitem', { name: /Installment: Total amount/ })).toBeInTheDocument()
  })

  it('adds a Plan & Fee value like any other', async () => {
    window.getSelection()!.removeAllRanges()
    const user = userEvent.setup()
    const onAdd = renderWithPlanFields(null)

    await openGroup(user, 'Plan & Fee: Borrower enrollment')
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
    expect(screen.getByRole('dialog', { name: 'Insert dynamic value' })).toBeInTheDocument()
    await user.click(document.body)

    expect(screen.queryByRole('dialog', { name: 'Insert dynamic value' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Insert Dynamic Value/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('stays open while you click inside it', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.click(screen.getByRole('searchbox', { name: 'Search dynamic values' }))

    expect(screen.getByRole('dialog', { name: 'Insert dynamic value' })).toBeInTheDocument()
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

    const group = screen.getByRole('button', { name: 'Plan & Fee: Borrower enrollment' })
    expect(group.querySelector('.ab4-insert-popover__group-count')?.textContent).toBe('3')
    expect(screen.getByRole('button', { name: 'Signer' }).querySelector('.ab4-insert-popover__group-count')?.textContent).toBe('6')
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Insert dynamic value' })).not.toBeInTheDocument()
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

    await openGroup(user, 'Plan & Fee: Borrower enrollment')
    const item = screen.getByRole('menuitem', { name: /Installment: Total amount/ })

    expect(item).toHaveTextContent('$3,000.00')
    expect(item).toHaveAttribute('title', '{{plan.borrower_enrollment.installment.total_amount}}')
  })

  it("shows no value next to the signer's details, only examples while a template is built", async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await openGroup(user, 'Signer')

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

    await openGroup(user, 'Plan & Fee: Borrower enrollment')

    const headings = Array.from(document.querySelectorAll('.ab4-insert-popover__plan')).map((h) => h.textContent)
    expect(headings).toEqual(['One Time Payment', 'Installment'])
    const item = screen.getByRole('menuitem', { name: 'Installment: Number of installments' })
    expect(item.querySelector('.ab4-insert-popover__label')?.textContent).toBe('Number of installments')
    expect(item.querySelector('.ab4-insert-popover__value')?.textContent).toBe('36')
  })

  it('keeps the fixed fields whole, with no plan heading', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await openGroup(user, 'Signer')

    expect(document.querySelectorAll('.ab4-insert-popover__plan')).toHaveLength(0)
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

describe('Agreement Builder › Insert Dynamic Value lists groups, each in a modal', () => {
  it('lists only the groups until a search is typed', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))

    const groups = screen.getByRole('list', { name: 'Dynamic value groups' })
    expect(Array.from(groups.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Signer', 'Your company', 'Other', 'Plan & Fee: Borrower enrollment',
    ])
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0)
  })

  it("opens a group in a modal with its values, and inserts the one clicked", async () => {
    window.getSelection()!.removeAllRanges()
    const user = userEvent.setup()
    const onAdd = renderWithPlanFields(null)

    const modal = await openGroup(user, 'Your company')

    expect(modal).toHaveAttribute('aria-modal', 'true')
    expect(screen.getAllByRole('menuitem').map((item) => item.getAttribute('aria-label'))).toEqual([
      'Your company name', 'Your company email', 'Your company phone', 'Your company address',
    ])
    await user.click(screen.getByRole('menuitem', { name: 'Your company email' }))

    expect(onAdd).toHaveBeenCalledWith('{{owner.email}}')
    expect(screen.queryByRole('dialog', { name: 'Your company' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Insert dynamic value' })).not.toBeInTheDocument()
  })

  it('Escape closes only the group, back to the list of groups', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await openGroup(user, 'Signer')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Signer' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Insert dynamic value' })).toBeInTheDocument()
  })

  it('closes only the group from its close button or a click beside it', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    await openGroup(user, 'Signer')
    await user.click(screen.getByRole('button', { name: 'Close group' }))
    expect(screen.queryByRole('dialog', { name: 'Signer' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Signer' }))
    await user.click(document.querySelector('.ab4-insert-group-backdrop') as HTMLElement)
    expect(screen.queryByRole('dialog', { name: 'Signer' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Insert dynamic value' })).toBeInTheDocument()
  })

  it('opens a group with the arrow keys and Enter, and picks a value the same way', async () => {
    window.getSelection()!.removeAllRanges()
    const user = userEvent.setup()
    const onAdd = renderWithPlanFields(null)

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    // From the search box: the first group is active; one down is Your company.
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByRole('dialog', { name: 'Your company' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Your company name' })).toHaveFocus()
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onAdd).toHaveBeenCalledWith('{{owner.email}}')
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

    await openGroup(user, 'Your company')
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

// fch-api AgreementEnrollmentFields: one table of the signer's own enrollment,
// its rows by their enrollment type - a template can't know which type a signer has.
describe("Agreement Builder › the signer's enrollment table", () => {
  const ENROLLMENT_FIELD = {
    key: 'signer.enrollment_table', label: 'Enrollment Details', group: 'Signer: Enrollment', html: true,
    sample: '<table class="ab-enrollment-table"><tbody><tr><td>Total enrollment amount</td><td>$6,000.00</td></tr></tbody></table>',
    variants: [
      { type: 'Installment', rows: ['Enrollment type', 'Total enrollment amount', 'Down payment', 'Subscription amount', 'Monthly subscription', 'Platform fee', 'Client activation fee'] },
      { type: 'One Time Payment', rows: ['Enrollment type', 'Total enrollment amount', 'Platform fee', 'Client activation fee'] },
    ],
  }
  const renderWithEnrollment = (onAddDynamicValue = vi.fn()) => {
    renderWithProviders(
      <MergeFieldsContext.Provider value={[...AGREEMENT_MERGE_FIELDS, ENROLLMENT_FIELD]}>
        <PropertyPanel selected={null} u={vi.fn()} onUpdate={vi.fn()} setBlocks={vi.fn()} selectedId={null}
          pagePad={80} setPagePad={vi.fn()} docBg="#ffffff" setDocBg={vi.fn()} onAddDynamicValue={onAddDynamicValue} />
      </MergeFieldsContext.Provider>,
    )
    return onAddDynamicValue
  }

  it('offers it as one Add Enrollment Details button, under its own group with the Signer icon', async () => {
    const user = userEvent.setup()
    renderWithEnrollment()

    await user.click(screen.getByRole('button', { name: /Insert Dynamic Value/ }))
    const group = screen.getByRole('button', { name: 'Signer: Enrollment' })
    expect(group.querySelector('i')).toHaveClass('ri-user-3-line')
    expect(group.querySelector('.ab4-insert-popover__group-count')?.textContent).toBe('1')
    await user.click(group)

    const modal = screen.getByRole('dialog', { name: 'Signer: Enrollment' })
    // A button, not a row of a list: there is one thing to add.
    expect(within(modal).queryAllByRole('menuitem')).toHaveLength(0)
    expect(within(modal).getByRole('button', { name: 'Add Enrollment Details' })).toHaveClass('btn-primary')
  })

  it('explains how the table works and which rows each enrollment type shows', async () => {
    const user = userEvent.setup()
    renderWithEnrollment()

    const modal = await openGroup(user, 'Signer: Enrollment')

    const info = within(modal).getByRole('note')
    // A warning box, as the Plan & Fee one.
    expect(info).toHaveClass('ab4-insert-group__warning')
    expect(info).toHaveTextContent("Shows a table of the signer's own enrollment, filled in when they sign.")
    expect(info).toHaveTextContent('The rows depend on their enrollment type:')
    const types = within(info).getAllByRole('listitem')
    expect(types.map((li) => li.querySelector('strong')?.textContent)).toEqual(['Installment', 'One Time Payment'])
    expect(types[0]).toHaveTextContent('Down payment')
    expect(types[1]).not.toHaveTextContent('Down payment')
    expect(types[1]).toHaveTextContent('Platform fee')
  })

  it('inserts the table with its title and description, the token alone in its paragraph', async () => {
    window.getSelection()!.removeAllRanges()
    const user = userEvent.setup()
    const onAdd = renderWithEnrollment()

    await openGroup(user, 'Signer: Enrollment')
    await user.click(screen.getByRole('button', { name: 'Add Enrollment Details' }))

    const snippet = onAdd.mock.calls[0][0] as string
    expect(snippet).toContain(`<p><strong>${AGREEMENT_ENROLLMENT_TABLE_INTRO.title}</strong></p>`)
    expect(snippet).toContain(AGREEMENT_ENROLLMENT_TABLE_INTRO.description)
    expect(snippet.endsWith('<p>{{signer.enrollment_table}}</p>')).toBe(true)
  })
})

// A Plan & Fee value is the current price: it follows changes on the Plan & Fee
// page until the agreement is signed, and a signed agreement keeps its value.
describe('Agreement Builder › the Plan & Fee note in a group', () => {
  it('explains that a Plan & Fee value follows the current Plan & Fee until signed', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    const modal = await openGroup(user, 'Plan & Fee: Borrower enrollment')

    const note = within(modal).getByRole('note')
    expect(note).toHaveTextContent('These values come from your current Plan & Fee.')
    expect(note).toHaveTextContent('They update automatically when you change them there, until the agreement is signed.')
    expect(note).toHaveTextContent('A signed agreement keeps the values it was signed with.')
  })

  it('shows no such note for the other groups', async () => {
    const user = userEvent.setup()
    renderWithPlanFields(null)

    const modal = await openGroup(user, 'Signer')

    expect(within(modal).queryByRole('note')).not.toBeInTheDocument()
  })
})
