import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '../../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../../pageHarness'

vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))

import PreQualificationDetails from '../../../../src/pages/applications/pre-qualification/PreQualificationDetails'

const APP = { id: 12, borrower_id: 7, status: 'Pending', first_name: 'Ada', last_name: 'Lovelace' }
const VIEWER = ['view pre qualification']

const open = async (application: Record<string, unknown>) => {
  signIn({ is_host: 0, entity_type: 'Partner', partner_type: 'Certified Partner', permissions: VIEWER })
  allowBackgroundCalls()
  api('get', '/common/request-application/pre-qualification/12', { status: true, data: application })
  renderPage(<PreQualificationDetails />, { path: '/pre-qualification/:id', route: '/pre-qualification/12' })
  await screen.findByRole('link', { name: /back/i })
  await screen.findByText('Application Details')
}

const goToClient = () => screen.queryByRole('link', { name: /go to client/i })

describe('PreQualificationDetails - Go to Client', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the client this application belongs to, in the primary colour', async () => {
    await open(APP)

    expect(await screen.findByRole('link', { name: /go to client/i })).toHaveAttribute('href', '/clients/7')
    expect(goToClient()).toHaveClass('btn-primary')
  })

  it('is not offered when the application has no client', async () => {
    await open({ ...APP, borrower_id: null })

    expect(goToClient()).not.toBeInTheDocument()
  })
})
