import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { activityLogKeys, useTaskAssignees } from '../../../src/modules/activity-log/queries'
import { useTaskAssignmentSetup } from '../../../src/components/Common/Modals/activity-create/useTaskAssignmentSetup'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
)

const USERS = [
  { id: 12, name: 'Avery Staff', email: 'avery@example.test', phone_number: '(222) 111-2222' },
  { id: 14, name: 'Blake Ops' },
]

function stubUsers() {
  const requests: Record<string, unknown>[] = []
  server.use(
    http.post('*/common/get-all-users', async ({ request }) => {
      requests.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ status: true, data: USERS })
    })
  )
  return requests
}

describe('activityLogKeys', () => {
  it("keys each team's staff list apart, with the caller's own team as 'own'", () => {
    expect(activityLogKeys.taskAssignees(2)).toEqual(['activity-log', 'task-assignees', 2])
    expect(activityLogKeys.taskAssignees(null)).toEqual(['activity-log', 'task-assignees', 'own'])
  })
})

describe('useTaskAssignees', () => {
  it("asks the existing get-all-users API for that partner's staff and maps them", async () => {
    const requests = stubUsers()

    const { result } = renderHook(() => useTaskAssignees(2, true), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests).toEqual([{ partner_id: 2 }])
    expect(result.current.data).toEqual([
      { id: 12, full_name: 'Avery Staff', email: 'avery@example.test', phone_number: '(222) 111-2222' },
      { id: 14, full_name: 'Blake Ops', email: null, phone_number: null },
    ])
  })

  it("sends no partner for the caller's own team", async () => {
    const requests = stubUsers()

    const { result } = renderHook(() => useTaskAssignees(null, true), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requests).toEqual([{}])
  })

  it('loads nothing until enabled', async () => {
    const requests = stubUsers()

    const { result } = renderHook(() => useTaskAssignees(2, false), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(requests).toEqual([])
  })

  it('gives an empty list when the API says no', async () => {
    server.use(http.post('*/common/get-all-users', () => HttpResponse.json({ status: false, data: null })))

    const { result } = renderHook(() => useTaskAssignees(2, true), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

describe('useTaskAssignmentSetup', () => {
  it("lists the owning partner's staff and fills the owner from it", async () => {
    const requests = stubUsers()

    const { result } = renderHook(
      () => useTaskAssignmentSetup({ entityType: 'Lead', partnerId: '2', ownerRef: { id: 12 }, enabled: true }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.staff).toHaveLength(2))
    expect(requests).toEqual([{ partner_id: 2 }])
    expect(result.current.owner).toEqual({
      label: 'Lead Owner',
      status: 'assigned',
      name: 'Avery Staff',
      email: 'avery@example.test',
      phone: '(222) 111-2222',
    })
  })

  it("asks for no partner on a Partner's page (the host's own staff)", async () => {
    const requests = stubUsers()

    renderHook(() => useTaskAssignmentSetup({ entityType: 'Partner', partnerId: 5, ownerRef: null, enabled: true }), { wrapper })

    await waitFor(() => expect(requests).toEqual([{}]))
  })

  it('uses the name the page gave when the person is not in the list', async () => {
    stubUsers()

    const { result } = renderHook(
      () => useTaskAssignmentSetup({ entityType: 'Client', partnerId: 2, ownerRef: { id: 99, name: 'Former Staff' }, enabled: true }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingStaff).toBe(false))
    expect(result.current.owner).toMatchObject({ label: 'Client Assigned To', status: 'assigned', name: 'Former Staff' })
  })

  it('shows the empty state when nobody holds the role, or an id-only owner is not found', async () => {
    stubUsers()

    const none = renderHook(
      () => useTaskAssignmentSetup({ entityType: 'Partner', partnerId: null, ownerRef: null, enabled: true }),
      { wrapper }
    )
    expect(none.result.current.owner).toEqual({ label: 'Partner Agent', status: 'unassigned' })

    const missing = renderHook(
      () => useTaskAssignmentSetup({ entityType: 'Funding Request', partnerId: 2, ownerRef: { id: 99 }, enabled: true }),
      { wrapper }
    )
    // While the list loads, an id-only owner is not yet known either way
    expect(missing.result.current.owner).toBeNull()
    await waitFor(() => expect(missing.result.current.owner).toEqual({ label: 'Borrower Assign to', status: 'unassigned' }))
  })

  it('has no owner card on records without such a role', () => {
    const { result } = renderHook(
      () => useTaskAssignmentSetup({ entityType: 'Employee', partnerId: 2, ownerRef: { id: 12 }, enabled: false }),
      { wrapper }
    )

    expect(result.current.owner).toBeNull()
  })
})
