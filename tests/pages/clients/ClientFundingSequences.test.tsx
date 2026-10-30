import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import ClientFundingSequences from '../../../src/pages/clients/components/ClientFundingSequences'

afterEach(() => server.resetHandlers())

const withOption = (readiness_factors: unknown[]) =>
  server.use(
    http.get('*/common/funding-sequencings/client-funding-options/7', () =>
      HttpResponse.json({
        status: true,
        data: {
          groups: [{
            id: 1,
            name: 'Business Credit',
            sequencings: [{ id: 11, name: '0% Intro Business Cards', icon: 'card', icon_color: 'blue', amount_range: '$5,000 - $250,000', engine_status: 'Active', readiness_factors }],
          }],
          types: [],
        },
      })
    )
  )

/**
 * Defect: a client's failed Banking Activity read "Banking Activity: Missing /
 * Required: Uploaded" - neither why nor what to do. The API's reason and
 * requirement are shown instead.
 */
describe('ClientFundingSequences — Banking Activity reason', () => {
  it('says why Banking Activity failed and what is required', async () => {
    withOption([{
      label: 'Banking Activity',
      status: 'Failed',
      group: 'banking',
      borrower_value: 'Missing',
      required_value: 'Uploaded',
      reason_code: 'not_uploaded',
      reason: 'No Business Bank Statements uploaded yet.',
      requirement: 'Upload your Business Bank Statements on the Documents page.',
    }])
    renderWithProviders(<ClientFundingSequences clientId="7" />)

    await userEvent.hover(await screen.findByText('0% Intro Business Cards'))

    expect(await screen.findByText('Banking Activity: No Business Bank Statements uploaded yet.')).toBeInTheDocument()
    expect(screen.getByText('Required: Upload your Business Bank Statements on the Documents page.')).toBeInTheDocument()
    expect(screen.queryByText('Required: Uploaded')).not.toBeInTheDocument()
  })

  it('keeps the figures for a check with no reason', async () => {
    withOption([{ label: 'Minimum Monthly Deposits', status: 'Failed', borrower_value: 5000, required_value: 60000 }])
    renderWithProviders(<ClientFundingSequences clientId="7" />)

    await userEvent.hover(await screen.findByText('0% Intro Business Cards'))

    expect(await screen.findByText('Minimum Monthly Deposits: $5,000')).toBeInTheDocument()
    expect(screen.getByText('Required: $60,000')).toBeInTheDocument()
  })
})
