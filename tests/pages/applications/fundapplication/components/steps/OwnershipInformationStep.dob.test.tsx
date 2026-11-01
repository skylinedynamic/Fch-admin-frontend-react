import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../../../../mocks/server'
import { createTestQueryClient } from '../../../../../test-utils'
import OwnershipInformationStep from '../../../../../../src/pages/applications/fundapplication/components/steps/OwnershipInformationStep'
import type { OwnerInfo, CoBorrower } from '../../../../../../src/pages/applications/fundapplication/types'
import { countries, clearLocationCache } from '../../../../../../src/modules/location'
import { latestAdultBirthDate } from '../../../../../../src/modules/funding-application/applicationRules'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
// A plain input in place of the date picker, carrying the latest date it allows.
vi.mock('react-flatpickr', () => ({
  default: ({ value, onChange, className, placeholder, options }: any) => (
    <input
      data-max-date={options?.maxDate instanceof Date ? options.maxDate.toDateString() : options?.maxDate}
      className={className}
      value={value || ''}
      placeholder={placeholder}
      onChange={(e: any) => onChange([e.target.value], e.target.value)}
    />
  ),
}))

const owner = {
  id: null, firstName: 'Jane', lastName: 'Borrower', dob: '1990-01-01', ssn: '', citizenship: 'US Citizen',
  streetAddress: '123 Main St', country: 'United States', city: 'Austin', state: 'Texas', zip: '78701',
  ownershipPct: '100', hasCoBorrower: false, phoneNumber: '(512) 555-0100',
} as OwnerInfo

function Harness() {
  const [value, setValue] = useState<OwnerInfo>(owner)
  const [coBorrowers, setCoBorrowers] = useState<CoBorrower[]>([])
  return (
    <OwnershipInformationStep
      owner={value}
      setOwner={setValue}
      coBorrowers={coBorrowers}
      setCoBorrowers={setCoBorrowers}
      onShowCoModal={() => {}}
      onDeleteCoBorrower={() => {}}
      coDraft={{} as CoBorrower}
      setCoDraft={() => {}}
      onAddCoBorrower={() => {}}
      onEditCoBorrower={() => {}}
      onNext={() => {}}
      onBack={() => {}}
      loading={false}
      isValid={true}
      onRegisterSave={() => {}}
      fundingRequestId={7}
    />
  )
}

/**
 * Defect: R2 BUG-031 (partner wizard) - the owner's date-of-birth picker
 * allowed any date up to today, so an owner under 18 could be picked and
 * saved. It stops at 18 years ago; the API refuses a younger owner as well.
 */
describe('OwnershipInformationStep (admin) — date of birth (R2 BUG-031)', () => {
  beforeEach(() => {
    clearLocationCache()
    countries.push({ name: 'United States', code: 'USA', currency: 'USD', phone_code: '+1', flag: '', states: [] } as any)
  })
  afterEach(() => {
    server.resetHandlers()
    clearLocationCache()
  })

  it('lets the owner pick only a date of birth that is 18 or older', async () => {
    server.use(http.get('*/common/funding-application/ownership-info', () => HttpResponse.json({ status: true, data: {} })))
    render(<QueryClientProvider client={createTestQueryClient()}><Harness /></QueryClientProvider>)

    const dob = await screen.findByPlaceholderText('Select date of birth')
    expect(dob).toHaveAttribute('data-max-date', latestAdultBirthDate().toDateString())
  })
})
