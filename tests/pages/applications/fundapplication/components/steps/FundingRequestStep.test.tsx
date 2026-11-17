import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../../../../../mocks/server'
import { createTestQueryClient } from '../../../../../test-utils'
import FundingRequestStep from '../../../../../../src/pages/applications/fundapplication/components/steps/FundingRequestStep'
import type { FundingRequest } from '../../../../../../src/pages/applications/fundapplication/types'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/**
 * Step 4 of 8, Funding Request: besides the preferred funding type, the other
 * funding types the applicant would also consider - every type but the
 * preferred one, several at once.
 */
const apiFunding = {
  id: 11,
  funding_request_id: 7,
  funding_sequence_id: 3,
  requested_amount: '50000.00',
  purpose_of_funds: 'Working Capital',
  approved_funding: 'Term Loans',
  preferred_funding_type: 'Term Loan',
  additional_funding_types: ['SBA Financing', 'Business Line of Credit'],
  timeframe_needed: null,
  collateral_available: null,
  purpose_note: null,
}

const emptyFunding: FundingRequest = {
  requestedAmount: '',
  purpose: '',
  approvedFunding: '',
  fundingType: '',
  timeframe: '',
  collateral: '',
  purposeNote: '',
  additionalFundingTypes: [],
}

type Opened = { fundingRequestId?: number; fundingApplicationId?: number }

function Harness({ onSaveReady, opened }: { onSaveReady: (fn: () => Promise<boolean>) => void; opened: Opened }) {
  const [funding, setFunding] = useState<FundingRequest>(emptyFunding)
  return (
    <>
    {/* What the wizard (page header) shows as the product. */}
    <output data-testid="wizard-approved-funding">{funding.approvedFunding}</output>
    <FundingRequestStep
      funding={funding}
      setFunding={setFunding}
      onNext={() => {}}
      onBack={() => {}}
      loading={false}
      onRegisterSave={(fn) => fn && onSaveReady(fn)}
      fundingRequestId={opened.fundingRequestId}
      fundingApplicationId={opened.fundingApplicationId}
    />
    </>
  )
}

// The ids the step has fetched the funding request by.
let fetchedIds: string[] = []

// Lenders > Product Categories, the funding types offered (GET /common/funding-types).
const categories = ['Term Loan', 'Business Line of Credit', 'SBA Financing', 'Equipment Financing']

// GET /common/funding-sequences?funding_type=..., the Funding Sequence options.
let sequencesByType: Record<string, { id: number; name: string }[]> = {}
let sequencesAskedFor: string[] = []

const serve = (data: Record<string, unknown>, onPost?: (body: any) => void) =>
  server.use(
    http.get('*/common/funding-types', () => HttpResponse.json({ status: true, data: categories })),
    http.get('*/common/funding-sequences', ({ request }) => {
      const type = new URL(request.url).searchParams.get('funding_type') ?? ''
      sequencesAskedFor.push(type)
      return HttpResponse.json({ status: true, data: sequencesByType[type] ?? [] })
    }),
    http.get('*/common/funding-application/funding-request', ({ request }) => {
      fetchedIds.push(new URL(request.url).searchParams.get('funding_request_id') ?? '')
      return HttpResponse.json({ status: true, data })
    }),
    http.post('*/common/funding-application/funding-request', async ({ request }) => {
      const body = await request.json()
      onPost?.(body)
      return HttpResponse.json({ status: true, data: { ...data, ...(body as object) } })
    }),
    http.get('*/common/funding-sequencings/grouped', () => HttpResponse.json({ status: true, data: { groups: [] } }))
  )

/** A chip picker on the step, found by its label's input id. */
const picker = (container: HTMLElement, inputId: string) =>
  (container.querySelector(`#${inputId}`) as HTMLElement).closest('.p-multiselect') as HTMLElement
const chipsOf = (container: HTMLElement, inputId: string) =>
  Array.from(picker(container, inputId)?.querySelectorAll('.p-multiselect-token-label') ?? []).map((c) => c.textContent)

const renderStep = (opened: Opened = { fundingRequestId: 7 }) => {
  let save: (() => Promise<boolean>) | null = null
  const utils = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <Harness onSaveReady={(fn) => (save = fn)} opened={opened} />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { ...utils, save: () => save!() }
}

/** The step has loaded the request (by its funding_request_id, 7) and shows the form. */
const settled = async () => {
  await waitFor(() => expect(fetchedIds).toContain(String(apiFunding.funding_request_id)))
  return screen.findByText('Additional Funding Types')
}

describe('Funding application › Step 4: Funding Request › Additional Funding Types', () => {
  afterEach(() => {
    server.resetHandlers()
    fetchedIds = []
  })

  it('sits right after Preferred Funding Type', async () => {
    serve(apiFunding)
    renderStep()

    const additional = await settled()
    const preferred = screen.getByText('Preferred Funding Type')
    expect(preferred.compareDocumentPosition(additional) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows the types saved before', async () => {
    serve(apiFunding)
    const { container } = renderStep()

    await waitFor(() => {
      const chips = chipsOf(container, 'additional_funding_types')
      expect(chips).toEqual(['SBA Financing', 'Business Line of Credit'])
    })
  })

  it('shows only Active categories: a saved additional type that is not one is cleared, the read-only preferred one kept', async () => {
    let posted: any = null
    serve({ ...apiFunding, preferred_funding_type: 'Line of Credit', additional_funding_types: ['SBA Loan', 'Equipment Financing'] }, (body) => (posted = body))
    const user = userEvent.setup()
    const { container, save } = renderStep()

    await waitFor(() => expect(chipsOf(container, 'additional_funding_types')).toEqual(['Equipment Financing']))

    // Nothing but the categories is offered - not the saved "Line of Credit".
    await user.click(picker(container, 'additional_funding_types').querySelector('.p-multiselect-trigger') as HTMLElement)
    const panel = await waitFor(() => {
      const el = picker(container, 'additional_funding_types').querySelector('.p-multiselect-panel') as HTMLElement
      expect(el).toBeTruthy()
      return el
    })
    expect(Array.from(panel.querySelectorAll('li.p-multiselect-item')).map((o) => o.textContent?.trim())).toEqual(categories)

    expect(await save()).toBe(true)
    // Preferred Funding Type is read-only: kept as saved, not cleared.
    expect(posted.preferred_funding_type).toBe('Line of Credit')
    expect(posted.additional_funding_types).toEqual(['Equipment Financing'])
  })

  it('offers the same list as Preferred, the preferred one not selectable', async () => {
    serve({ ...apiFunding, additional_funding_types: [] })
    const user = userEvent.setup()
    const { container } = renderStep()

    await settled()
    await user.click(picker(container, 'additional_funding_types').querySelector('.p-multiselect-trigger') as HTMLElement)

    const panel = await waitFor(() => {
      const el = picker(container, 'additional_funding_types').querySelector('.p-multiselect-panel') as HTMLElement
      expect(el).toBeTruthy()
      return el
    })
    // Read the items directly: the panel is still in its opening transition.
    const items = Array.from(panel.querySelectorAll('li.p-multiselect-item'))
    const name = (o: Element) => o.querySelector('.chip-multiselect-option__label')?.textContent ?? o.textContent?.trim()
    expect(items.map(name)).toEqual(categories)
    // The preferred type (Term Loan) is listed with an "Selected as Preferred" badge, but cannot be picked again.
    const preferredItem = items.find((o) => name(o) === 'Term Loan') as Element
    expect(preferredItem.classList.contains('p-disabled')).toBe(true)
    expect(preferredItem.querySelector('.chip-multiselect-option__badge')?.textContent).toBe('Selected as Preferred')
    expect(items.filter((o) => o.querySelector('.chip-multiselect-option__badge'))).toHaveLength(1)
  })

  it('offers the lender product categories, the ones lenders are matched on', async () => {
    serve({ ...apiFunding, preferred_funding_type: null, additional_funding_types: [] })
    const user = userEvent.setup()
    const { container } = renderStep()

    await settled()
    await user.click(picker(container, 'additional_funding_types').querySelector('.p-multiselect-trigger') as HTMLElement)

    const panel = await waitFor(() => {
      const el = picker(container, 'additional_funding_types').querySelector('.p-multiselect-panel') as HTMLElement
      expect(el).toBeTruthy()
      return el
    })
    const offered = Array.from(panel.querySelectorAll('li.p-multiselect-item')).map((o) => o.textContent?.trim())
    expect(offered).toEqual(categories)
  })

  it('has a search box, like Purpose of Funds', async () => {
    serve({ ...apiFunding, additional_funding_types: [] })
    const user = userEvent.setup()
    const { container } = renderStep()

    await settled()
    await user.click(picker(container, 'additional_funding_types').querySelector('.p-multiselect-trigger') as HTMLElement)
    await user.type(await screen.findByPlaceholderText(/search funding types/i), 'SBA')

    const panel = picker(container, 'additional_funding_types').querySelector('.p-multiselect-panel') as HTMLElement
    await waitFor(() =>
      expect(Array.from(panel.querySelectorAll('li.p-multiselect-item')).map((o) => o.textContent?.trim())).toEqual(['SBA Financing'])
    )
  })

  it('sends them with the funding request', async () => {
    let posted: any = null
    serve(apiFunding, (body) => (posted = body))
    const { container, save } = renderStep()

    await waitFor(() => expect(chipsOf(container, 'additional_funding_types')).toHaveLength(2))
    expect(await save()).toBe(true)

    expect(posted.additional_funding_types).toEqual(['SBA Financing', 'Business Line of Credit'])
    expect(posted.preferred_funding_type).toBe('Term Loan')
  })

  it('sends the loaded values from a save the wizard took before the load', async () => {
    // The wizard calls whichever save the step last registered; one taken
    // before the load (or between the load rendering and the step re-registering)
    // must still send what is on screen, not the empty form (CI flake, R3).
    let posted: any = null
    serve(apiFunding, (body) => (posted = body))
    let firstSave: (() => Promise<boolean>) | null = null
    const { container } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <Harness onSaveReady={(fn) => (firstSave ??= fn)} opened={{ fundingRequestId: 7 }} />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => expect(chipsOf(container, 'additional_funding_types')).toHaveLength(2))
    expect(await firstSave!()).toBe(true)

    expect(posted.additional_funding_types).toEqual(['SBA Financing', 'Business Line of Credit'])
    expect(posted.preferred_funding_type).toBe('Term Loan')
  })

  it('sends none when none were chosen', async () => {
    let posted: any = null
    serve({ ...apiFunding, additional_funding_types: [] }, (body) => (posted = body))
    const { save } = renderStep()

    await screen.findByText('Additional Funding Types')
    // Prefilled from the API once the approved funding shows.
    await waitFor(() => expect(screen.getByDisplayValue('Term Loans')).toBeInTheDocument())
    expect(await save()).toBe(true)

    expect(posted.additional_funding_types).toEqual([])
  })
})

describe('Funding application › Step 4: Funding Request › Purpose of Funds', () => {
  afterEach(() => {
    server.resetHandlers()
    fetchedIds = []
  })

  it('is the same chip picker as Additional Funding Types', async () => {
    serve(apiFunding)
    const { container } = renderStep()

    await settled()
    expect(picker(container, 'purpose_of_funds').closest('.chip-multiselect')).not.toBeNull()
    expect(picker(container, 'additional_funding_types').closest('.chip-multiselect')).not.toBeNull()
  })

  it('shows every purpose saved before, a name with its own comma in one piece', async () => {
    serve({ ...apiFunding, purpose_of_funds: 'Working Capital, Furniture, Fixtures & Equipment (FF&E), Inventory' })
    const { container } = renderStep()

    await settled()
    await waitFor(() =>
      expect(chipsOf(container, 'purpose_of_funds')).toEqual(['Working Capital', 'Furniture, Fixtures & Equipment (FF&E)', 'Inventory'])
    )
  })

  it('reads an older single purpose as the list item it means', async () => {
    serve({ ...apiFunding, purpose_of_funds: 'equipment' })
    const { container } = renderStep()

    await settled()
    await waitFor(() => expect(chipsOf(container, 'purpose_of_funds')).toEqual(['Equipment Purchase']))
  })

  it('takes several purposes and sends them joined in purpose_of_funds', async () => {
    let posted: any = null
    serve(apiFunding, (body) => (posted = body))
    const user = userEvent.setup()
    const { container, save } = renderStep()
    await settled()
    await waitFor(() => expect(chipsOf(container, 'purpose_of_funds')).toEqual(['Working Capital']))

    await user.click(picker(container, 'purpose_of_funds').querySelector('.p-multiselect-trigger') as HTMLElement)
    await user.type(await screen.findByPlaceholderText(/search purpose/i), 'Payroll')
    await user.click(await screen.findByText('Payroll', { selector: '.p-multiselect-item span' }))
    await waitFor(() => expect(chipsOf(container, 'purpose_of_funds')).toEqual(['Working Capital', 'Payroll']))

    expect(await save()).toBe(true)
    expect(posted.purpose_of_funds).toBe('Working Capital, Payroll')
    expect(posted.purpose_note).toBeNull()
  })

  /**
   * Defect: once loaded, the step fetched the request again with the
   * application's own id (11) sent as funding_request_id. The API reads that
   * as another funding request, so the form could be filled from the wrong
   * one; the second load also re-rendered the form under the user, which made
   * the purpose tests here flaky under load.
   */
  it('loads the request by its funding request id only, never by the application id', async () => {
    serve(apiFunding)
    const { container } = renderStep()
    await settled()
    await waitFor(() => expect(chipsOf(container, 'purpose_of_funds')).toEqual(['Working Capital']))
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(fetchedIds.length).toBeGreaterThan(0)
    expect(fetchedIds.every((id) => id === String(apiFunding.funding_request_id))).toBe(true)
  })

  it('saves to the loaded application, under its funding request', async () => {
    let posted: any = null
    serve(apiFunding, (body) => (posted = body))
    const { container, save } = renderStep()
    await settled()
    await waitFor(() => expect(chipsOf(container, 'purpose_of_funds')).toEqual(['Working Capital']))

    expect(await save()).toBe(true)
    expect(posted.id).toBe(apiFunding.id)
    expect(posted.funding_request_id).toBe(apiFunding.funding_request_id)
  })

  it('asks for the note while Other is one of them, and sends it', async () => {
    let posted: any = null
    serve({ ...apiFunding, purpose_of_funds: 'Inventory, Other', purpose_note: 'Trade show booth' }, (body) => (posted = body))
    const { save } = renderStep()

    await settled()
    expect(await screen.findByDisplayValue('Trade show booth')).toBeInTheDocument()
    expect(await save()).toBe(true)
    expect(posted.purpose_of_funds).toBe('Inventory, Other')
    expect(posted.purpose_note).toBe('Trade show booth')
  })

  it('drops the note once Other is removed', async () => {
    let posted: any = null
    serve({ ...apiFunding, purpose_of_funds: 'Inventory, Other', purpose_note: 'Trade show booth' }, (body) => (posted = body))
    const user = userEvent.setup()
    const { container, save } = renderStep()
    await settled()
    await screen.findByDisplayValue('Trade show booth')

    const otherChip = Array.from(picker(container, 'purpose_of_funds').querySelectorAll('.p-multiselect-token')).find((el) =>
      el.textContent?.includes('Other')
    ) as HTMLElement
    await user.click(otherChip.querySelector('.p-multiselect-token-icon') as Element)

    expect(screen.queryByDisplayValue('Trade show booth')).not.toBeInTheDocument()
    expect(await save()).toBe(true)
    expect(posted.purpose_of_funds).toBe('Inventory')
    expect(posted.purpose_note).toBeNull()
  })
})

/**
 * Editing an application: Preferred Funding Type is read-only; the Funding
 * Sequence (was "Approved Funding Product") is chosen from a dropdown of the
 * sequences offered for that type only when the application did not come from
 * a funding request (converted from the embed form). One from a funding
 * request shows the sequence it was approved for, read-only.
 */
describe('Funding application › Step 4: Funding Request › Funding Sequence', () => {
  // Converted from the embed form: no funding request, no sequence yet.
  const embedApplication = { ...apiFunding, funding_request_id: null, funding_sequence_id: null, approved_funding: null, is_from_embed_form: true }

  afterEach(() => {
    server.resetHandlers()
    fetchedIds = []
    sequencesByType = {}
    sequencesAskedFor = []
  })

  const sequenceButton = () => screen.getByText('Funding Sequence').parentElement!.querySelector('button.form-select') as HTMLElement

  it('is labelled Funding Sequence, not Approved Funding Product', async () => {
    serve(apiFunding)
    renderStep()

    await settled()
    expect(screen.getByText('Funding Sequence')).toBeInTheDocument()
    expect(screen.queryByText('Approved Funding Product')).not.toBeInTheDocument()
  })

  it('shows Preferred Funding Type read-only', async () => {
    serve(embedApplication)
    renderStep({ fundingApplicationId: 11 })

    const preferred = await screen.findByDisplayValue('Term Loan')
    expect(preferred).toHaveAttribute('readonly')
    expect(screen.queryByText('Select preferred funding type')).not.toBeInTheDocument()
  })

  it('from a funding request: shows the approved sequence read-only, no dropdown, and keeps it', async () => {
    let posted: any = null
    serve(apiFunding, (body) => (posted = body))
    const { save } = renderStep()

    await settled()
    const sequence = await screen.findByDisplayValue('Term Loans')
    expect(sequence).toHaveAttribute('readonly')
    expect(screen.queryByText('Select funding sequence')).not.toBeInTheDocument()
    expect(sequencesAskedFor).toEqual([])

    expect(await save()).toBe(true)
    expect(posted.funding_sequence_id).toBe(3)
    expect(posted.approved_funding).toBe('Term Loans')
  })

  it('not from a funding request: offers the sequences of the preferred funding type and sends the one chosen', async () => {
    sequencesByType = { 'Term Loan': [{ id: 6, name: 'Term Loans' }, { id: 1, name: '0% Intro Business Cards' }] }
    let posted: any = null
    serve(embedApplication, (body) => (posted = body))
    const user = userEvent.setup()
    const { save } = renderStep({ fundingApplicationId: 11 })

    await waitFor(() => expect(sequencesAskedFor).toContain('Term Loan'))
    await waitFor(() => expect(sequenceButton()).not.toBeDisabled())
    await user.click(sequenceButton())
    const offered = Array.from(document.querySelectorAll('.dropdown-menu.show .dropdown-item, .dropdown-menu.show button, .dropdown-menu.show li'))
      .map((o) => o.textContent?.trim())
      .filter(Boolean)
    expect(offered).toEqual(expect.arrayContaining(['Term Loans', '0% Intro Business Cards']))
    await user.click(screen.getByText('Term Loans'))
    // The wizard shows the chosen product at once, before any save.
    expect(screen.getByTestId('wizard-approved-funding')).toHaveTextContent('Term Loans')

    expect(await save()).toBe(true)
    expect(posted.funding_sequence_id).toBe(6)
    expect(posted.approved_funding).toBe('Term Loans')
    expect(posted.funding_request_id).toBeNull()
  })

  it('no funding request but not converted from the embed form: read-only, no dropdown', async () => {
    let posted: any = null
    serve({ ...embedApplication, is_from_embed_form: false, funding_sequence_id: 6, approved_funding: 'Term Loans' }, (body) => (posted = body))
    const { save } = renderStep({ fundingApplicationId: 11 })

    expect(await screen.findByDisplayValue('Term Loans')).toHaveAttribute('readonly')
    expect(screen.queryByText('Select funding sequence')).not.toBeInTheDocument()
    expect(sequencesAskedFor).toEqual([])

    expect(await save()).toBe(true)
    expect(posted.funding_sequence_id).toBe(6)
  })

  it('not from a funding request: says so when no sequence is offered for the type', async () => {
    serve({ ...embedApplication, preferred_funding_type: 'Old Product' })
    renderStep({ fundingApplicationId: 11 })

    expect(await screen.findByText('No funding sequence is available for Old Product.')).toBeInTheDocument()
    expect(sequenceButton()).toBeDisabled()
  })
})

/**
 * Defect: R2 BUG-032 (partner wizard) - a Purpose Note of 256-500 characters
 * failed the save with a server error, and the field gave no hint of a limit.
 * It now takes up to the API's 500 and counts what is typed.
 */
describe('Funding application (partner) › Funding Request › Purpose Note (R2 BUG-032)', () => {
  afterEach(() => server.resetHandlers())

  it('takes up to 500 characters and counts them', async () => {
    serve({ ...apiFunding, purpose_of_funds: 'Other', purpose_note: 'x'.repeat(300) })
    renderStep()

    const note = await screen.findByPlaceholderText('Please specify the purpose of funds')
    await waitFor(() => expect(note).toHaveValue('x'.repeat(300)))
    expect(note).toHaveAttribute('maxlength', '500')
    expect(screen.getByText('300/500')).toBeInTheDocument()
  })
})
