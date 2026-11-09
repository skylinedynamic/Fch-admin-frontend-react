import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'react-toastify'
import { server } from '../../../../../mocks/server'
import { createTestQueryClient } from '../../../../../test-utils'
import FundingRequestStep, { matchPurpose, matchTimeframe } from '../../../../../../src/pages/applications/fundapplication/components/steps/FundingRequestStep'
import type { FundingRequest } from '../../../../../../src/pages/applications/fundapplication/types'
import { resetEditConfirmation, resolveEditConfirmation, setEditRequiresConfirmation, useEditConfirmationStore } from '../../../../../../src/store/fundApplication/editConfirmationStore'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/**
 * Step 4, Funding Request: every path of the step besides the funding types,
 * purposes and funding sequence (FundingRequestStep.test.tsx) - how it is
 * prefilled (API, route state, URL), the timeframe and collateral fields, the
 * save's outcomes (saved, field errors, stale copy, cancelled, failure) and
 * Save & Next.
 */
const API = '*/common/funding-application/funding-request'

const apiFunding = {
  id: 11,
  funding_request_id: 7,
  funding_sequence_id: 3,
  requested_amount: '50000.00',
  purpose_of_funds: 'Working Capital',
  approved_funding: 'Term Loans',
  preferred_funding_type: 'Term Loan',
  additional_funding_types: [],
  timeframe_needed: '1 Month',
  collateral_available: 'None',
  purpose_note: null,
}

const emptyFunding: FundingRequest = {
  requestedAmount: '', purpose: '', approvedFunding: '', fundingType: '', timeframe: '', collateral: '', purposeNote: '', additionalFundingTypes: [],
}

type Props = {
  fundingRequestId?: number
  fundingApplicationId?: number
  fundingSequenceId?: number
  initial?: FundingRequest
  loading?: boolean
  register?: boolean
  onNext?: () => void
}

function Harness({ props, onSaveReady }: { props: Props; onSaveReady: (fn: () => Promise<boolean>) => void }) {
  const [funding, setFunding] = useState<FundingRequest>(props.initial ?? emptyFunding)
  return (
    <>
      <output data-testid="state">{JSON.stringify(funding)}</output>
      <FundingRequestStep
        funding={funding}
        setFunding={setFunding}
        onNext={props.onNext ?? (() => {})}
        onBack={() => {}}
        loading={props.loading ?? false}
        onRegisterSave={props.register === false ? undefined : (fn) => fn && onSaveReady(fn)}
        fundingRequestId={props.fundingRequestId}
        fundingApplicationId={props.fundingApplicationId}
        fundingSequenceId={props.fundingSequenceId}
      />
    </>
  )
}

let fetchedIds: string[] = []
let sequences: { id: number; name: string }[] = []

const serve = (data: Record<string, unknown>, post?: (body: any) => Response | Promise<Response>, posted?: (body: any) => void) =>
  server.use(
    http.get('*/common/funding-types', () => HttpResponse.json({ status: true, data: ['Term Loan', 'Business Line of Credit', 'SBA Financing'] })),
    http.get('*/common/funding-sequences', () => HttpResponse.json({ status: true, data: sequences })),
    http.get(API, ({ request }) => {
      fetchedIds.push(new URL(request.url).searchParams.get('funding_request_id') ?? '')
      return HttpResponse.json({ status: true, data })
    }),
    http.post(API, async ({ request }) => {
      const body = await request.json()
      posted?.(body)
      return post ? post(body) : HttpResponse.json({ status: true, data: { ...data, ...(body as object) } })
    })
  )

const renderStep = (props: Props = { fundingRequestId: 7 }, entry: { pathname?: string; search?: string; state?: unknown } = {}) => {
  let save: (() => Promise<boolean>) | null = null
  const utils = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[{ pathname: entry.pathname ?? '/edit', search: entry.search ?? '', state: entry.state }]}>
        <Harness props={props} onSaveReady={(fn) => (save = fn)} />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { ...utils, save: () => save!() }
}

const state = (): FundingRequest => JSON.parse(screen.getByTestId('state').textContent || '{}')
const dropdownUnder = (label: string) => screen.getByText(label).parentElement!.querySelector('button.form-select') as HTMLElement
const loaded = () => waitFor(() => expect(screen.getByText('Requested Amount')).toBeInTheDocument())

beforeEach(() => {
  fetchedIds = []
  sequences = []
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
})

afterEach(() => {
  server.resetHandlers()
  resetEditConfirmation()
})

describe('Funding Request step › reading a saved timeframe and purpose', () => {
  it.each([
    [null, ''],
    ['', ''],
    ['1 month', '1 Month'],
    ['Flexible', 'Flexible'],
    ['Within hours', 'Immediately'],
    ['1-3 days', 'Immediately'],
    ['1-5 days', 'Immediately'],
    ['3-7 days', 'Immediately'],
    ['As soon as possible - immediately', 'Immediately'],
    ['7-14 days', '1-2 Weeks'],
    ['1-2 weeks', '1-2 Weeks'],
    ['within 2 weeks', '1-2 Weeks'],
    ['21-45 days', '1 Month'],
    ['30-60 days', '1 Month'],
    ['about a month', '1 Month'],
    ['flexible timing', 'Flexible'],
    ['  Next quarter  ', 'Next quarter'],
  ])('reads %j as %j', (raw, expected) => {
    expect(matchTimeframe(raw)).toBe(expected)
  })

  it('reads purposes as the list items they mean', () => {
    expect(matchPurpose('equipment')).toBe('Equipment Purchase')
    expect(matchPurpose(null)).toBe('')
  })
})

describe('Funding Request step › prefilling', () => {
  it('shows the skeleton while the wizard is loading', () => {
    serve(apiFunding)
    renderStep({ fundingRequestId: 7, loading: true })
    expect(screen.queryByText('Requested Amount')).not.toBeInTheDocument()
  })

  it.each([
    ['the route state funding_request_id', { state: { funding_request_id: 7 } }],
    ['the route state fundingRequestId', { state: { fundingRequestId: 7 } }],
    ['the funding_request_id query', { search: '?funding_request_id=7' }],
    ['the fundingRequestId query', { search: '?fundingRequestId=7' }],
  ])('loads the request named by %s', async (_, entry) => {
    serve(apiFunding)
    renderStep({}, entry)
    await waitFor(() => expect(fetchedIds).toContain('7'))
  })

  it('takes what the route carries over the saved values', async () => {
    serve(apiFunding)
    renderStep({ fundingRequestId: 7 }, {
      state: { approved_funding: 'Fast Term Loans', requested_amount: '75000', funding_type: 'SBA Financing', purpose: 'Inventory' },
    })

    await loaded()
    await waitFor(() => expect(state().approvedFunding).toBe('Fast Term Loans'))
    expect(state()).toMatchObject({ requestedAmount: '75,000', fundingType: 'SBA Financing', purpose: 'Inventory' })
  })

  it('shows the approved product from the route at once, before the request loads', async () => {
    // The request never answers: only the route state can fill the form.
    server.use(http.get(API, () => new Promise(() => {})))
    renderStep({ fundingRequestId: 7 }, { state: { approved_funding: 'Fast Term Loans' } })

    await waitFor(() => expect(state().approvedFunding).toBe('Fast Term Loans'))
    expect(state()).toMatchObject({ requestedAmount: '', fundingType: '', purpose: '' })
  })

  it('prefills the rest of the route state the same way', async () => {
    serve(apiFunding)
    server.use(http.get(API, () => new Promise(() => {})))
    renderStep({ fundingRequestId: 7 }, {
      state: { approved_funding: 'Fast Term Loans', requested_amount: '75000', funding_type: 'SBA Financing', purpose: 'Inventory' },
    })

    await waitFor(() => expect(state()).toMatchObject({ approvedFunding: 'Fast Term Loans', requestedAmount: '75,000', fundingType: 'SBA Financing', purpose: 'Inventory' }))
  })

  it('keeps what the wizard already holds where the API has nothing', async () => {
    serve({
      ...apiFunding, id: null, funding_request_id: null, funding_sequence_id: null, requested_amount: null, purpose_of_funds: null,
      approved_funding: null, preferred_funding_type: null, additional_funding_types: null, timeframe_needed: null, collateral_available: null,
    })
    renderStep({
      fundingRequestId: 7,
      initial: { ...emptyFunding, purpose: 'Inventory', approvedFunding: 'Term Loans', fundingType: 'Term Loan', timeframe: 'Flexible' },
    })

    await loaded()
    await waitFor(() => expect(state()).toMatchObject({ requestedAmount: '', purpose: 'Inventory', approvedFunding: 'Term Loans', fundingType: 'Term Loan', timeframe: 'Flexible', collateral: '' }))
  })

  it('works without the wizard listening for its save', async () => {
    serve(apiFunding)
    renderStep({ fundingRequestId: 7, register: false })
    await loaded()
    expect(await screen.findByDisplayValue('Term Loans')).toBeInTheDocument()
  })
})

describe('Funding Request step › the other fields', () => {
  it('lets the preferred funding type be chosen while the application has none', async () => {
    let posted: any = null
    serve({ ...apiFunding, preferred_funding_type: null, additional_funding_types: ['SBA Financing'] }, undefined, (b) => (posted = b))
    const user = userEvent.setup()
    const { save } = renderStep({ fundingRequestId: 7, initial: { ...emptyFunding, fundingType: 'Old Name' } })

    await loaded()
    await waitFor(() => expect(dropdownUnder('Preferred Funding Type')).toHaveTextContent('Select preferred funding type'))
    await user.click(dropdownUnder('Preferred Funding Type'))
    await user.click(await screen.findByText('SBA Financing', { selector: '.dropdown-menu *' }))

    expect(await save()).toBe(true)
    expect(posted.preferred_funding_type).toBe('SBA Financing')
    // The preferred one is never an additional one too.
    expect(posted.additional_funding_types).toEqual([])
  })

  it('keeps a saved timeframe not on the list, and saves the timeframe and collateral chosen', async () => {
    let posted: any = null
    serve({ ...apiFunding, timeframe_needed: 'Next quarter', collateral_available: null }, undefined, (b) => (posted = b))
    const user = userEvent.setup()
    const { save } = renderStep()

    await loaded()
    await waitFor(() => expect(dropdownUnder('Timeframe Needed')).toHaveTextContent('Next quarter'))
    await user.click(dropdownUnder('Timeframe Needed'))
    await user.click(await screen.findByText('Flexible', { selector: '.dropdown-menu *' }))
    await user.click(dropdownUnder('Collateral Available?'))
    await user.click(await screen.findByText('Real Estate', { selector: '.dropdown-menu *' }))

    expect(await save()).toBe(true)
    expect(posted).toMatchObject({ timeframe_needed: 'Flexible', collateral_available: 'Real Estate' })
  })

  it('sends a typed purpose note, and holds Save & Next until there is one', async () => {
    let posted: any = null
    serve({ ...apiFunding, purpose_of_funds: 'Other' }, undefined, (b) => (posted = b))
    const user = userEvent.setup()
    const { save } = renderStep()

    const note = await screen.findByPlaceholderText('Please specify the purpose of funds')
    expect(screen.getByRole('button', { name: /save & next/i })).toBeDisabled()
    await user.type(note, 'Trade show booth')
    expect(screen.getByRole('button', { name: /save & next/i })).toBeEnabled()

    expect(await save()).toBe(true)
    expect(posted.purpose_note).toBe('Trade show booth')
  })

  it('sends the sequence the wizard holds for an application that does not choose one', async () => {
    let posted: any = null
    serve({ ...apiFunding, funding_request_id: null, funding_sequence_id: null }, undefined, (b) => (posted = b))
    const { save } = renderStep({ fundingApplicationId: 11, fundingSequenceId: 9 })

    await loaded()
    await screen.findByDisplayValue('Term Loans')
    expect(await save()).toBe(true)
    expect(posted).toMatchObject({ funding_sequence_id: 9, funding_request_id: null })
  })

  it('sends no funding sequence or product when none was chosen', async () => {
    let posted: any = null
    sequences = [{ id: 6, name: 'Term Loans' }]
    serve({ ...apiFunding, funding_request_id: null, funding_sequence_id: null, approved_funding: null, requested_amount: null, is_from_embed_form: true }, undefined, (b) => (posted = b))
    const { save } = renderStep({ fundingApplicationId: 11 })

    await loaded()
    await waitFor(() => expect(dropdownUnder('Funding Sequence')).not.toBeDisabled())
    expect(screen.getByRole('button', { name: /save & next/i })).toBeDisabled()
    await save()
    expect(posted).toMatchObject({ funding_sequence_id: null, approved_funding: null, requested_amount: null })
  })

  it('does not ask for sequences while the application has no funding type', async () => {
    let asked = false
    serve({ ...apiFunding, funding_request_id: null, funding_sequence_id: null, approved_funding: null, preferred_funding_type: null, is_from_embed_form: true })
    server.use(http.get('*/common/funding-sequences', () => { asked = true; return HttpResponse.json({ status: true, data: [] }) }))
    renderStep({ fundingApplicationId: 11 })

    await loaded()
    await waitFor(() => expect(dropdownUnder('Funding Sequence')).toBeDisabled())
    expect(screen.queryByText(/No funding sequence is available/)).not.toBeInTheDocument()
    expect(asked).toBe(false)
  })

  it('keeps a saved purpose that is not on the list', async () => {
    serve({ ...apiFunding, purpose_of_funds: 'Trade show booth' })
    const { container } = renderStep()

    await loaded()
    await waitFor(() =>
      expect(Array.from(container.querySelectorAll('#purpose_of_funds ~ * .p-multiselect-token-label, .p-multiselect-token-label')).map((c) => c.textContent)).toContain('Trade show booth')
    )
  })

  it('asks for the note once Other is picked, and saves the additional types picked', async () => {
    let posted: any = null
    serve(apiFunding, undefined, (b) => (posted = b))
    const user = userEvent.setup()
    const { container, save } = renderStep()
    await loaded()
    await screen.findByDisplayValue('Term Loans')

    const picker = (id: string) => (container.querySelector(`#${id}`) as HTMLElement).closest('.p-multiselect') as HTMLElement
    await user.click(picker('purpose_of_funds').querySelector('.p-multiselect-trigger') as HTMLElement)
    await user.type(await screen.findByPlaceholderText(/search purpose/i), 'Other')
    await user.click(await screen.findByText('Other', { selector: '.p-multiselect-item span' }))
    expect(await screen.findByPlaceholderText('Please specify the purpose of funds')).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.click(picker('additional_funding_types').querySelector('.p-multiselect-trigger') as HTMLElement)
    await user.click(await screen.findByText('SBA Financing', { selector: '.p-multiselect-item *' }))

    await save()
    expect(posted.purpose_of_funds).toBe('Working Capital, Other')
    expect(posted.additional_funding_types).toEqual(['SBA Financing'])
  })

  it('sends nothing for what is empty', async () => {
    let posted: any = null
    serve({ ...apiFunding, funding_sequence_id: null, purpose_of_funds: null, approved_funding: null, timeframe_needed: null, collateral_available: null }, undefined, (b) => (posted = b))
    const { save } = renderStep()

    await loaded()
    await waitFor(() => expect(state().fundingType).toBe('Term Loan'))
    await save()
    expect(posted).toMatchObject({ funding_sequence_id: null, purpose_of_funds: null, approved_funding: null, timeframe_needed: null, collateral_available: null, purpose_note: null })
  })

  it('shows an empty form for an application not saved yet', async () => {
    serve(apiFunding)
    // Opened on nothing: no request or application to load.
    renderStep({ initial: { requestedAmount: '', purpose: '', approvedFunding: '', fundingType: '', timeframe: '', collateral: '' } })

    await loaded()
    // The funding types have arrived (they are offered), and left the form as it was.
    const user = userEvent.setup()
    await user.click(dropdownUnder('Preferred Funding Type'))
    expect(await screen.findByText('SBA Financing', { selector: '.dropdown-menu *' })).toBeInTheDocument()
    expect(state().additionalFundingTypes).toBeUndefined()
    expect(state().fundingType).toBe('')
  })
})

describe('Funding Request step › saving', () => {
  const allErrors = {
    requested_amount: 'Amount error', purpose_of_funds: 'Purpose error', purpose_note: 'Note error', funding_sequence_id: 'Sequence error',
    approved_funding: 'Approved error', preferred_funding_type: 'Type error', additional_funding_types: 'Additional error',
    timeframe_needed: 'Timeframe error', collateral_available: 'Collateral error',
  }

  it.each([
    ['from a funding request (read-only type and sequence)', apiFunding, { fundingRequestId: 7 }],
    ['converted from the embed form (type and sequence to choose)', { ...apiFunding, funding_request_id: null, preferred_funding_type: null, is_from_embed_form: true }, { fundingApplicationId: 11 }],
  ])('shows each field\'s error under it - %s', async (_, data, props) => {
    serve({ ...data, purpose_of_funds: 'Other' }, () => HttpResponse.json({ message: 'Invalid', errors: allErrors }, { status: 422 }))
    const { save } = renderStep(props)

    await loaded()
    await screen.findByPlaceholderText('Please specify the purpose of funds')
    expect(await save()).toBe(false)

    for (const message of Object.values(allErrors)) {
      expect(await screen.findByText(message)).toBeInTheDocument()
    }
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('says the application changed elsewhere when saved from an older copy', async () => {
    serve(apiFunding, () => HttpResponse.json({ message: 'Changed since you opened it.' }, { status: 409 }))
    const { save } = renderStep()

    await loaded()
    await screen.findByDisplayValue('Term Loans')
    expect(await save()).toBe(false)
    expect(toast.error).toHaveBeenCalledOnce()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('says nothing when the re-signature warning is backed out of', async () => {
    let sent = false
    serve(apiFunding, undefined, () => (sent = true))
    setEditRequiresConfirmation(true, 11)
    const { save } = renderStep()

    await loaded()
    await screen.findByDisplayValue('Term Loans')
    const pending = save()
    await waitFor(() => expect(useEditConfirmationStore.getState().isOpen).toBe(true))
    resolveEditConfirmation(false)
    expect(await pending).toBe(false)
    expect(sent).toBe(false)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it.each([
    ['the API\'s message', () => HttpResponse.json({ message: 'Server says no' }, { status: 500 }), 'Server says no'],
    ['a general message when the API gives none', () => HttpResponse.json({}, { status: 500 }), 'Failed to save funding request'],
    ['a general message when there is no answer', () => HttpResponse.error(), 'Failed to save funding request'],
  ])('shows %s when the save fails', async (_, failure, message) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    serve(apiFunding, failure as any)
    const { save } = renderStep()

    await loaded()
    await screen.findByDisplayValue('Term Loans')
    expect(await save()).toBe(false)
    expect(toast.error).toHaveBeenCalledWith(message)
  })

  it('goes on to the next step only after Save & Next saves', async () => {
    const onNext = vi.fn()
    serve(apiFunding)
    const user = userEvent.setup()
    renderStep({ fundingRequestId: 7, onNext })

    await loaded()
    await screen.findByDisplayValue('Term Loans')
    await user.click(screen.getByRole('button', { name: /save & next/i }))
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
    expect(toast.success).toHaveBeenCalledWith('Funding request saved successfully')
  })

  it('stays on the step when Save & Next fails', async () => {
    const onNext = vi.fn()
    serve(apiFunding, () => HttpResponse.json({ message: 'Invalid', errors: { purpose_of_funds: 'Purpose error' } }, { status: 422 }))
    const user = userEvent.setup()
    renderStep({ fundingRequestId: 7, onNext })

    await loaded()
    await screen.findByDisplayValue('Term Loans')
    await user.click(screen.getByRole('button', { name: /save & next/i }))
    expect(await screen.findByText('Purpose error')).toBeInTheDocument()
    expect(onNext).not.toHaveBeenCalled()
  })

  it('saves when the form itself is submitted', async () => {
    const onNext = vi.fn()
    serve(apiFunding)
    const { container } = renderStep({ fundingRequestId: 7, onNext })

    await loaded()
    await screen.findByDisplayValue('Term Loans')
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
  })
})
