import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

const suspendedPartner = {
  id: 86,
  full_name: 'QA Owner',
  company_name: 'QA-TEST Admin Run2 Co',
  email: 'qa@example.test',
  partner_type: 'White Label Partner',
  status: 'Suspended',
  assigned_user_id: '',
  country: 'United States',
  is_host: 0,
  is_free_trail: 1,
}

const statusDropdown = () =>
  screen.getByText('Status', { selector: 'label' }).parentElement!.querySelector('.p-dropdown') as HTMLElement

beforeEach(() => vi.clearAllMocks())

/**
 * Defect: BUG-171 - after a partner was saved as Suspended, picking Active /
 * Inactive / OnBoarding on Status & Agent left the field on Suspended, so the
 * partner could not be reactivated.
 */
describe('Partner profile › Status & Agent', () => {
  it.each(['Active', 'Inactive', 'OnBoarding'])('a suspended partner can be set to %s', async (option) => {
    signIn({ permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/86', { status: true, message: 'ok', data: suspendedPartner })
    // The tab loads its status and agent from their own endpoint.
    api('get', '/admin/partners/86/status-agent', {
      status: true, message: 'ok', data: { id: 86, status: 'Suspended', assign_to: null, agent: null },
    })
    const user = userEvent.setup()
    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/86?tab=statusAgent' })

    await waitFor(() => expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent('Suspended'))

    await user.click(statusDropdown())
    const item = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown-item')).find((o) => o.textContent === option)
      expect(found).toBeTruthy()
      return found as HTMLElement
    })
    await user.click(item)

    await waitFor(() => expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent(option))
  })

  // BUG-171 expects the chosen status to save on Update, not only to show.
  it.each(['Active', 'Inactive', 'OnBoarding'])('Update saves %s for a suspended partner', async (option) => {
    signIn({ permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/86', { status: true, message: 'ok', data: suspendedPartner })
    api('get', '/admin/partners/86/status-agent', {
      status: true, message: 'ok', data: { id: 86, status: 'Suspended', assign_to: 7, agent: { id: 7, email: 'agent@example.test', phone_number: null } },
    })
    const saved = api('put', '/admin/partners/86/status-agent', {
      status: true, message: 'ok', data: { id: 86, status: option, assign_to: 7, agent: { id: 7, email: 'agent@example.test', phone_number: null } },
    })
    const user = userEvent.setup()
    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/86?tab=statusAgent' })

    await waitFor(() => expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent('Suspended'), { timeout: 5000 })
    await user.click(statusDropdown())
    const item = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown-item')).find((o) => o.textContent === option)
      expect(found).toBeTruthy()
      return found as HTMLElement
    })
    await user.click(item)
    await user.click(screen.getAllByRole('button', { name: /update/i })[0])

    await waitFor(() => expect(saved.calls).toBe(1))
    expect(saved.bodies[0]).toMatchObject({ status: option })
    await waitFor(() => expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent(option))
  })
})

/**
 * Defect (BUG-171, seen on a slow run): the user picked Active and clicked
 * Update, but "Suspended" was saved - a partner load that came back after the
 * pick put the old status (and an empty agent) back. A late load never undoes
 * what the user picked; the save sends the user's choice.
 */
describe('Partner profile › Status & Agent - a late load does not undo the pick', () => {
  const pick = async (user: ReturnType<typeof userEvent.setup>, option: string) => {
    await user.click(statusDropdown())
    const item = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown-item')).find((o) => o.textContent === option)
      expect(found).toBeTruthy()
      return found as HTMLElement
    })
    await user.click(item)
    await waitFor(() => expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent(option))
  }

  const saveHandler = () =>
    api('put', '/admin/partners/86/status-agent', {
      status: true, message: 'ok', data: { id: 86, status: 'Active', assign_to: 7, agent: { id: 7, email: 'agent@example.test', phone_number: null } },
    })

  it('keeps the picked status when the status-agent load arrives after the pick', async () => {
    signIn({ permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/86', { status: true, message: 'ok', data: { ...suspendedPartner, assigned_user_id: 7 } })
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    server.use(http.get('*/admin/partners/86/status-agent', async () => {
      await gate
      return HttpResponse.json({ status: true, message: 'ok', data: { id: 86, status: 'Suspended', assign_to: 7, agent: { id: 7, email: 'agent@example.test', phone_number: null } } })
    }))
    const saved = saveHandler()
    const user = userEvent.setup()
    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/86?tab=statusAgent' })

    await waitFor(() => expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent('Suspended'), { timeout: 5000 })
    await pick(user, 'Active')
    release()
    await new Promise((r) => setTimeout(r, 50))

    expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent('Active')
    await user.click(screen.getAllByRole('button', { name: /update/i })[0])
    await waitFor(() => expect(saved.calls).toBe(1))
    expect(saved.bodies[0]).toMatchObject({ status: 'Active', assign_to: 7 })
  })

  it('keeps the picked status when a second partner load arrives after the pick', async () => {
    signIn({ permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    let detailsCalls = 0
    server.use(http.get('*/admin/partners-details/86', async () => {
      detailsCalls += 1
      if (detailsCalls > 1) await gate
      return HttpResponse.json({ status: true, message: 'ok', data: { ...suspendedPartner, assigned_user_id: 7 } })
    }))
    api('get', '/admin/partners/86/status-agent', {
      status: true, message: 'ok', data: { id: 86, status: 'Suspended', assign_to: 7, agent: { id: 7, email: 'agent@example.test', phone_number: null } },
    })
    const saved = saveHandler()
    const user = userEvent.setup()
    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/86?tab=statusAgent' })

    await waitFor(() => expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent('Suspended'), { timeout: 5000 })
    await pick(user, 'Active')
    // The second (StrictMode) load comes back now, with the old status.
    release()
    await new Promise((r) => setTimeout(r, 50))

    expect(statusDropdown().querySelector('.p-dropdown-label')).toHaveTextContent('Active')
    await user.click(screen.getAllByRole('button', { name: /update/i })[0])
    await waitFor(() => expect(saved.calls).toBe(1))
    expect(saved.bodies[0]).toMatchObject({ status: 'Active', assign_to: 7 })
  })
})
