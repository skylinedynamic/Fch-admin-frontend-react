import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import { ownerSummaryResponse } from '../../mocks/ownerSummary'
import OwnerSummary from '../../../src/pages/owner-summary/OwnerSummary'
import { useAuthStore } from '../../../src/store/auth'
import { OWNER_SUMMARY_PERMISSION } from '../../../src/config/ownerSummary'

// Business Insights: seeing the screen, exporting it and managing the weekly
// report are three developer-only permissions; each button shows only to whoever
// holds its permission (the API checks each one again).
const signIn = (permissions: string[]) =>
  useAuthStore.setState({ token: 't', user: { id: 1, name: 'Dev Eloper', is_host: 1, entity_type: 'Employee', permissions } } as never)

beforeEach(() => {
  server.use(http.get('*/common/owner-summary', () => HttpResponse.json(ownerSummaryResponse())))
})

afterEach(() => server.resetHandlers())

const renderPage = async () => {
  renderWithProviders(<OwnerSummary />, { route: '/business-insights' })
  await screen.findByTestId('owner-kpis')
}

describe('Business Insights permissions', () => {
  it('offers Report settings and Export PDF to a login holding all three', async () => {
    signIn([OWNER_SUMMARY_PERMISSION.VIEW, OWNER_SUMMARY_PERMISSION.EXPORT, OWNER_SUMMARY_PERMISSION.MANAGE_REPORT])
    await renderPage()

    expect(screen.getByRole('button', { name: 'Report settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export PDF/ })).toBeInTheDocument()
  })

  it('shows the numbers but neither button with the view permission alone', async () => {
    signIn([OWNER_SUMMARY_PERMISSION.VIEW])
    await renderPage()

    expect(screen.queryByRole('button', { name: 'Report settings' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Export PDF/ })).not.toBeInTheDocument()
  })

  it('shows each button for its own permission only', async () => {
    signIn([OWNER_SUMMARY_PERMISSION.VIEW, OWNER_SUMMARY_PERMISSION.EXPORT])
    await renderPage()

    expect(screen.queryByRole('button', { name: 'Report settings' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export PDF/ })).toBeInTheDocument()
  })
})
