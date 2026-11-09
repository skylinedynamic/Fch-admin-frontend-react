import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../../../mocks/server'
import { createTestQueryClient, render, screen, waitFor } from '../../../test-utils'
import FundApplication from '../../../../src/pages/applications/fundapplication/FundApplication'
import { queryKeys } from '../../../../src/lib/query/queryKeys'

vi.mock('../../../../src/utils/flatpickrPlugins', () => ({
  yearDropdownPlugin: () => () => ({}),
}))

// The step only shows the sequence the wizard hands it - that is what it saves.
vi.mock('../../../../src/pages/applications/fundapplication/components/steps/BusinessInformationStep', () => ({
  default: (props: { fundingSequenceId?: number | string | null }) => (
    <output data-testid="business-step-sequence">{String(props.fundingSequenceId)}</output>
  ),
}))

afterEach(() => server.resetHandlers())

// The step is rendered once per layout; every copy must hand on the same sequence.
const shownSequences = () => [...new Set(screen.getAllByTestId('business-step-sequence').map((el) => el.textContent))]

/**
 * Defect: the wizard took the application's funding sequence from the first
 * load only. After the Funding Sequence was changed on the Funding Request step
 * (an application converted from the embed form), the other steps still saved
 * the first one, putting it back. Every load now hands the steps the sequence
 * the application holds.
 */
describe('FundApplication - the funding sequence the steps save', () => {
  it('is the one the application holds now, not the first one loaded', async () => {
    let sequenceId = 3
    server.use(
      http.get('*/common/funding-application/funding-request', () =>
        HttpResponse.json({
          status: true, message: '',
          data: { id: 114, funding_request_id: null, funding_sequence_id: sequenceId, preferred_funding_type: 'Term Loan', is_from_embed_form: true, status: 'Draft' },
        })
      ),
      http.get('*/common/funding-application/*', () => HttpResponse.json({ status: true, message: '', data: null })),
      http.get('*/common/doc-types', () => HttpResponse.json({ status: true, message: '', data: [] })),
    )
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/intake-review/funding-application/114/edit']}>
          <Routes>
            <Route path="/intake-review/funding-application/:applicationId/edit" element={<FundApplication />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => expect(shownSequences()).toEqual(['3']), { timeout: 10000 })

    // Chosen again on the Funding Request step and saved: the wizard reloads it.
    sequenceId = 6
    await queryClient.invalidateQueries({ queryKey: queryKeys.fundingApplication.fundingRequest() })

    await waitFor(() => expect(shownSequences()).toEqual(['6']), { timeout: 10000 })
  }, 25000)
})
