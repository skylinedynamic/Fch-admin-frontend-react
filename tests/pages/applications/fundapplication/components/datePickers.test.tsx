import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '../../../../test-utils'
import CoBorrowerModal from '../../../../../src/pages/applications/fundapplication/components/shared/CoBorrowerModal'
import FinancialInformationStep from '../../../../../src/pages/applications/fundapplication/components/steps/FinancialInformationStep'
import OwnershipInformationStep from '../../../../../src/pages/applications/fundapplication/components/steps/OwnershipInformationStep'
import type { CoBorrower, FinancialInfo, OwnerInfo } from '../../../../../src/pages/applications/fundapplication/types'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Every date picker in both portals uses the shared month/year dropdowns
// (utils/flatpickrPlugins.ts). react-flatpickr is replaced by a stub that
// records the options each picker is given, so the check is on the setup
// rather than on Flatpickr's own DOM.
const pickerOptions = vi.hoisted(() => [] as Array<Record<string, any>>)
vi.mock('react-flatpickr', () => ({
  default: ({ options, className, placeholder }: any) => {
    pickerOptions.push(options || {})
    return <input className={className} placeholder={placeholder} readOnly />
  },
}))

const wrap = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={createTestQueryClient()}>{ui}</QueryClientProvider>)

const coBorrower: CoBorrower = {
  id: null, firstName: 'John', lastName: 'Co', role: 'Owner', ownershipPct: '50', email: 'john@example.com',
  mobilePhone: '', homePhone: '', streetAddress: '', country: 'United States', city: '', state: '', zip: '',
  ssn: '', dob: '1985-05-05', driversLicenseNumber: '', driversLicenseState: '',
}

const owner: OwnerInfo = {
  id: null, firstName: 'Jane', lastName: 'Owner', dob: '1990-01-01', ssn: '', citizenship: 'US Citizen',
  streetAddress: '', country: 'United States', city: '', state: '', zip: '', ownershipPct: '100',
  hasCoBorrower: false, phoneNumber: '',
}

const financial: FinancialInfo = {
  id: null, monthlyRevenue: '', annualRevenue: '', bankName: '', checkingStartDate: '2020-01-01',
  personalCreditScore: '', businessCreditScore: '', existingDebt: false, debtBalance: '',
}

const expectSharedDropdowns = () => {
  expect(pickerOptions.length).toBeGreaterThan(0)
  pickerOptions.forEach(options => {
    expect(options.monthSelectorType).toBe('dropdown')
    expect(options.plugins).toHaveLength(1)
    expect(options.plugins[0]).toBeTypeOf('function')
  })
}

describe('fund application date pickers use the shared month/year dropdowns', () => {
  it('co-borrower date of birth', () => {
    pickerOptions.length = 0
    wrap(<CoBorrowerModal coDraft={coBorrower} setCoDraft={() => {}} onSubmit={() => {}} isEditing={false} />)
    expectSharedDropdowns()
  })

  it('owner date of birth', () => {
    pickerOptions.length = 0
    wrap(
      <OwnershipInformationStep
        owner={owner} setOwner={() => {}} coBorrowers={[]} setCoBorrowers={() => {}}
        onShowCoModal={() => {}} onDeleteCoBorrower={() => {}} coDraft={coBorrower} setCoDraft={() => {}}
        onAddCoBorrower={() => {}} onEditCoBorrower={() => {}} onNext={() => {}} onBack={() => {}} loading={false}
        isValid
      />
    )
    expectSharedDropdowns()
  })

  it('business checking start date', () => {
    pickerOptions.length = 0
    wrap(
      <FinancialInformationStep
        financial={financial} setFinancial={() => {}} onNext={() => {}} onBack={() => {}} loading={false}
      />
    )
    expectSharedDropdowns()
  })
})
