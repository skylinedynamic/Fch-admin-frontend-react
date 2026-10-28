import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))
vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))

import type { ComponentType } from 'react'
import { toast } from 'react-toastify'
import { server } from '../../mocks/server'
import { cleanup, renderWithProviders, screen, waitFor } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import TierTasksJsx from '../../../src/pages/tiers/components/TierTasks'

const TierTasks = TierTasksJsx as unknown as ComponentType<Record<string, unknown>>

/**
 * BUG-095: deleting one Tier 1 task went to DELETE tier-tasks/{id}, which the
 * API does not have (405); it now goes to the bulk delete. A task clients
 * already use is refused by the API with the tasks it kept (errors.in_use):
 * the confirmation closes and a "cannot be deleted" dialog lists them,
 * instead of a toast. (The same for vendors is in the manage-tier E2E spec.)
 */
const TASK = { id: 9, tier_id: 2, title: 'Open a Uline account', status: 'Active' }
const IN_USE = { status: false, message: 'Clients are already using these tasks, so they cannot be deleted. Nothing was deleted.', errors: { in_use: [{ id: 9, name: 'Open a Uline account' }] } }

beforeEach(() => {
  useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, permissions: ['view tier', 'update tier'] } as never })
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.mocked(toast.error).mockClear()
})

describe('Manage Tier › deleting a task or vendor in use', () => {
  it('one task is deleted through the bulk delete, and a refusal closes the confirmation and shows why', async () => {
    const bodies: unknown[] = []
    server.use(
      http.post('*/admin/credit-builder/tier-tasks/fetch-tasks', () => HttpResponse.json({ status: true, data: [TASK], meta: { total: 1 } })),
      http.post('*/admin/credit-builder/tier-tasks-multiple-delete', async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json(IN_USE, { status: 422 })
      }),
      http.all('*', () => HttpResponse.json({ status: true, data: [] }))
    )
    const user = userEvent.setup()
    renderWithProviders(<TierTasks tierId={2} tierCode="T1" />)

    await screen.findByText('Open a Uline account')
    await user.click(document.querySelector('.btn-soft-danger') as HTMLElement)
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It' }))

    const blocked = await screen.findByTestId('blocked-message')
    expect(blocked).toHaveTextContent('Clients are already using "Open a Uline account", so it cannot be deleted. Nothing was deleted.')
    expect(screen.getByText('Task Cannot Be Deleted')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Yes, Delete It').closest('.modal')).not.toHaveClass('show'))
    expect(toast.error).not.toHaveBeenCalled()
    expect(bodies).toEqual([{ ids: [9] }])
  })
})
