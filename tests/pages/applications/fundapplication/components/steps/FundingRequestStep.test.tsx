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
  additional_funding_types: ['SBA Loan', 'Line of Credit'],
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

function Harness({ onSaveReady }: { onSaveReady: (fn: () => Promise<boolean>) => void }) {
  const [funding, setFunding] = useState<FundingRequest>(emptyFunding)
  return (
    <FundingRequestStep
      funding={funding}
      setFunding={setFunding}
      onNext={() => {}}
      onBack={() => {}}
      loading={false}
      onRegisterSave={(fn) => fn && onSaveReady(fn)}
      fundingRequestId={7}
    />
  )
}

// The ids the step has fetched the funding request by.
let fetchedIds: string[] = []

const serve = (data: Record<string, unknown>, onPost?: (body: any) => void) =>
  server.use(
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

const renderStep = () => {
  let save: (() => Promise<boolean>) | null = null
  const utils = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <Harness onSaveReady={(fn) => (save = fn)} />
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
      expect(chips).toEqual(['SBA Loan', 'Line of Credit'])
    })
  })

  it('offers every type but the preferred one', async () => {
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
    const offered = Array.from(panel.querySelectorAll('li.p-multiselect-item')).map((o) => o.textContent?.trim())
    expect(offered).toContain('SBA Loan')
    expect(offered).not.toContain('Term Loan')
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
      expect(Array.from(panel.querySelectorAll('li.p-multiselect-item')).map((o) => o.textContent?.trim())).toEqual(['SBA Loan'])
    )
  })

  it('sends them with the funding request', async () => {
    let posted: any = null
    serve(apiFunding, (body) => (posted = body))
    const { container, save } = renderStep()

    await waitFor(() => expect(chipsOf(container, 'additional_funding_types')).toHaveLength(2))
    expect(await save()).toBe(true)

    expect(posted.additional_funding_types).toEqual(['SBA Loan', 'Line of Credit'])
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
