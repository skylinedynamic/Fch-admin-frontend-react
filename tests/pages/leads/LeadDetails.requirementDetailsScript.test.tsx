import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

// What each Summernote editor is given to show; the real editor writes it into
// the page as live HTML, so this is what would run in the viewer's browser.
const editorValues = vi.hoisted(() => ({} as Record<string, string | undefined>))
vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: (fieldName: string, fieldValue: string | undefined) => {
    editorValues[fieldName] = fieldValue
    return { editorRef: () => {} }
  },
}))

import LeadDetails from '../../../src/pages/leads/LeadDetails'

/**
 * Defect (R2 BUG-089, R2-PP-LEAD-04, P1; recurring of BUG-004): lead 235's
 * Requirement Details held <img src=x onerror="console.log('qa-xss')">. Opening
 * the lead put it into the rich-text editor as live HTML and the handler ran -
 * on the partner's portal and in the host admin's session. A lead saved before
 * the API cleaned the notes still holds it, so the page cleans it as well.
 */
const LEAD = {
  id: 235, company_name: 'QA-TEST R2R2 WLead XSS', contact_person: 'Lee Lead', email: 'lee@example.test',
  phone_number: '(555) 234-5678', lead_type: 'Borrower', status: 'New', country: 'United States',
  requirement_details: '<p>Needs <b>working capital</b></p><img src=x onerror="console.log(\'qa-xss\')">',
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of Object.keys(editorValues)) delete editorValues[key]
})

describe('LeadDetails - Requirement Details', () => {
  it('gives the editor the notes without anything that can run, keeping the text and formatting', async () => {
    signIn({ permissions: ['view leads', 'update leads'] })
    allowBackgroundCalls()
    api('get', '/common/leads/235', { status: true, data: LEAD })
    renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/235?tab=leadDetails' })

    await waitFor(() => expect(editorValues.requirement_details).toContain('working capital'))

    expect(editorValues.requirement_details).not.toMatch(/onerror/i)
    expect(editorValues.requirement_details).not.toContain('qa-xss')
    expect(editorValues.requirement_details).toContain('<b>working capital</b>')
  })
})
