import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, renderWithProviders, screen, waitFor, within } from '../../../../test-utils'
import { server } from '../../../../mocks/server'
import AgreementBuilder from '../../../../../src/pages/settings/components/AgreementBuilder'
import { ConfigPartnerProvider } from '../../../../../src/modules/settings/configPartner'

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

const openBuilder = async (ui: ReactElement = <AgreementBuilder />, type: 'partner' | 'borrower' = 'partner') => {
  server.use(
    http.post('*/common/agreement-templates/show', () => HttpResponse.json({ status: true, data: null })),
  )
  const view = renderWithProviders(ui)
  fireEvent.click(screen.getByRole('button', { name: `Edit ${type} agreement` }))
  await screen.findByRole('button', { name: 'Save Template' })
  return view
}

describe('AgreementBuilder calendar', () => {
  it('the preview opens the app calendar in the agreement date fields', async () => {
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    const frame = await screen.findByTitle('Preview')
    expect(frame.getAttribute('srcdoc')).toContain('data-app-calendar')
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

    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }))

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
    expect(editor).toContainElement(screen.getByRole('button', { name: 'Save Template' }))
  })

  it("edits a partner's agreement full screen, naming the partner, outside the cramped profile column", async () => {
    const { container } = await openBuilder(
      <ConfigPartnerProvider partner={PARTNER}><AgreementBuilder /></ConfigPartnerProvider>,
    )

    const editor = screen.getByRole('dialog', { name: "Acme Lending's partner agreement" })
    expect(editor).toHaveAttribute('aria-modal', 'true')
    expect(editor).toHaveClass('ab4-fullscreen')
    expect(container).not.toContainElement(editor)
    expect(editor).toContainElement(screen.getByRole('button', { name: 'Save Template' }))
    expect(editor).toHaveTextContent('Acme Lending')
    expect(document.body.style.overflow).toBe('hidden')
  })

  it("closes the partner's editor back to the agreement list and gives the page its scroll back", async () => {
    await openBuilder(<ConfigPartnerProvider partner={PARTNER}><AgreementBuilder /></ConfigPartnerProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Close editor' }))

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

    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }))

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

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    await waitFor(() => expect(screen.getByTitle('Preview').getAttribute('srcdoc')).toContain('title="{{owner.company_name}}">Four Corner Holdings, LLC</span>'))
    expect(screen.getByTitle('Preview').getAttribute('srcdoc')).toContain('title="{{signer.name}}">Jane Doe</span>')
  })

  it('previews merge fields with example details, marked as fields', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    const preview = (await screen.findByTitle('Preview')).getAttribute('srcdoc')!
    expect(preview).toMatch(/<span class="ab4-merge-sample" title="\{\{signer.name\}\}">Jane Doe<\/span>/)
    expect(preview).not.toContain('>{{signer.name}}<')
  })
})

describe('AgreementBuilder safety nets', () => {
  const clearAll = () => fireEvent.click(screen.getByRole('button', { name: 'Clear All' }))
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
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()

    clearAll()
    confirmClear()
    expect(await screen.findByText('Empty Agreement')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('MASTER PARTNER AGREEMENT')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(await screen.findByText('Empty Agreement')).toBeInTheDocument()
  })

  it('shows when there are unsaved changes, and when they are saved', async () => {
    server.use(http.post('*/common/agreement-templates/save', () => HttpResponse.json({ status: true, message: 'Saved', data: { id: 3 } })))
    await openBuilder()
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()

    clearAll()
    confirmClear()
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }))
    expect(await screen.findByText('All changes saved')).toBeInTheDocument()
  })

  it('asks before closing with unsaved changes', async () => {
    await openBuilder()
    clearAll()
    confirmClear()

    fireEvent.click(screen.getByRole('button', { name: 'Close editor' }))
    const ask = screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' })
    fireEvent.click(within(ask).getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByRole('button', { name: 'Save Template' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close editor' }))
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).getByRole('button', { name: 'Discard changes' }))
    expect(screen.getByRole('button', { name: 'Edit partner agreement' })).toBeInTheDocument()
  })

  it('closes straight away when nothing changed', async () => {
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Close editor' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }))
    await waitFor(() => expect(saved).not.toBeNull())
    return (JSON.parse(saved!.template_json).blocks as { type: string; content?: string }[]).map((b) => b.type)
  }
  const blockOf = async (text: string) => (await screen.findByText(text)).closest('.ab4-block') as HTMLElement

  it('adds a block from the palette below the selected block', async () => {
    await openBuilder()
    fireEvent.click(await blockOf('MASTER PARTNER AGREEMENT'))

    fireEvent.click(screen.getByRole('button', { name: /Divider/ }))

    expect((await savedTypes()).slice(0, 4)).toEqual(['header', 'text', 'divider', 'text'])
  })

  /** Each added block becomes the selection, so the next one goes below it. */
  it('keeps adding palette blocks one below the other', async () => {
    await openBuilder()
    fireEvent.click(await blockOf('MASTER PARTNER AGREEMENT'))

    fireEvent.click(screen.getByRole('button', { name: /Divider/ }))
    fireEvent.click(screen.getByRole('button', { name: /Spacer/ }))

    expect((await savedTypes()).slice(0, 5)).toEqual(['header', 'text', 'divider', 'spacer', 'text'])
  })

  it('adds a block from the palette at the end when none is selected', async () => {
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: /Divider/ }))

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
    const palette = screen.getByRole('button', { name: /Divider/ })

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

    fireEvent.dragStart(screen.getByRole('button', { name: /Divider/ }), { dataTransfer })
    expect(root).toHaveClass('ab4-root--dragging')

    fireEvent.dragEnd(screen.getByRole('button', { name: /Divider/ }), { dataTransfer })
    expect(root).not.toHaveClass('ab4-root--dragging')
  })

  /** The thin "+" strip between blocks takes drops too - that is where a drop usually lands. */
  it('places a dragged block or palette item on the gap between blocks', async () => {
    await openBuilder()
    const dt = () => ({ data: {} as Record<string, string>, setData(t: string, v: string) { this.data[t] = v; this.types.push(t) }, getData(t: string) { return this.data[t] }, effectAllowed: '', dropEffect: '', types: [] as string[] })
    // The gaps on the page: before the first block, then after each block.
    const gap = (n: number) => document.querySelectorAll('.ab4-doc .ab4-iz')[n] as HTMLElement

    const palette = dt()
    fireEvent.dragStart(screen.getByRole('button', { name: /Divider/ }), { dataTransfer: palette })
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

    fireEvent.dragStart(screen.getByRole('button', { name: /Divider/ }), { dataTransfer })
    fireEvent.dragOver(await blockOf('MASTER PARTNER AGREEMENT'), { dataTransfer, clientY: -10 })
    fireEvent.drop(await blockOf('MASTER PARTNER AGREEMENT'), { dataTransfer, clientY: -10 })

    expect((await savedTypes()).slice(0, 3)).toEqual(['header', 'divider', 'text'])
  })

  it('adds a block dropped anywhere on an empty page', async () => {
    await openBuilder()
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }))
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Clear the whole agreement?' })).getByRole('button', { name: 'Clear everything' }))
    const page = (await screen.findByText('Empty Agreement')).closest('.ab4-doc') as HTMLElement
    const dataTransfer = { data: {} as Record<string, string>, setData(t: string, v: string) { this.data[t] = v; this.types.push(t) }, getData(t: string) { return this.data[t] }, effectAllowed: '', dropEffect: '', types: [] as string[] }

    fireEvent.dragStart(screen.getByRole('button', { name: /Text Block/ }), { dataTransfer })
    fireEvent.dragOver(page, { dataTransfer })
    expect(page).toHaveClass('ab4-doc--drop')
    fireEvent.drop(page, { dataTransfer })

    expect(await savedTypes()).toEqual(['text'])
    expect(document.querySelector('.ab4-doc--drop')).toBeNull()
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
    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }))
    await waitFor(() => expect(saved).not.toBeNull())
    return saved!.template_html
  }

  const names = (picker: HTMLElement) => within(picker).getAllByRole('button').map((b) => b.querySelector('.ab4-templates__name')?.textContent).filter(Boolean)

  it('offers only partner templates in the partner agreement', async () => {
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Templates' }))

    const picker = screen.getByRole('dialog', { name: 'Start from a template' })
    expect(names(picker)).toEqual(['Master partner agreement', 'Blank page'])
    expect(within(picker).queryByRole('tab')).not.toBeInTheDocument()
  })

  it('offers only borrower templates in the borrower agreement', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')

    fireEvent.click(screen.getByRole('button', { name: 'Templates' }))

    const picker = screen.getByRole('dialog', { name: 'Start from a template' })
    expect(names(picker)).toEqual(['Client enrollment agreement', 'Business funding agreement', 'Master loan agreement', 'Terms acknowledgement', 'Blank page'])
  })

  it('offers a complete business funding agreement with a header, the client details, sections and a signature', async () => {
    await openBuilder(<AgreementBuilder />, 'borrower')

    fireEvent.click(screen.getByRole('button', { name: 'Templates' }))
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

    fireEvent.click(screen.getByRole('button', { name: 'Templates' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Start from a template' })).getByRole('button', { name: /Terms acknowledgement/ }))

    expect(screen.queryByRole('dialog', { name: 'Start from a template' })).not.toBeInTheDocument()
    expect(await screen.findByText('TERMS ACKNOWLEDGEMENT')).toBeInTheDocument()
    const html = await savedHtml()
    expect(html).toContain('{{signer.name}}')
    expect(html).toContain('{{owner.company_name}}')
    expect(html).toContain('type="checkbox"')
    expect(html).not.toContain('BUSINESS CREDIT BUILDER')

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('BUSINESS CREDIT BUILDER & FUNDING PROGRAM')).toBeInTheDocument()
  })

  it('starts from a blank page', async () => {
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Templates' }))
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

    fireEvent.click(screen.getByRole('button', { name: 'Close editor' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Edit partner agreement' }))

    expect(await screen.findByText('Saved clause from the server')).toBeInTheDocument()
    expect(screen.queryByText('MASTER PARTNER AGREEMENT')).not.toBeInTheDocument()
  })
})
