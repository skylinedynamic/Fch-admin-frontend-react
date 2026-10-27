import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '../../test-utils'
import { renderAgentExtraSections } from '../../../src/components/Common/AgentPayloadSections'

/**
 * BUG-061 (retest 27-Oct, admin client view): the Borrower Request Snapshot's
 * FIELD column showed the agent's bare keys (full_name, time_in_business_months).
 * They read as words; the values themselves are shown as the agent wrote them.
 */
describe('renderAgentExtraSections - readable field keys', () => {
  it('shows bare field keys and source codes as words, values as written', () => {
    const payload = {
      borrower_request_snapshot: [
        { field: 'full_name', value: 'Jane Doe', source_status: 'BORROWER_REPORTED' },
        { field: 'time_in_business_months', value: 337, source_status: 'NOT_PROVIDED' },
      ],
    }
    renderWithProviders(<>{renderAgentExtraSections(payload, new Set())}</>)

    expect(screen.getByText('Full Name')).toBeInTheDocument()
    expect(screen.getByText('Time In Business Months')).toBeInTheDocument()
    expect(screen.getByText('Borrower Reported')).toBeInTheDocument()
    expect(screen.getByText('Not Provided')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    for (const raw of ['full_name', 'time_in_business_months', 'BORROWER_REPORTED', 'NOT_PROVIDED']) {
      expect(screen.queryByText(raw)).not.toBeInTheDocument()
    }
  })
})
