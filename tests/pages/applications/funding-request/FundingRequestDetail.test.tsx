import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, within } from '../../../test-utils'
import FundingRequestDetail from '../../../../src/pages/applications/funding-request/FundingRequestDetail'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import { FUNDING_APPLICATION_STATUS } from '../../../../src/config/borrower'
import { FUNDING_REVIEW_STATUS } from '../../../../src/config/funding'

const detail = vi.hoisted(() => ({ review: {} as Record<string, unknown> }))
const downloads = vi.hoisted(() => ({ myDocument: vi.fn(), applicationDocument: vi.fn() }))

vi.mock('../../../../src/modules/client/services', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/client/services')>()),
  downloadBorrowerDocument: downloads.myDocument,
}))
vi.mock('../../../../src/modules/funding-application/services', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/funding-application/services')>()),
  downloadFundingApplicationDocument: downloads.applicationDocument,
}))
vi.mock('../../../../src/utils/fileDownload', async (original) => ({
  ...(await original<typeof import('../../../../src/utils/fileDownload')>()),
  handleFileDownload: (fetcher: () => unknown) => fetcher(),
}))

vi.mock('../../../../src/modules/application', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/application')>()),
  useFundingRequestDetails: () => ({ data: { data: detail.review }, isLoading: false, isFetching: false, error: null }),
  useUpdateFundingRequestStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useAssignLenderToFundingRequest: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('../../../../src/components/Common/Activity/ActivitySidebar', () => ({ default: () => null }))

// An approved request belonging to white-label partner 21.
const approved = {
  id: 29,
  partner_id: 21,
  borrower_id: 5,
  status: FUNDING_REVIEW_STATUS.APPROVED,
  funding_type: 'Business Line of Credit',
  requested_amount: 30000,
  documents: [],
  matched_lenders: [],
  funding_application: null,
}

const asHost = () => useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
const asOwningPartner = () => useAuthStore.setState({ user: { id: 9, is_host: false, partner_id: 21, permissions: [] } as never })

const processLink = () => screen.queryByRole('link', { name: /process application/i })
const editLink = () => screen.queryByRole('link', { name: /edit funding application/i })

describe('FundingRequestDetail — preparing the funding application', () => {
  beforeEach(() => {
    detail.review = { ...approved }
  })

  it('offers Process Application to the partner that owns the request', () => {
    asOwningPartner()
    renderWithProviders(<FundingRequestDetail />)

    expect(processLink()).toHaveAttribute('href', '/fund-application/29')
  })

  it('offers Edit Funding Application to the owning partner once the application is submitted', () => {
    asOwningPartner()
    detail.review = { ...approved, funding_application: { id: 80, status: FUNDING_APPLICATION_STATUS.PENDING, is_editable: true } }
    renderWithProviders(<FundingRequestDetail />)

    expect(editLink()).toHaveAttribute('href', '/fund-application/29')
  })

  // Defect: the host could open and save a partner's funding application.
  it('offers neither to the host on a partner\'s request', () => {
    asHost()
    renderWithProviders(<FundingRequestDetail />)
    expect(processLink()).not.toBeInTheDocument()

    detail.review = { ...approved, funding_application: { id: 80, status: FUNDING_APPLICATION_STATUS.PENDING, is_editable: true } }
    renderWithProviders(<FundingRequestDetail />)
    expect(editLink()).not.toBeInTheDocument()
  })

  it('still offers Process Application to the host on its own borrower\'s request', () => {
    asHost()
    detail.review = { ...approved, partner_id: 1 }
    renderWithProviders(<FundingRequestDetail />)

    expect(processLink()).toBeInTheDocument()
  })
})

/**
 * Defect (QA 2026-10-16): the Host's Documents Uploaded list always came from
 * My Documents. A row is now the funding application's copy once there is
 * one, and its download must go through the application's document.
 */
describe('FundingRequestDetail — documents uploaded', () => {
  beforeEach(() => {
    downloads.myDocument.mockReset()
    downloads.applicationDocument.mockReset()
    asHost()
    detail.review = {
      ...approved,
      documents_with_urls: [
        { name: 'Driver’s License', source: 'application', document_id: 6, file_name: 'licence.pdf', document_type: 'Driver’s License', status: 'Uploaded', url: 'http://x/storage/funding-application/5/FA-1/licence.pdf' },
        { name: 'Business Bank Statements', source: 'borrower', document_id: 11, file_name: 'march.pdf', document_type: 'Business Bank Statements', status: 'Uploaded', url: 'http://x/storage/borrowers/5/march.pdf' },
      ],
    }
  })

  const downloadFor = (fileName: string) => {
    const row = screen.getByText(fileName).closest('tr') as HTMLElement
    return within(row).getByTitle('Download Document')
  }

  it('downloads an application copy from the funding application', async () => {
    renderWithProviders(<FundingRequestDetail />)
    await userEvent.click(downloadFor('licence.pdf'))

    expect(downloads.applicationDocument).toHaveBeenCalledWith(6)
    expect(downloads.myDocument).not.toHaveBeenCalled()
  })

  it('downloads a My Documents file from My Documents', async () => {
    renderWithProviders(<FundingRequestDetail />)
    await userEvent.click(downloadFor('march.pdf'))

    expect(downloads.myDocument).toHaveBeenCalledWith(11)
    expect(downloads.applicationDocument).not.toHaveBeenCalled()
  })
})
