import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, useParams } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from './test-utils'

/**
 * F169: the admin details page opens a funding application for editing by its
 * own id (/intake-review/funding-application/{id}/edit) - one converted from a
 * loan application has no funding request to open it by. This pins the route;
 * the guards, layout, modals and pages are stand-ins, so only the routing is under test.
 */
vi.mock('../src/lib/auth', async (original) => {
  const PassThrough = () => <Outlet />
  return {
    ...(await original<typeof import('../src/lib/auth')>()),
    ProtectedRoute: PassThrough,
    GuestRoute: PassThrough,
    PermissionRoute: PassThrough,
    HostRoute: PassThrough,
    PartnerHostRoute: PassThrough,
    NonHostPartnerRoute: PassThrough,
    checkSession: vi.fn(),
    refreshSubscription: vi.fn(),
  }
})
vi.mock('../src/components/Layout/Layout.jsx', () => ({ default: () => <Outlet /> }))
vi.mock('../src/components/Common/ConfigurationGuardModal', () => ({ default: () => null }))
vi.mock('../src/components/Common/ReminderModal', () => ({ default: () => null }))
// A rich-text editor some pages load; it needs a real canvas, which jsdom has not.
vi.mock('summernote/dist/summernote-lite.js', () => ({}))
vi.mock('../src/pages/applications/fundapplication/FundApplication.tsx', () => ({
  default: function FundApplication() {
    const { id, applicationId } = useParams()
    return <p>Edit wizard: application {applicationId ?? '-'}, request {id ?? '-'}</p>
  },
}))
vi.mock('../src/pages/applications/funding/FundingApplicationDetails', () => ({
  default: () => <p>Application details</p>,
}))

import App from '../src/App'

const openAt = (path: string) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('Intake Review routes', () => {
  it('opens the edit wizard on the application by its own id', async () => {
    openAt('/intake-review/funding-application/56/edit')

    expect(await screen.findByText('Edit wizard: application 56, request -')).toBeInTheDocument()
  })

  it('still opens the details page, and the wizard by funding request', async () => {
    const details = openAt('/intake-review/funding-application/56')
    expect(await screen.findByText('Application details')).toBeInTheDocument()
    details.unmount()

    openAt('/fund-application/17')
    expect(await screen.findByText('Edit wizard: application -, request 17')).toBeInTheDocument()
  })
})
