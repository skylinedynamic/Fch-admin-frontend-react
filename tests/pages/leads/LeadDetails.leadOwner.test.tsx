import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

// The rich-text editor is a jQuery plugin jsdom cannot run; the owner and
// type fields don't depend on it.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../mocks/server'
import { dropdownLabels } from '../../mocks/partnerOptions'
import { cleanup, renderWithProviders, screen, waitFor } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import LeadDetails from '../../../src/pages/leads/LeadDetails'

/**
 * A lead's Lead Owner (salesperson_id) is one of its own partner's team. The
 * host opening another partner's lead sees that partner's team - and so its
 * current owner - and no Lead Type, since such a lead is always a Borrower.
 */
const HOST_TEAM = [{ id: 11, name: 'Hal Host' }]
const WLP_TEAM = [{ id: 21, name: 'Wil Label' }, { id: 22, name: 'Sal WLP' }]

const leadOf = (partnerId: number, overrides: Record<string, unknown> = {}) => ({
  id: 7,
  lead_type: 'Borrower',
  status: 'New Lead',
  probability: 'High',
  contact_person: 'Lee Lead',
  company_name: 'Lead Co',
  email: 'lead@example.test',
  phone_number: '(555) 123-4567',
  country: 'United States',
  lead_source: 'Website',
  salesperson_id: 22,
  salesperson_name: 'Sal WLP',
  partner: { id: partnerId, full_name: 'Owner', company_name: partnerId === 1 ? 'Host Co' : 'WLP Co' },
  convert_on_behalf_of: null,
  ...overrides,
})

const signInAs = (isHost: boolean) =>
  useAuthStore.setState({
    token: 'tok',
    user: { id: isHost ? 11 : 21, name: 'Signed In', is_host: isHost ? 1 : 0, partner_id: isHost ? 1 : 2, entity_type: 'Partner', permissions: ['view leads', 'update leads'] },
  })

function serve(lead: unknown, ownTeam = HOST_TEAM) {
  const teamBodies: Record<string, unknown>[] = []
  server.use(http.all('*', () => HttpResponse.json({ status: true, data: [], meta: { total: 0 } })))
  server.use(
    http.get('*/common/leads/:id', () => HttpResponse.json({ status: true, data: lead })),
    http.post('*/common/get-all-users', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      teamBodies.push(body)
      return HttpResponse.json({ status: true, data: body.partner_id === 2 ? WLP_TEAM : ownTeam })
    })
  )
  return teamBodies
}

const renderLead = () =>
  renderWithProviders(
    <Routes>
      <Route path="/leads/:id" element={<LeadDetails />} />
    </Routes>,
    { route: '/leads/7?tab=leadDetails' }
  )

/** The dropdown under a form label. */
const fieldDropdown = (label: string) =>
  waitFor(() => {
    const el = Array.from(document.querySelectorAll('label.form-label')).find((l) => l.textContent?.trim().startsWith(label))
    if (!el) throw new Error(`no "${label}" field`)
    return el.closest('.mb-3')?.querySelector('.p-dropdown') as HTMLElement
  })

describe('LeadDetails › lead owner and type', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('shows the host another partner\'s lead owner, picked from that partner\'s team', async () => {
    signInAs(true)
    const teamBodies = serve(leadOf(2))
    const user = userEvent.setup()
    renderLead()

    const owner = await fieldDropdown('Lead Owner')
    await waitFor(() => expect(owner).toHaveTextContent('Sal WLP'))
    // Active staff only, keeping the saved owner even if inactive.
    expect(teamBodies).toContainEqual({ partner_id: 2, active_only: true, keep_ids: [22] })
    expect(await dropdownLabels(user, owner)).toEqual(['Wil Label', 'Sal WLP'])
  })

  it('shows the host another partner\'s lead type read-only - it is always a Borrower lead', async () => {
    signInAs(true)
    serve(leadOf(2))
    renderLead()

    const type = await fieldDropdown('Lead Type')
    await waitFor(() => expect(type).toHaveTextContent('Borrower'))
    expect(type).toHaveClass('p-disabled')
  })

  it('shows the host its own lead\'s type, and its own team as owners', async () => {
    signInAs(true)
    const teamBodies = serve(leadOf(1, { lead_type: 'Partner', salesperson_id: 11, salesperson_name: 'Hal Host' }))
    renderLead()

    const owner = await fieldDropdown('Lead Owner')
    await waitFor(() => expect(owner).toHaveTextContent('Hal Host'))
    expect(await fieldDropdown('Lead Type')).toHaveTextContent('Partner')
    expect(teamBodies.every((body) => !('partner_id' in body))).toBe(true)
  })

  it('shows a converted lead\'s type read-only', async () => {
    signInAs(true)
    serve(leadOf(1, { lead_type: 'Partner', convert_to: 'Partner', salesperson_id: 11, salesperson_name: 'Hal Host' }))
    renderLead()

    const type = await fieldDropdown('Lead Type')
    await waitFor(() => expect(type).toHaveTextContent('Partner'))
    expect(type).toHaveClass('p-disabled')
  })

  it('keeps the type of a lead not yet converted editable', async () => {
    signInAs(true)
    serve(leadOf(1, { lead_type: 'Partner', convert_to: null, salesperson_id: 11, salesperson_name: 'Hal Host' }))
    renderLead()

    const type = await fieldDropdown('Lead Type')
    await waitFor(() => expect(type).toHaveTextContent('Partner'))
    expect(type).not.toHaveClass('p-disabled')
  })

  it('still shows an owner the team no longer includes', async () => {
    signInAs(true)
    serve(leadOf(2, { salesperson_id: 99, salesperson_name: 'Old Owner' }))
    renderLead()

    const owner = await fieldDropdown('Lead Owner')
    await waitFor(() => expect(owner).toHaveTextContent('Old Owner'))
  })

  it('shows a white-label partner its own team and no Lead Type', async () => {
    signInAs(false)
    const teamBodies = serve(leadOf(2), WLP_TEAM)
    renderLead()

    const owner = await fieldDropdown('Lead Owner')
    await waitFor(() => expect(owner).toHaveTextContent('Sal WLP'))
    expect(teamBodies.every((body) => !('partner_id' in body))).toBe(true)
    expect(screen.queryByText('Lead Type')).not.toBeInTheDocument()
  })
})

describe('LeadDetails - activity log Want to Assign', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    delete (window as any)._activityEntityContext
  })

  it("hands New Event the lead's partner and its Lead Owner", async () => {
    signInAs(true)
    serve(leadOf(2))
    renderLead()

    const newEvent = await screen.findByRole('button', { name: /new event/i })
    await waitFor(() => expect((window as any)._activityEntityContext?.partnerId).toBe(2))
    // The modal is mounted by GlobalModals, not here: keep Bootstrap from opening it.
    newEvent.removeAttribute('data-bs-toggle')
    newEvent.click()

    expect((window as any)._activityEntityContext).toMatchObject({
      entityType: 'Lead',
      partnerId: 2,
      taskOwner: { id: 22, name: 'Sal WLP' },
    })
  })

  it('hands no owner when the lead has none', async () => {
    signInAs(true)
    serve(leadOf(2, { salesperson_id: null, salesperson_name: null }))
    renderLead()

    await waitFor(() => expect((window as any)._activityEntityContext?.partnerId).toBe(2))
    expect((window as any)._activityEntityContext.taskOwner).toBeNull()
  })
})
