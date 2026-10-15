import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test-utils'
import FundingApplicationAuditHistory from '../../../../src/pages/applications/funding/FundingApplicationAuditHistory'
import { useAuthStore } from '../../../../src/store/auth/authStore'

const audit = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }))

vi.mock('../../../../src/modules/application/queries', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/application/queries')>()),
  useFundingApplicationDetails: () => ({ data: { data: { id: 82, application_number: 'FUND-000082', full_name: 'Zia Fuentes' } }, isLoading: false, error: null }),
  useFundingApplicationAuditHistory: () => ({ data: { data: audit.rows, meta: { total: audit.rows.length } }, isLoading: false, isFetching: false }),
}))

const download = {
  id: 5,
  user_name: 'Host Admin',
  user_type: 'Admin',
  application_number: 'FUND-000082',
  file_type: 'application_pdf',
  action: 'downloaded_with_password',
  sha256_hash: 'a'.repeat(64),
  ip_address: '127.0.0.1',
  downloaded_at: '2026-10-15 02:09 PM',
  details: { browser_name: 'Chrome', device_type: 'Desktop', operating_system: 'Windows' },
}

/**
 * QA 2026-10-15: downloads are no longer saved on the server and their
 * password is never stored. The record shows who downloaded what and the
 * file's hash; it offers no file to download again and never a password.
 */
describe('FundingApplicationAuditHistory — a download record', () => {
  beforeEach(() => {
    audit.rows = [download]
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: ['view funding application'] } as never })
  })

  it('explains that the file is not kept and shows no password', async () => {
    renderWithProviders(<FundingApplicationAuditHistory />)

    await userEvent.click(await screen.findByTitle('View Details'))

    expect(await screen.findByText(/downloads are not kept on the server/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /download document/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/document password used/i)).not.toBeInTheDocument()
  })
})
