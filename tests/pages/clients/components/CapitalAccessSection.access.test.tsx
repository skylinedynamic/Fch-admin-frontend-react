import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen } from '../../../test-utils'
import { server } from '../../../mocks/server'
import CapitalAccessSection from '../../../../src/pages/clients/components/CapitalAccessSection'

/**
 * BUG-031: the client's estimated access is the maximum of every play they
 * qualify for, leaving out plays already completed - what is left to access.
 * The card says so, as the client portal does.
 */
afterEach(() => server.resetHandlers())

describe('Client › Capital Access - estimated access', () => {
  it('says the amount is what remains, from plays not yet completed', async () => {
    server.use(
      http.get('*/common/borrowers/129/capital-access-overview', () =>
        HttpResponse.json({
          status: true,
          data: {
            readiness_score: 78, readiness_status: 'Foundation Ready', readiness_status_color: null, factors: [],
            estimated_total_access: '$1,365,000.00', estimated_total_access_compact: '$1.37M', exposure_breakdown: [], current_play: null, reason_code: null, unlock_at: null,
          },
        })
      )
    )
    renderWithProviders(<CapitalAccessSection clientId={129} />)

    expect(await screen.findByRole('heading', { name: 'Estimated Remaining Access' })).toBeInTheDocument()
    // Short, the full amount on hover.
    expect(screen.getByText('$1.37M')).toHaveAttribute('title', '$1,365,000.00')
    expect(screen.getByText('From the plays the client qualifies for and has not completed yet')).toBeInTheDocument()
  })
})
