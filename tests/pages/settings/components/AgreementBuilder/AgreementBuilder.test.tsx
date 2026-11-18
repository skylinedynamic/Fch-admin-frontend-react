import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, renderWithProviders, screen, waitFor, within } from '../../../../test-utils'
import { server } from '../../../../mocks/server'
import AgreementBuilder from '../../../../../src/pages/settings/components/AgreementBuilder'
import { ConfigPartnerProvider } from '../../../../../src/modules/settings/configPartner'
import { useAuthStore } from '../../../../../src/store/auth'
import { AGREEMENT_COMMISSION_TABLE_FIELD_KEY, AGREEMENT_COMMISSION_TABLE_INTRO, AGREEMENT_ENROLLMENT_TABLE_FIELD_KEY, AGREEMENT_ENROLLMENT_TABLE_INTRO } from '../../../../../src/config/agreementMergeFields'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// The dashboard (agreement list, settings) is not what is under test here:
// it only has to open the builder.
vi.mock('../../../../../src/pages/settings/components/AgreementBuilder/AgreementDashboard', () => ({
  AgreementDashboard: ({ onEdit }: { onEdit: (t: 'partner' | 'borrower') => void }) => (
    <>
      <button onClick={() => onEdit('partner')}>Edit partner agreement</button>
      <button onClick={() => onEdit('borrower')}>Edit borrower agreement</button>
    </>
  ),
}))

/** The agreement type each builder asked for Plan & Fee dynamic values, and what it got back. */
let mergeFieldsAskedFor: string[] = []
let planFields: Record<string, unknown>[] = []

const openBuilder = async (ui: ReactElement = <AgreementBuilder />, type: 'partner' | 'borrower' = 'partner') => {
  mergeFieldsAskedFor = []
  server.use(
    http.post('*/common/agreement-templates/show', () => HttpResponse.json({ status: true, data: null })),
    // Templates lists the partner's saved templates beside the built-in ones: none here.
    http.get('*/common/agreement-templates/saved', () => HttpResponse.json({ status: true, data: [] })),
    http.post('*/common/agreement-templates/merge-fields', async ({ request }) => {
      const body = (await request.json()) as { type: string }
      mergeFieldsAskedFor.push(body.type)
      return HttpResponse.json({ status: true, data: planFields })
    }),
  )
  const view = renderWithProviders(ui)
  fireEvent.click(screen.getByRole('button', { name: `Edit ${type} agreement` }))
  await screen.findByText('Save Agreement')
  return view
}

/**
 * The editor's toolbar. Role queries on the whole document work out the role
 * and name of every element of the full-screen editor - about half a second
 * each locally, several times that on a loaded CI runner, which took tests past
 * their 20 s timeout. Queries for toolbar controls stay inside the toolbar.
 */
const toolbar = () => within(document.querySelector('.ab4-toolbar') as HTMLElement)

/** The Insert Dynamic Value popover (portalled to the page, outside the panel). */
const popover = () => within(document.querySelector('.ab4-insert-popover') as HTMLElement)

/** A group of the Insert Dynamic Value menu, opened in its modal. */
const openValueGroup = (group: string) => {
  fireEvent.click(popover().getByRole('button', { name: group }))
  return within(screen.getByRole('dialog', { name: group }))
}

describe('AgreementBuilder calendar', () => {
  it('the preview opens the app calendar in the agreement date fields', async () => {
    await openBuilder()

    fireEvent.click(toolbar().getByRole('button', { name: 'Preview' }))

    const frame = await screen.findByTitle('Preview')
    expect(frame.getAttribute('srcdoc')).toContain('data-app-calendar')
  })

  it('the preview has no Download PDF button', async () => {
    await openBuilder()

    fireEvent.click(toolbar().getByRole('button', { name: 'Preview' }))
    await screen.findByTitle('Preview')

    const bar = within(document.querySelector('.ab4-preview-bar') as HTMLElement)
    expect(bar.queryByRole('button', { name: /Download/ })).toBeNull()
    expect(bar.getByText('Agreement Preview')).toBeInTheDocument()
  })

  it('saves the agreement itself, without the preview calendar script', async () => {
    let saved: Record<string, string> | null = null
    server.use(
      http.post('*/common/agreement-templates/save', async ({ request }) => {
        saved = (await request.json()) as Record<string, string>
        return HttpResponse.json({ status: true, message: 'Saved' })
      }),
    )
    await openBuilder()

    fireEvent.click(toolbar().getByRole('button', { name: 'Save Agreement' }))

    await waitFor(() => expect(saved).not.toBeNull())
    expect(saved!.template_html).toContain('agreement-form')
    expect(saved!.template_html).not.toContain('data-app-calendar')
  })
})

describe('AgreementBuilder full-screen editor', () => {
  const PARTNER = { id: 42, company_name: 'Acme Lending' }

  /** Settings also leaves it a narrow column (the settings menu), which cut the A4 page off. */
  it('edits full screen under Settings too, named by the agreement', async () => {
    const { container } = await openBuilder()

    const editor = screen.getByRole('dialog', { name: 'Partner agreement' })
    expect(container).not.toContainElement(editor)
    expect(editor).toContainElement(toolbar().getByRole('button', { name: 'Save Agreement' }))
  })

  it("edits a partner's agreement full screen, naming the partner, outside the cramped profile column", async () => {
    const { container } = await openBuilder(
      <ConfigPartnerProvider partner={PARTNER}><AgreementBuilder /></ConfigPartnerProvider>,
    )

    const editor = screen.getByRole('dialog', { name: "Acme Lending's partner agreement" })
    expect(editor).toHaveAttribute('aria-modal', 'true')
    expect(editor).toHaveClass('ab4-fullscreen')
    expect(container).not.toContainElement(editor)
    expect(editor).toContainElement(toolbar().getByRole('button', { name: 'Save Agreement' }))
    expect(editor).toHaveTextContent('Acme Lending')
    expect(document.body.style.overflow).toBe('hidden')
  })

  it("closes the partner's editor back to the agreement list and gives the page its scroll back", async () => {
    await openBuilder(<ConfigPartnerProvider partner={PARTNER}><AgreementBuilder /></ConfigPartnerProvider>)

    fireEvent.click(toolbar().getByRole('button', { name: 'Close editor' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit partner agreement' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('AgreementBuilder starting templates', () => {
  it('starts a new partner agreement from the master partner agreement', async () => {
    await openBuilder()

    expect(await screen.findByText('MASTER PARTNER AGREEMENT')).toBeInTheDocument()
    expect(screen.getByText('SECTION 23 — SIGNATURE AUTHORITY')).toBeInTheDocument()
  })

  it('starts a new borrower agreement from the client enrollment agreement', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')

    expect(await screen.findByText('BUSINESS CREDIT BUILDER & FUNDING PROGRAM')).toBeInTheDocument()
    expect(screen.getByText('28. NOTICES')).toBeInTheDocument()
  })
})

describe('AgreementBuilder on a phone', () => {
  // On a narrow screen the block properties open as a bottom sheet only while a block is selected.
  it('marks the layout while a block is selected, for the bottom sheet', async () => {
    const { container } = await openBuilder()
    const layout = container.ownerDocument.querySelector('.ab4-layout') as HTMLElement
    expect(layout).not.toHaveClass('ab4-layout--selected')

    fireEvent.click((await screen.findByText('MASTER PARTNER AGREEMENT')).closest('.ab4-block') as HTMLElement)

    expect(layout).toHaveClass('ab4-layout--selected')
  })
})

describe('AgreementBuilder merge fields', () => {
  it('starts a new borrower agreement with merge fields, not placeholders to retype', async () => {
    let saved: Record<string, string> | null = null
    server.use(
      http.post('*/common/agreement-templates/save', async ({ request }) => {
        saved = (await request.json()) as Record<string, string>
        return HttpResponse.json({ status: true, message: 'Saved' })
      }),
    )
    await openBuilder(<AgreementBuilder />, 'borrower')

    fireEvent.click(toolbar().getByRole('button', { name: 'Save Agreement' }))

    await waitFor(() => expect(saved).not.toBeNull())
    expect(saved!.template_html).toContain('{{signer.name}}')
    expect(saved!.template_html).toContain('{{owner.company_name}}')
    expect(saved!.template_html).not.toContain('[Customer Full Name]')
  })

  it('previews the company fields with the real details of the owner', async () => {
    server.use(
      http.post('*/common/agreement-templates/preview-values', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { 'owner.company_name': 'Four Corner Holdings, LLC', 'owner.email': '', 'owner.phone': '', 'owner.address': '', today: '10/30/2026' } })),
    )
    await openBuilder(<AgreementBuilder />, 'borrower')

    fireEvent.click(toolbar().getByRole('button', { name: 'Preview' }))

    await waitFor(() => expect(screen.getByTitle('Preview').getAttribute('srcdoc')).toContain('title="{{owner.company_name}}">Four Corner Holdings, LLC</span>'))
    expect(screen.getByTitle('Preview').getAttribute('srcdoc')).toContain('title="{{signer.name}}">Jane Doe</span>')
  })

  it('previews merge fields with example details, marked as fields', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')

    fireEvent.click(toolbar().getByRole('button', { name: 'Preview' }))

    const preview = (await screen.findByTitle('Preview')).getAttribute('srcdoc')!
    expect(preview).toMatch(/<span class="ab4-merge-sample" title="\{\{signer.name\}\}">Jane Doe<\/span>/)
    expect(preview).not.toContain('>{{signer.name}}<')
  })
})

describe('AgreementBuilder safety nets', () => {
  const clearAll = () => fireEvent.click(toolbar().getByRole('button', { name: 'Clear All' }))
  const confirmClear = () =>
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Clear the whole agreement?' })).getByRole('button', { name: 'Clear everything' }))

  it('asks before clearing the whole agreement, and Cancel keeps it', async () => {
    await openBuilder()

    clearAll()
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Clear the whole agreement?' })).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await screen.findByText('MASTER PARTNER AGREEMENT')).toBeInTheDocument()
  })

  it('undoes and redoes changes', async () => {
    await openBuilder()
    expect(toolbar().getByRole('button', { name: 'Undo' })).toBeDisabled()

    clearAll()
    confirmClear()
    expect(await screen.findByText('Empty Agreement')).toBeInTheDocument()

    fireEvent.click(toolbar().getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('MASTER PARTNER AGREEMENT')).toBeInTheDocument()
    expect(toolbar().getByRole('button', { name: 'Redo' })).toBeEnabled()

    fireEvent.click(toolbar().getByRole('button', { name: 'Redo' }))
    expect(await screen.findByText('Empty Agreement')).toBeInTheDocument()
  })

  it('shows when there are unsaved changes, and when they are saved', async () => {
    server.use(http.post('*/common/agreement-templates/save', () => HttpResponse.json({ status: true, message: 'Saved', data: { id: 3 } })))
    await openBuilder()
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()

    clearAll()
    confirmClear()
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()

    fireEvent.click(toolbar().getByRole('button', { name: 'Save Agreement' }))
    expect(await screen.findByText('All changes saved')).toBeInTheDocument()
  })

  it('asks before closing with unsaved changes', async () => {
    await openBuilder()
    clearAll()
    confirmClear()

    fireEvent.click(toolbar().getByRole('button', { name: 'Close editor' }))
    const ask = screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' })
    fireEvent.click(within(ask).getByRole('button', { name: 'Keep editing' }))
    expect(toolbar().getByRole('button', { name: 'Save Agreement' })).toBeInTheDocument()

    fireEvent.click(toolbar().getByRole('button', { name: 'Close editor' }))
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).getByRole('button', { name: 'Discard changes' }))
    expect(screen.getByRole('button', { name: 'Edit partner agreement' })).toBeInTheDocument()
  })

  it('closes straight away when nothing changed', async () => {
    await openBuilder()

    fireEvent.click(toolbar().getByRole('button', { name: 'Close editor' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit partner agreement' })).toBeInTheDocument()
  })
})

describe('AgreementBuilder placing blocks', () => {
  /** The saved block types, in order. */
  const savedTypes = async () => {
    let saved: Record<string, string> | null = null
    server.use(
      http.post('*/common/agreement-templates/save', async ({ request }) => {
        saved = (await request.json()) as Record<string, string>
        return HttpResponse.json({ status: true, message: 'Saved' })
      }),
    )
    fireEvent.click(toolbar().getByRole('button', { name: 'Save Agreement' }))
    await waitFor(() => expect(saved).not.toBeNull())
    return (JSON.parse(saved!.template_json).blocks as { type: string; content?: string }[]).map((b) => b.type)
  }
  /** Palette queries stay inside the palette, for the same reason as toolbar(). */
  const inPalette = () => within(document.querySelector('.ab4-palette') as HTMLElement)
  const blockOf = async (text: string) => (await screen.findByText(text)).closest('.ab4-block') as HTMLElement

  it('adds a block from the palette below the selected block', async () => {
    await openBuilder()
    fireEvent.click(await blockOf('MASTER PARTNER AGREEMENT'))

    fireEvent.click(inPalette().getByRole('button', { name: /Divider/ }))

    expect((await savedTypes()).slice(0, 4)).toEqual(['header', 'text', 'divider', 'text'])
  })

  /** Each added block becomes the selection, so the next one goes below it. */
  it('keeps adding palette blocks one below the other', async () => {
    await openBuilder()
    fireEvent.click(await blockOf('MASTER PARTNER AGREEMENT'))

    fireEvent.click(inPalette().getByRole('button', { name: /Divider/ }))
    fireEvent.click(inPalette().getByRole('button', { name: /Spacer/ }))

    expect((await savedTypes()).slice(0, 5)).toEqual(['header', 'text', 'divider', 'spacer', 'text'])
  })

  it('adds a block from the palette at the end when none is selected', async () => {
    await openBuilder()

    fireEvent.click(inPalette().getByRole('button', { name: /Divider/ }))

    expect((await savedTypes()).slice(-1)).toEqual(['divider'])
  })

  it('moves a block by dragging its handle onto another block', async () => {
    await openBuilder()
    const title = await blockOf('MASTER PARTNER AGREEMENT')
    const logo = (await screen.findByRole('button', { name: 'Add your logo' })).closest('.ab4-block') as HTMLElement
    const dataTransfer = { data: {} as Record<string, string>, setData(t: string, v: string) { this.data[t] = v; this.types.push(t) }, getData(t: string) { return this.data[t] }, effectAllowed: '', dropEffect: '', types: [] as string[] }

    // jsdom drag events carry no pointer position, so this drops on the upper half: before the logo.
    fireEvent.dragStart(within(title).getByRole('button', { name: 'Drag to move' }), { dataTransfer })
    fireEvent.dragOver(logo, { dataTransfer })
    fireEvent.drop(logo, { dataTransfer })

    expect((await savedTypes()).slice(0, 2)).toEqual(['text', 'header'])
  })

  /**
   * One drop marker at a time, kept while over the text inside a block (Chrome
   * gives dragleave no relatedTarget, so leaving can't be told from entering a child)
   * and cleared when the drag ends.
   */
  it('shows where a dragged block will land until the drag moves on or ends', async () => {
    await openBuilder()
    await blockOf('MASTER PARTNER AGREEMENT')
    const dataTransfer = { data: {} as Record<string, string>, setData(t: string, v: string) { this.data[t] = v; this.types.push(t) }, getData(t: string) { return this.data[t] }, effectAllowed: '', dropEffect: '', types: [] as string[] }
    const palette = inPalette().getByRole('button', { name: /Divider/ })

    fireEvent.dragStart(palette, { dataTransfer })
    const title = await blockOf('MASTER PARTNER AGREEMENT')
    const logo = (await screen.findByRole('button', { name: 'Add your logo' })).closest('.ab4-block') as HTMLElement
    fireEvent.dragOver(title, { dataTransfer })
    fireEvent.dragLeave(title, { dataTransfer })
    expect(title).toHaveClass('ab4-block--drop-before')

    fireEvent.dragOver(logo, { dataTransfer })
    expect(logo).toHaveClass('ab4-block--drop-before')
    expect(title).not.toHaveClass('ab4-block--drop-before')

    fireEvent.dragEnd(palette, { dataTransfer })
    expect(document.querySelector('.ab4-block--drop-before, .ab4-block--drop-after')).toBeNull()
  })

  /** While dragging, the gaps between blocks get a hit area (they are 0px high otherwise). */
  it('marks the editor as dragging until the drag ends', async () => {
    await openBuilder()
    const root = document.querySelector('.ab4-root') as HTMLElement
    const dataTransfer = { data: {} as Record<string, string>, setData(t: string, v: string) { this.data[t] = v; this.types.push(t) }, getData(t: string) { return this.data[t] }, effectAllowed: '', dropEffect: '', types: [] as string[] }

    fireEvent.dragStart(inPalette().getByRole('button', { name: /Divider/ }), { dataTransfer })
    expect(root).toHaveClass('ab4-root--dragging')

    fireEvent.dragEnd(inPalette().getByRole('button', { name: /Divider/ }), { dataTransfer })
    expect(root).not.toHaveClass('ab4-root--dragging')
  })

  /** The thin "+" strip between blocks takes drops too - that is where a drop usually lands. */
  it('places a dragged block or palette item on the gap between blocks', async () => {
    await openBuilder()
    const dt = () => ({ data: {} as Record<string, string>, setData(t: string, v: string) { this.data[t] = v; this.types.push(t) }, getData(t: string) { return this.data[t] }, effectAllowed: '', dropEffect: '', types: [] as string[] })
    // The gaps on the page: before the first block, then after each block.
    const gap = (n: number) => document.querySelectorAll('.ab4-doc .ab4-iz')[n] as HTMLElement

    const palette = dt()
    fireEvent.dragStart(inPalette().getByRole('button', { name: /Divider/ }), { dataTransfer: palette })
    fireEvent.dragOver(gap(1), { dataTransfer: palette })
    fireEvent.drop(gap(1), { dataTransfer: palette })

    // Found again: the pages re-render after the insert.
    const title = await blockOf('MASTER PARTNER AGREEMENT')
    const move = dt()
    fireEvent.dragStart(within(title).getByRole('button', { name: 'Drag to move' }), { dataTransfer: move })
    fireEvent.dragOver(gap(0), { dataTransfer: move })
    fireEvent.drop(gap(0), { dataTransfer: move })

    expect((await savedTypes()).slice(0, 4)).toEqual(['text', 'header', 'divider', 'text'])
  })

  it('adds a block by dragging it from the palette onto the page', async () => {
    await openBuilder()
    const dataTransfer = { data: {} as Record<string, string>, setData(t: string, v: string) { this.data[t] = v; this.types.push(t) }, getData(t: string) { return this.data[t] }, effectAllowed: '', dropEffect: '', types: [] as string[] }

    fireEvent.dragStart(inPalette().getByRole('button', { name: /Divider/ }), { dataTransfer })
    fireEvent.dragOver(await blockOf('MASTER PARTNER AGREEMENT'), { dataTransfer, clientY: -10 })
    fireEvent.drop(await blockOf('MASTER PARTNER AGREEMENT'), { dataTransfer, clientY: -10 })

    expect((await savedTypes()).slice(0, 3)).toEqual(['header', 'divider', 'text'])
  })

  it('adds a block dropped anywhere on an empty page', async () => {
    await openBuilder()
    fireEvent.click(toolbar().getByRole('button', { name: 'Clear All' }))
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Clear the whole agreement?' })).getByRole('button', { name: 'Clear everything' }))
    const page = (await screen.findByText('Empty Agreement')).closest('.ab4-doc') as HTMLElement
    const dataTransfer = { data: {} as Record<string, string>, setData(t: string, v: string) { this.data[t] = v; this.types.push(t) }, getData(t: string) { return this.data[t] }, effectAllowed: '', dropEffect: '', types: [] as string[] }

    fireEvent.dragStart(inPalette().getByRole('button', { name: /Text Block/ }), { dataTransfer })
    fireEvent.dragOver(page, { dataTransfer })
    expect(page).toHaveClass('ab4-doc--drop')
    fireEvent.drop(page, { dataTransfer })

    expect(await savedTypes()).toEqual(['text'])
    expect(document.querySelector('.ab4-doc--drop')).toBeNull()
  })

  // An empty page has no text block to take a dynamic value, so picking one adds it in a new text block.
  it('adds a dynamic value to an empty page in a new text block', async () => {
    await openBuilder()
    fireEvent.click(toolbar().getByRole('button', { name: 'Clear All' }))
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Clear the whole agreement?' })).getByRole('button', { name: 'Clear everything' }))
    await screen.findByText('Empty Agreement')
    window.getSelection()?.removeAllRanges()
    const panel = within(document.querySelector('.ab4-props') as HTMLElement)

    fireEvent.click(panel.getByRole('button', { name: /Insert Dynamic Value/ }))
    // The list opens in a popover over the page, outside the panel.
    fireEvent.click(openValueGroup('Signer').getByRole('menuitem', { name: "Signer's name" }))

    expect(await savedTypes()).toEqual(['text'])
    expect(document.querySelector('.ab4-doc .ab4-merge-chip[data-merge="signer.name"]')).not.toBeNull()
  })
})

describe('AgreementBuilder Plan & Fee dynamic values', () => {
  const panel = () => within(document.querySelector('.ab4-props') as HTMLElement)

  it('the borrower agreement asks for its own values and lists them', async () => {
    planFields = [{ key: 'plan.borrower_enrollment.installment.total_amount', label: 'Installment: Total amount', group: 'Plan & Fee: Borrower enrollment', sample: '$3,000.00' }]
    await openBuilder(undefined, 'borrower')

    fireEvent.click(panel().getByRole('button', { name: /Insert Dynamic Value/ }))

    fireEvent.click(await popover().findByRole('button', { name: 'Plan & Fee: Borrower enrollment' }))
    expect(within(screen.getByRole('dialog', { name: 'Plan & Fee: Borrower enrollment' })).getByRole('menuitem', { name: /Installment: Total amount/ })).toBeInTheDocument()
    expect(mergeFieldsAskedFor).toEqual(['borrower'])
    planFields = []
  })

  it('the partner agreement asks for the partner values', async () => {
    planFields = [{ key: 'plan.user_seat.certified_partner.monthly.total_amount', label: 'Certified Partner · Monthly: Monthly seat fee', group: 'Plan & Fee: User seats', sample: '$49.00' }]
    await openBuilder(undefined, 'partner')

    fireEvent.click(panel().getByRole('button', { name: /Insert Dynamic Value/ }))

    expect(await popover().findByText('Plan & Fee: User seats')).toBeInTheDocument()
    expect(mergeFieldsAskedFor).toEqual(['partner'])
    planFields = []
  })

  // fch-api AgreementCommissionFields: each partner sees their own tiers when they sign.
  it("the partner agreement takes the partner's commission table and previews it as a table", async () => {
    planFields = [{
      key: AGREEMENT_COMMISSION_TABLE_FIELD_KEY, label: "Partner's commission tiers", group: 'Signer', html: true,
      sample: '<table class="ab-commission-table"><tbody><tr><td>0</td><td>10</td><td>$1,500</td></tr><tr><td>11</td><td>and up</td><td>27.5%</td></tr></tbody></table>',
    }]
    await openBuilder(undefined, 'partner')
    fireEvent.click(toolbar().getByRole('button', { name: 'Clear All' }))
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Clear the whole agreement?' })).getByRole('button', { name: 'Clear everything' }))
    await screen.findByText('Empty Agreement')
    window.getSelection()?.removeAllRanges()

    fireEvent.click(panel().getByRole('button', { name: /Insert Dynamic Value/ }))
    fireEvent.click(await popover().findByRole('button', { name: 'Signer' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Signer' })).getByRole('menuitem', { name: /Partner's commission tiers/ }))
    await waitFor(() => expect(document.querySelector(`.ab4-doc .ab4-merge-chip[data-merge="${AGREEMENT_COMMISSION_TABLE_FIELD_KEY}"]`)).not.toBeNull())
    fireEvent.click(toolbar().getByRole('button', { name: 'Preview' }))

    await waitFor(() => expect(screen.getByTitle('Preview').getAttribute('srcdoc')).toContain('<table class="ab-commission-table">'))
    const preview = screen.getByTitle('Preview').getAttribute('srcdoc')!
    expect(preview).toContain('<td>27.5%</td>')
    expect(preview).not.toContain('&lt;table')
    planFields = []
  })

  it('the commission table goes in with a title and a short description the host can edit', async () => {
    planFields = [{ key: AGREEMENT_COMMISSION_TABLE_FIELD_KEY, label: "Partner's commission tiers", group: 'Signer', html: true, sample: '<table><tbody><tr><td>0</td></tr></tbody></table>' }]
    await openBuilder(undefined, 'partner')
    fireEvent.click(toolbar().getByRole('button', { name: 'Clear All' }))
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Clear the whole agreement?' })).getByRole('button', { name: 'Clear everything' }))
    await screen.findByText('Empty Agreement')
    window.getSelection()?.removeAllRanges()

    fireEvent.click(panel().getByRole('button', { name: /Insert Dynamic Value/ }))
    fireEvent.click(await popover().findByRole('button', { name: 'Signer' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Signer' })).getByRole('menuitem', { name: /Partner's commission tiers/ }))

    const editor = await waitFor(() => {
      const chip = document.querySelector(`.ab4-doc .ab4-merge-chip[data-merge="${AGREEMENT_COMMISSION_TABLE_FIELD_KEY}"]`)
      expect(chip).not.toBeNull()
      return chip!.closest('.ab4-editor') as HTMLElement
    })
    // Plain text in the block's editor - not part of the chip - so the host can change it.
    expect(editor.getAttribute('contenteditable')).toBe('true')
    expect(within(editor).getByText(AGREEMENT_COMMISSION_TABLE_INTRO.title).closest('.ab4-merge-chip')).toBeNull()
    expect(within(editor).getByText(AGREEMENT_COMMISSION_TABLE_INTRO.description).closest('.ab4-merge-chip')).toBeNull()

    let saved: Record<string, string> | null = null
    server.use(http.post('*/common/agreement-templates/save', async ({ request }) => {
      saved = (await request.json()) as Record<string, string>
      return HttpResponse.json({ status: true, message: 'Saved' })
    }))
    fireEvent.click(toolbar().getByRole('button', { name: 'Save Agreement' }))
    await waitFor(() => expect(saved).not.toBeNull())
    const html = saved!.template_html
    expect(html).toContain(AGREEMENT_COMMISSION_TABLE_INTRO.title)
    expect(html).toContain(AGREEMENT_COMMISSION_TABLE_INTRO.description)
    // Alone in its paragraph, so the server's table takes the paragraph's place.
    expect(html).toContain(`<p>{{${AGREEMENT_COMMISSION_TABLE_FIELD_KEY}}}</p>`)
    expect(html.indexOf(AGREEMENT_COMMISSION_TABLE_INTRO.title)).toBeLessThan(html.indexOf('{{signer.commission_table}}'))
    planFields = []
  })
})

// fch-api AgreementEnrollmentFields: one table of the signer's own enrollment, its rows by enrollment type.
describe('AgreementBuilder enrollment table', () => {
  const panel = () => within(document.querySelector('.ab4-props') as HTMLElement)

  it('goes in with a title and a short description the host can edit, the table alone in its paragraph', async () => {
    planFields = [{
      key: AGREEMENT_ENROLLMENT_TABLE_FIELD_KEY, label: 'Enrollment Details', group: 'Signer: Enrollment', html: true,
      variants: [{ type: 'Installment', rows: ['Enrollment type', 'Total enrollment amount'] }, { type: 'One Time Payment', rows: ['Enrollment type'] }],
      sample: '<table class="ab-enrollment-table"><tbody><tr><td>Total enrollment amount</td><td>$6,000.00</td></tr></tbody></table>',
    }]
    await openBuilder(undefined, 'partner')
    fireEvent.click(toolbar().getByRole('button', { name: 'Clear All' }))
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Clear the whole agreement?' })).getByRole('button', { name: 'Clear everything' }))
    await screen.findByText('Empty Agreement')
    window.getSelection()?.removeAllRanges()

    fireEvent.click(panel().getByRole('button', { name: /Insert Dynamic Value/ }))
    fireEvent.click(await popover().findByRole('button', { name: 'Signer: Enrollment' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Signer: Enrollment' })).getByRole('button', { name: 'Add Enrollment Details' }))

    await waitFor(() => expect(document.querySelector(`.ab4-doc .ab4-merge-chip[data-merge="${AGREEMENT_ENROLLMENT_TABLE_FIELD_KEY}"]`)).not.toBeNull())
    let saved: Record<string, string> | null = null
    server.use(http.post('*/common/agreement-templates/save', async ({ request }) => {
      saved = (await request.json()) as Record<string, string>
      return HttpResponse.json({ status: true, message: 'Saved' })
    }))
    fireEvent.click(toolbar().getByRole('button', { name: 'Save Agreement' }))
    await waitFor(() => expect(saved).not.toBeNull())
    const html = saved!.template_html
    expect(html).toContain(AGREEMENT_ENROLLMENT_TABLE_INTRO.title)
    expect(html).toContain(AGREEMENT_ENROLLMENT_TABLE_INTRO.description)
    expect(html).toContain(`<p>{{${AGREEMENT_ENROLLMENT_TABLE_FIELD_KEY}}}</p>`)
    planFields = []
  })
})

describe('AgreementBuilder starter templates', () => {
  const savedHtml = async () => {
    let saved: Record<string, string> | null = null
    server.use(
      http.post('*/common/agreement-templates/save', async ({ request }) => {
        saved = (await request.json()) as Record<string, string>
        return HttpResponse.json({ status: true, message: 'Saved' })
      }),
    )
    fireEvent.click(toolbar().getByRole('button', { name: 'Save Agreement' }))
    await waitFor(() => expect(saved).not.toBeNull())
    return saved!.template_html
  }

  const names = (picker: HTMLElement) => within(picker).getAllByRole('button').map((b) => b.querySelector('.ab4-templates__name')?.textContent).filter(Boolean)

  it('offers only partner templates in the partner agreement', async () => {
    await openBuilder()

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))

    const picker = screen.getByRole('dialog', { name: 'Start from a template' })
    expect(names(picker)).toEqual(['Master partner agreement', 'Blank page'])
    expect(within(picker).queryByRole('tab')).not.toBeInTheDocument()
  })

  it('offers only borrower templates in the borrower agreement', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))

    const picker = screen.getByRole('dialog', { name: 'Start from a template' })
    expect(names(picker)).toEqual(['Client enrollment agreement', 'Business funding agreement', 'Master loan agreement', 'Terms acknowledgement', 'Blank page'])
  })

  it('offers a complete business funding agreement with a header, the client details, sections and a signature', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Start from a template' })).getByRole('button', { name: /Business funding agreement/ }))

    expect(await screen.findByText('BUSINESS FUNDING AGREEMENT')).toBeInTheDocument()
    const html = await savedHtml()
    expect(html).toContain('p-logo')
    for (const field of ['signer.name', 'signer.business_name', 'signer.business_address', 'signer.email', 'signer.phone',
      'owner.company_name', 'owner.address', 'owner.email', 'owner.phone', 'today']) {
      expect(html).toContain(`{{${field}}}`)
    }
    expect(html).toContain('<table>')
    expect(html).toContain('<ol>')
    expect(html).toContain('<ul>')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('preview-dropzone')
  })

  it('replaces the agreement with the chosen template, which can be undone', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')
    await screen.findByText('BUSINESS CREDIT BUILDER & FUNDING PROGRAM')

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Start from a template' })).getByRole('button', { name: /Terms acknowledgement/ }))

    expect(screen.queryByRole('dialog', { name: 'Start from a template' })).not.toBeInTheDocument()
    expect(await screen.findByText('TERMS ACKNOWLEDGEMENT')).toBeInTheDocument()
    const html = await savedHtml()
    expect(html).toContain('{{signer.name}}')
    expect(html).toContain('{{owner.company_name}}')
    expect(html).toContain('type="checkbox"')
    expect(html).not.toContain('BUSINESS CREDIT BUILDER')

    fireEvent.click(toolbar().getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('BUSINESS CREDIT BUILDER & FUNDING PROGRAM')).toBeInTheDocument()
  })

  it('starts from a blank page', async () => {
    await openBuilder()

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Start from a template' })).getByRole('button', { name: /Blank page/ }))

    expect(await screen.findByText('Empty Agreement')).toBeInTheDocument()
  })
})

describe('AgreementBuilder loading the saved agreement', () => {
  const SAVED = { id: 4, template_json: JSON.stringify({ blocks: [{ id: 'saved-1', type: 'text', content: 'Saved clause from the server' }], pagePad: 80, docBg: '#ffffff' }) }

  it('shows the saved agreement each time it is opened, not the built-in starter', async () => {
    server.use(http.post('*/common/agreement-templates/show', () => HttpResponse.json({ status: true, data: SAVED })))
    renderWithProviders(<AgreementBuilder />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit partner agreement' }))
    expect(await screen.findByText('Saved clause from the server')).toBeInTheDocument()

    fireEvent.click(toolbar().getByRole('button', { name: 'Close editor' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Edit partner agreement' }))

    expect(await screen.findByText('Saved clause from the server')).toBeInTheDocument()
    expect(screen.queryByText('MASTER PARTNER AGREEMENT')).not.toBeInTheDocument()
  })

  /**
   * The editor shows only once the agreement has loaded. It used to show the
   * starter it had set up before the request answered, then swap in the loaded
   * one (new block ids), so a block selected in between was lost.
   */
  it('shows the editor only with the blocks it keeps', async () => {
    server.use(http.post('*/common/agreement-templates/show', () => HttpResponse.json({ status: true, data: null })))
    let firstShown: Element | null = null
    const observer = new MutationObserver(() => {
      if (!firstShown && document.querySelector('.ab4-save-btn')) firstShown = document.querySelector('.ab4-block')
    })
    observer.observe(document.body, { childList: true, subtree: true })
    renderWithProviders(<AgreementBuilder />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit partner agreement' }))
    await screen.findByText('MASTER PARTNER AGREEMENT')
    observer.disconnect()

    expect(firstShown).not.toBeNull()
    expect(firstShown!.isConnected).toBe(true)
  })
})

// R3-BUG-002: the logo picker opened a folder of its own, agreements/{id} -
// agreements/1 when the user had no partner. It now opens the partner's own
// folder (where its logo and branding already are), at its base: nothing is
// created inside it on the picker's behalf.
describe('AgreementBuilder logo picker', () => {
  const listed = () => {
    const bodies: Record<string, unknown>[] = []
    server.use(
      http.post('*/filemanager/list', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json({ status: true, data: [] })
      }),
      http.post('*/filemanager/tree', () => HttpResponse.json({ status: true, data: [] })),
    )
    return bodies
  }

  afterEach(() => useAuthStore.setState({ user: null } as never))

  it("opens the partner's own folder at its base", async () => {
    useAuthStore.setState({ user: { id: 9, partner_id: 42, entity_id: 42 } } as never)
    const bodies = listed()
    await openBuilder()

    fireEvent.click(screen.getAllByRole('button', { name: 'Add your logo' })[0])

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0))
    expect(bodies[0]).toMatchObject({ entity_type: 'partners', entity_id: 42, path: '/' })
  })

  it('opens no folder for a user with no partner', async () => {
    useAuthStore.setState({ user: { id: 9, partner_id: null, entity_id: null } } as never)
    const bodies = listed()
    await openBuilder()

    fireEvent.click(screen.getAllByRole('button', { name: 'Add your logo' })[0])

    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(bodies).toEqual([])
  })
})

/**
 * Save as Template: the agreement being edited is kept under a name, and
 * Templates offers it beside the built-in templates. Save Agreement saves the
 * agreement itself, as before.
 */
describe('AgreementBuilder save as template', () => {
  const SAVED = { id: 4, slug: 'borrower', name: 'Our short form', created_at: '2026-11-17T10:00:00Z', updated_at: '2026-11-17T10:00:00Z' }
  const SAVED_JSON = JSON.stringify({
    blocks: [{ id: 'saved-1', type: 'text', paletteType: 'text', content: 'OUR SHORT FORM TERMS' }],
    pagePad: 64,
    docBg: '#fdfcf7',
  })

  const dialog = () => screen.getByRole('dialog', { name: 'Save as template' })

  it('has Save Agreement and Save as Template, and no Save Template', async () => {
    await openBuilder()

    expect(toolbar().getByRole('button', { name: 'Save Agreement' })).toBeInTheDocument()
    expect(toolbar().getByRole('button', { name: 'Save as Template' })).toBeInTheDocument()
    expect(toolbar().queryByRole('button', { name: 'Save Template' })).not.toBeInTheDocument()
  })

  it('saves the agreement on the page as a named template', async () => {
    const { toast } = await import('react-toastify')
    let body: Record<string, string> | null = null
    server.use(http.post('*/common/agreement-templates/saved', async ({ request }) => {
      body = (await request.json()) as Record<string, string>
      return HttpResponse.json({ status: true, message: 'Template saved', data: { ...SAVED, slug: 'partner' } })
    }))
    await openBuilder()

    fireEvent.click(toolbar().getByRole('button', { name: 'Save as Template' }))
    const save = within(dialog()).getByRole('button', { name: 'Save Template' })
    // Nothing to save under until a name is typed.
    expect(save).toBeDisabled()
    fireEvent.change(within(dialog()).getByLabelText(/Template name/), { target: { value: '  Our short form ' } })
    fireEvent.click(save)

    await waitFor(() => expect(body).not.toBeNull())
    expect(body!.slug).toBe('partner')
    expect(body!.name).toBe('Our short form')
    const json = JSON.parse(body!.template_json)
    expect(JSON.stringify(json.blocks)).toContain('MASTER PARTNER AGREEMENT')
    expect(json.pagePad).toBe(80)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Save as template' })).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalledWith('Template saved')
  })

  it('shows why a name was refused under the field, and stays open', async () => {
    server.use(http.post('*/common/agreement-templates/saved', () =>
      HttpResponse.json({ message: 'The given data was invalid.', errors: { name: ['You already have a template with this name.'] } }, { status: 422 })))
    await openBuilder(<AgreementBuilder />, 'borrower')

    fireEvent.click(toolbar().getByRole('button', { name: 'Save as Template' }))
    const name = within(dialog()).getByLabelText(/Template name/)
    fireEvent.change(name, { target: { value: 'Our short form' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save Template' }))

    expect(await within(dialog()).findByText('You already have a template with this name.')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    // Typing again clears it.
    fireEvent.change(name, { target: { value: 'Our shorter form' } })
    expect(within(dialog()).queryByText('You already have a template with this name.')).not.toBeInTheDocument()
  })

  it('Cancel closes without saving', async () => {
    await openBuilder()

    fireEvent.click(toolbar().getByRole('button', { name: 'Save as Template' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog', { name: 'Save as template' })).not.toBeInTheDocument()
  })

  it('lists saved templates in Templates, with the built-in ones', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')
    // After openBuilder, whose empty list it would otherwise override.
    server.use(http.get('*/common/agreement-templates/saved', ({ request }) =>
      HttpResponse.json({ status: true, data: new URL(request.url).searchParams.get('slug') === 'borrower' ? [SAVED] : [] })))

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))

    const picker = screen.getByRole('dialog', { name: 'Start from a template' })
    const saved = within(picker).getByRole('region', { name: 'Your templates' })
    expect(await within(saved).findByRole('button', { name: /^Our short form/ })).toBeInTheDocument()
    const builtIn = within(picker).getByRole('region', { name: 'Default templates' })
    expect(within(builtIn).getByRole('button', { name: /Client enrollment agreement/ })).toBeInTheDocument()
    expect(within(builtIn).getByRole('button', { name: /Blank page/ })).toBeInTheDocument()
  })

  it('says so when nothing has been saved as a template yet', async () => {
    await openBuilder()

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))

    const saved = within(screen.getByRole('dialog', { name: 'Start from a template' })).getByRole('region', { name: 'Your templates' })
    expect(await within(saved).findByText(/No saved templates yet/)).toBeInTheDocument()
  })

  it('replaces the agreement with a saved template, which can be undone', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')
    await screen.findByText('BUSINESS CREDIT BUILDER & FUNDING PROGRAM')
    server.use(
      http.get('*/common/agreement-templates/saved', () => HttpResponse.json({ status: true, data: [SAVED] })),
      http.get('*/common/agreement-templates/saved/4', () => HttpResponse.json({ status: true, data: { ...SAVED, template_json: SAVED_JSON } })),
    )

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))
    const picker = screen.getByRole('dialog', { name: 'Start from a template' })
    fireEvent.click(await within(picker).findByRole('button', { name: /^Our short form/ }))

    expect(await screen.findByText('OUR SHORT FORM TERMS')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Start from a template' })).not.toBeInTheDocument()
    expect(screen.queryByText('BUSINESS CREDIT BUILDER & FUNDING PROGRAM')).not.toBeInTheDocument()

    fireEvent.click(toolbar().getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('BUSINESS CREDIT BUILDER & FUNDING PROGRAM')).toBeInTheDocument()
  })

  it('deletes a saved template after asking', async () => {
    let list = [SAVED]
    let deleted = false
    await openBuilder(<AgreementBuilder />, 'borrower')
    server.use(
      http.get('*/common/agreement-templates/saved', () => HttpResponse.json({ status: true, data: list })),
      http.delete('*/common/agreement-templates/saved/4', () => {
        deleted = true
        list = []
        return HttpResponse.json({ status: true, data: null })
      }),
    )

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))
    const picker = screen.getByRole('dialog', { name: 'Start from a template' })
    fireEvent.click(await within(picker).findByRole('button', { name: 'Delete template Our short form' }))

    const confirm = screen.getByRole('alertdialog')
    expect(confirm).toHaveTextContent('Our short form')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete template' }))

    await waitFor(() => expect(deleted).toBe(true))
    expect(await within(picker).findByText(/No saved templates yet/)).toBeInTheDocument()
  })
})

/**
 * Editing a saved template: Save as Template can replace one with the agreement
 * on the page (keeping its name), and Templates renames one in place.
 */
describe('AgreementBuilder editing a saved template', () => {
  const SAVED = { id: 4, slug: 'borrower', name: 'Our short form', created_at: '2026-11-17T10:00:00Z', updated_at: '2026-11-17T10:00:00Z' }
  const saveDialog = () => screen.getByRole('dialog', { name: 'Save as template' })
  const picker = () => screen.getByRole('dialog', { name: 'Start from a template' })

  it('replaces a saved template with the agreement on the page, keeping its name', async () => {
    const { toast } = await import('react-toastify')
    let body: Record<string, string> | null = null
    await openBuilder(<AgreementBuilder />, 'borrower')
    server.use(
      http.get('*/common/agreement-templates/saved', () => HttpResponse.json({ status: true, data: [SAVED] })),
      http.put('*/common/agreement-templates/saved/4', async ({ request }) => {
        body = (await request.json()) as Record<string, string>
        return HttpResponse.json({ status: true, message: 'Template updated', data: SAVED })
      }),
    )

    fireEvent.click(toolbar().getByRole('button', { name: 'Save as Template' }))
    fireEvent.click(within(saveDialog()).getByRole('radio', { name: /Replace an existing template/ }))
    // No name to type: the template keeps its own.
    expect(within(saveDialog()).queryByLabelText(/Template name/)).not.toBeInTheDocument()
    const replace = within(saveDialog()).getByRole('button', { name: 'Replace Template' })
    expect(replace).toBeDisabled()
    // The app's own dropdown, not the browser's select list; its panel opens inside the dialog.
    // (PrimeReact keeps a hidden select for screen readers only.)
    expect(Array.from(saveDialog().querySelectorAll('select')).filter((el) => !el.closest('.p-hidden-accessible'))).toHaveLength(0)
    const which = saveDialog().querySelector('.p-dropdown') as HTMLElement
    expect(which.querySelector('.p-dropdown-label')).toHaveTextContent('Choose a template')
    expect(within(saveDialog()).getByText(/Template to replace/)).toBeInTheDocument()
    fireEvent.click(which)
    const option = await waitFor(() => {
      const found = Array.from(saveDialog().querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find((el) => el.textContent?.trim() === 'Our short form')
      expect(found).toBeTruthy()
      return found as HTMLElement
    })
    fireEvent.click(option)
    expect(which.querySelector('.p-dropdown-label')).toHaveTextContent('Our short form')
    fireEvent.click(replace)

    await waitFor(() => expect(body).not.toBeNull())
    expect(Object.keys(body!)).toEqual(['template_json'])
    expect(body!.template_json).toContain('BUSINESS CREDIT BUILDER')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Save as template' })).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalledWith('Template updated')
  })

  it('offers no replace when nothing has been saved yet', async () => {
    await openBuilder()

    fireEvent.click(toolbar().getByRole('button', { name: 'Save as Template' }))

    const replace = within(saveDialog()).getByRole('radio', { name: /Replace an existing template/ })
    expect(await within(saveDialog()).findByText(/No saved templates to replace yet/)).toBeInTheDocument()
    expect(replace).toBeDisabled()
    expect(within(saveDialog()).getByRole('radio', { name: /Save as a new template/ })).toBeChecked()
  })

  it('renames a saved template in Templates', async () => {
    let list = [SAVED]
    let body: Record<string, string> | null = null
    await openBuilder(<AgreementBuilder />, 'borrower')
    server.use(
      http.get('*/common/agreement-templates/saved', () => HttpResponse.json({ status: true, data: list })),
      http.put('*/common/agreement-templates/saved/4', async ({ request }) => {
        body = (await request.json()) as Record<string, string>
        list = [{ ...SAVED, name: body.name }]
        return HttpResponse.json({ status: true, message: 'Template updated', data: list[0] })
      }),
    )

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))
    fireEvent.click(await within(picker()).findByRole('button', { name: 'Rename template Our short form' }))
    const name = within(picker()).getByLabelText('Template name')
    expect(name).toHaveValue('Our short form')
    fireEvent.change(name, { target: { value: 'Our long form' } })
    fireEvent.click(within(picker()).getByRole('button', { name: 'Save name' }))

    await waitFor(() => expect(body).toEqual({ name: 'Our long form' }))
    expect(await within(picker()).findByRole('button', { name: /^Our long form/ })).toBeInTheDocument()
    expect(within(picker()).queryByLabelText('Template name')).not.toBeInTheDocument()
  })

  it('shows why a new name was refused under it, and Escape leaves the name as it was', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')
    server.use(
      http.get('*/common/agreement-templates/saved', () => HttpResponse.json({ status: true, data: [SAVED] })),
      http.put('*/common/agreement-templates/saved/4', () =>
        HttpResponse.json({ message: 'The given data was invalid.', errors: { name: ['You already have a template with this name.'] } }, { status: 422 })),
    )

    fireEvent.click(toolbar().getByRole('button', { name: 'Templates' }))
    fireEvent.click(await within(picker()).findByRole('button', { name: 'Rename template Our short form' }))
    const name = within(picker()).getByLabelText('Template name')
    fireEvent.change(name, { target: { value: 'Taken name' } })
    fireEvent.submit(name)

    expect(await within(picker()).findByText('You already have a template with this name.')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')

    fireEvent.keyDown(name, { key: 'Escape' })
    expect(within(picker()).queryByLabelText('Template name')).not.toBeInTheDocument()
    // Escape only ends the rename: the Templates dialog stays open.
    expect(within(picker()).getByRole('button', { name: /^Our short form/ })).toBeInTheDocument()
  })
})
