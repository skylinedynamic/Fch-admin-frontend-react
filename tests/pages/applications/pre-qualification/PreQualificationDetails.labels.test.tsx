import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '../../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), warning: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))

import PreQualificationDetails from '../../../../src/pages/applications/pre-qualification/PreQualificationDetails'

/**
 * Defect (BUG-061, admin side): the client view of the underwriting result
 * showed the agent's internal keys - "borrower.full_name", "NOT_PROVIDED",
 * "DERIVED_FROM_SUPPLIED_DATA" - and badged NOT_PROVIDED as "Borrower Reported".
 * The same readable labels as the borrower portal are shown.
 */
const APP = {
  id: 12, status: 'Pending', gpt_status: 'COMPLETED', first_name: 'Ada', last_name: 'Lovelace',
  ai_result: {
    client: {
      readiness_snapshot: [
        { area: 'borrower.full_name', assessment: 'NOT_PROVIDED', source_status: 'NOT_PROVIDED' },
        { area: 'Credit Profile', assessment: 'FICO 712 reported.', source_status: 'BORROWER_REPORTED' },
      ],
      areas_requiring_attention: ['DERIVED_FROM_SUPPLIED_DATA'],
      strengths: [],
    },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  // A Certified Partner always sees the client view.
  signIn({ is_host: 0, entity_type: 'Partner', partner_type: 'Certified Partner', permissions: ['view pre-qualification', 'view applications'] })
  allowBackgroundCalls()
  api('get', '/common/request-application/pre-qualification/12', { status: true, data: APP })
})

describe('PreQualificationDetails - underwriting result labels', () => {
  it('turns internal keys into words in the client view, and ordinary text stays as written', async () => {
    const user = userEvent.setup()
    renderPage(<PreQualificationDetails />, { path: '/pre-qualification/:id', route: '/pre-qualification/12' })

    await user.click(await screen.findByText('AI Underwriting Result'))

    expect(await screen.findByText('Full Name')).toBeInTheDocument()
    expect(screen.getAllByText('Not Provided').length).toBeGreaterThanOrEqual(2) // assessment + source badge
    expect(screen.getByText('Derived Data', { selector: '.uw-item-text' })).toBeInTheDocument()
    expect(screen.getByText('FICO 712 reported.')).toBeInTheDocument()
    expect(screen.getByText('Credit Profile')).toBeInTheDocument()
    for (const raw of ['borrower.full_name', 'NOT_PROVIDED', 'DERIVED_FROM_SUPPLIED_DATA']) {
      expect(screen.queryByText(raw)).not.toBeInTheDocument()
    }
  })
})
