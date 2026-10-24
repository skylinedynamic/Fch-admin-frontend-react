import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../../../../../mocks/server'
import { createTestQueryClient } from '../../../../../test-utils'
import FederalComplianceStep from '../../../../../../src/pages/applications/fundapplication/components/steps/FederalComplianceStep'
import type { FederalCompliance } from '../../../../../../src/pages/applications/fundapplication/types'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('bootstrap/js/dist/modal', () => import('../../../../../mocks/fakeBootstrapModal'))

import { toast } from 'react-toastify'

/**
 * Federal Compliance Disclosures - the partner's last step. "Save & Notify
 * Borrower" -> "Yes, Save & Notify" saves the whole funding application and
 * hands it to the borrower, so the message is about the application, not the
 * one step. A save from a tab switch keeps the step's own message.
 *
 * Defect: the final save said "Federal compliance disclosures saved
 * successfully!", which reads as if only that step was saved.
 */
const answered: FederalCompliance = {
  legalBusinessName: '',
  ein: '',
  country: '',
  ofacResult: '',
  patriotActAck: false,
  fcraAuth: false,
  ecoaAck: false,
  bankruptcy: 'no',
  lawsuit: 'no',
  federalLoanDefault: 'no',
  federalDebtDelinquent: 'no',
  criminalOffense: 'no',
  paroleProbation: 'no',
  suspendedDebarred: 'no',
  judgmentsLiensBusiness: 'no',
  judgmentsLiensOwner: 'no',
  explanation: '',
}

function Harness({ onNext, onSaveReady }: { onNext: () => void; onSaveReady: (fn: () => Promise<boolean>) => void }) {
  const [federal, setFederal] = useState<FederalCompliance>(answered)
  return (
    <FederalComplianceStep
      federal={federal}
      setFederal={setFederal}
      onNext={onNext}
      onBack={() => {}}
      loading={false}
      isValid={true}
      fundingRequestId={7}
      nextLabel="Save & Notify Borrower"
      onRegisterSave={(fn) => fn && onSaveReady(fn)}
    />
  )
}

const renderStep = () => {
  const onNext = vi.fn()
  let save: (() => Promise<boolean>) | null = null
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <Harness onNext={onNext} onSaveReady={(fn) => (save = fn)} />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { onNext, getSave: () => save }
}

const serve = (status = 200) =>
  server.use(
    http.get('*/common/funding-application/federal-compliance-disclosures', () =>
      HttpResponse.json({ status: true, data: { id: 5 } })
    ),
    http.post('*/common/funding-application/federal-compliance-disclosures', () =>
      status === 200
        ? HttpResponse.json({ status: true, message: 'saved', data: { id: 5 } })
        : HttpResponse.json({ status: false, message: 'Server down' }, { status })
    )
  )

describe('FederalComplianceStep (partner, last step)', () => {
  afterEach(() => {
    server.resetHandlers()
    vi.clearAllMocks()
  })

  it('says the funding application was saved after Save & Notify', async () => {
    serve()
    const user = userEvent.setup()
    const { onNext } = renderStep()

    await user.click(await screen.findByRole('button', { name: /save & notify borrower/i }))
    await user.click(await screen.findByRole('button', { name: /yes, save & notify/i }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Funding application saved successfully!'))
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('keeps the step message for a save from a tab switch', async () => {
    serve()
    const { getSave } = renderStep()
    await screen.findByRole('button', { name: /save & notify borrower/i })

    await expect(getSave()!()).resolves.toBe(true)

    expect(toast.success).toHaveBeenCalledWith('Federal compliance disclosures saved successfully!')
  })

  it('shows the error and stays when the final save fails', async () => {
    serve(500)
    const user = userEvent.setup()
    const { onNext } = renderStep()

    await user.click(await screen.findByRole('button', { name: /save & notify borrower/i }))
    await user.click(await screen.findByRole('button', { name: /yes, save & notify/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server down'))
    expect(toast.success).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
  })
})
