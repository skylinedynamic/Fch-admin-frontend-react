import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { toast } from 'react-toastify'
import ManageResources from '../../../src/pages/resources/ManageResources'

const GROUPED = {
  legal_registration: [
    { id: 101, title: 'LLC Formation Guide', subtitle: 'Step by step', icon: 'ri-file-line', status: true, link: 'https://example.test/llc' },
    { id: 102, title: 'EIN Checklist', subtitle: null, icon: null, status: false, file_url: 'https://example.test/ein.pdf' },
  ],
  business_services: [],
  download_assets: [{ id: 103, title: 'Brand Kit', subtitle: 'Logos', icon: null, status: true }],
  education_help: [],
  training_academy: [],
}

const mount = () => {
  signIn({ permissions: ['view resources'] })
  allowBackgroundCalls()
  api('get', '/common/resources', { status: true, data: GROUPED })
  return renderPage(<ManageResources />, { path: '/manage-resources' })
}

const row = (title: string) => screen.getByText(title).closest('tr') as HTMLElement

beforeEach(() => vi.clearAllMocks())

describe('ManageResources', () => {
  it('lists the first category with status and link type', async () => {
    mount()

    expect(await screen.findByText('LLC Formation Guide')).toBeInTheDocument()
    expect(within(row('LLC Formation Guide')).getByText('Active')).toBeInTheDocument()
    expect(within(row('LLC Formation Guide')).getByRole('link', { name: /visit link/i })).toHaveAttribute('href', 'https://example.test/llc')
    expect(within(row('EIN Checklist')).getByText('Inactive')).toBeInTheDocument()
    expect(within(row('EIN Checklist')).getByRole('link', { name: /view file/i })).toHaveAttribute('href', 'https://example.test/ein.pdf')
  })

  it('opens external links in a new tab without leaking the opener', async () => {
    mount()

    await screen.findByText('LLC Formation Guide')
    const link = within(row('LLC Formation Guide')).getByRole('link', { name: /visit link/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('switches category with the tabs', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByText('LLC Formation Guide')

    await user.click(screen.getByRole('button', { name: 'Download Assets' }))

    expect(await screen.findByText('Brand Kit')).toBeInTheDocument()
    expect(screen.queryByText('LLC Formation Guide')).not.toBeInTheDocument()
    expect(within(row('Brand Kit')).getByText('N/A')).toBeInTheDocument()
  })

  it('shows the empty message for a category with no resources', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByText('LLC Formation Guide')

    await user.click(screen.getByRole('button', { name: 'Training Academy' }))

    expect(await screen.findByText('No resources found for this category.')).toBeInTheDocument()
  })

  it('Add Resource opens the create form', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByText('LLC Formation Guide')

    await user.click(screen.getByRole('button', { name: /add resource/i }))

    expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/resources/create')
  })

  it('Edit opens the edit form for that resource', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByText('LLC Formation Guide')

    await user.click(within(row('LLC Formation Guide')).getByRole('button', { name: /edit/i, hidden: true }))

    expect(await screen.findByTestId('landing')).toHaveTextContent('navigated:/resources/edit/101')
  })

  it('deletes a resource after confirmation', async () => {
    const user = userEvent.setup()
    mount()
    const remove = api('delete', '/admin/resources/101', { status: true })
    await screen.findByText('LLC Formation Guide')

    await user.click(within(row('LLC Formation Guide')).getByRole('button', { name: /delete/i, hidden: true }))
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It' }))

    await waitFor(() => expect(remove.calls).toBe(1))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Resource deleted successfully'))
  })

  it('keeps the resource when the confirmation is closed', async () => {
    const user = userEvent.setup()
    mount()
    const remove = api('delete', '/admin/resources/101', { status: true })
    await screen.findByText('LLC Formation Guide')

    await user.click(within(row('LLC Formation Guide')).getByRole('button', { name: /delete/i, hidden: true }))
    await user.click(await screen.findByRole('button', { name: 'Close' }))

    expect(remove.calls).toBe(0)
  })

  it('reports a failed delete', async () => {
    const user = userEvent.setup()
    mount()
    api('delete', '/admin/resources/101', { message: 'boom' }, 500)
    await screen.findByText('LLC Formation Guide')

    await user.click(within(row('LLC Formation Guide')).getByRole('button', { name: /delete/i, hidden: true }))
    await user.click(await screen.findByRole('button', { name: 'Yes, Delete It' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete resource'))
  })
})
