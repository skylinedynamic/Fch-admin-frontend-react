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

/**
 * Once the API answers, the partner step fetches the request again by the
 * application's id (11), showing its skeleton meanwhile - so the form is only
 * settled after that second answer.
 */
const settled = async () => {
  await waitFor(() => expect(fetchedIds).toContain(String(apiFunding.id)))
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
      const chips = Array.from(container.querySelectorAll('.p-multiselect-token-label')).map((c) => c.textContent)
      expect(chips).toEqual(['SBA Loan', 'Line of Credit'])
    })
  })

  it('offers every type but the preferred one', async () => {
    serve({ ...apiFunding, additional_funding_types: [] })
    const user = userEvent.setup()
    const { container } = renderStep()

    await settled()
    await user.click(container.querySelector('.additional-funding-types') as HTMLElement)

    const panel = await waitFor(() => {
      const el = container.querySelector('.p-multiselect-panel') as HTMLElement
      expect(el).toBeTruthy()
      return el
    })
    // Read the items directly: the panel is still in its opening transition.
    const offered = Array.from(panel.querySelectorAll('li.p-multiselect-item')).map((o) => o.textContent?.trim())
    expect(offered).toContain('SBA Loan')
    expect(offered).not.toContain('Term Loan')
  })

  it('sends them with the funding request', async () => {
    let posted: any = null
    serve(apiFunding, (body) => (posted = body))
    const { container, save } = renderStep()

    await waitFor(() => expect(container.querySelectorAll('.p-multiselect-token-label')).toHaveLength(2))
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
