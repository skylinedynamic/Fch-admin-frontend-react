import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import ResourceForm from '../../../src/pages/resources/ResourceForm'

const mountCreate = (type = 'training_academy') => {
  signIn({ permissions: ['view resources', 'create resources', 'update resources'] })
  allowBackgroundCalls()
  api('get', '/admin/resources/next-id', { next_id: 7 })
  return renderPage(<ResourceForm />, { path: '/resources/create', route: { pathname: '/resources/create', state: { type } } as never })
}

beforeEach(() => vi.clearAllMocks())

// BUG-181: a new resource opened as Published, so a half-filled item went live
// as soon as it was saved.
describe('ResourceForm - new resource', () => {
  it('opens Unpublished and posts status 0', async () => {
    const user = userEvent.setup()
    mountCreate()
    const create = api('post', '/admin/resources', { status: true, data: { id: 7 } }, 201)

    await screen.findByPlaceholderText('Enter resource title')
    expect(screen.getByText('Unpublished')).toBeInTheDocument()
    expect(screen.queryByText('Published')).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Enter resource title'), 'Academy intro')
    await user.type(screen.getByPlaceholderText('https://...'), 'https://academy.example.org')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(create.bodies[0]).toMatchObject({ title: 'Academy intro', status: '0' }))
  })

  // The API refuses a Training Academy item without its link; the message
  // shows under the Resource Link field together with the title's.
  it('shows the server errors for the title and the missing link at once', async () => {
    const user = userEvent.setup()
    mountCreate()
    api('post', '/admin/resources', invalid({
      title: 'The Resource Title is required.',
      link: 'The Resource Link is required.',
    }), 422)

    await user.click(await screen.findByRole('button', { name: /save/i }))

    expect(await screen.findByText('The Resource Link is required.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://...')).toHaveClass('is-invalid')
    expect(screen.getByPlaceholderText('Enter resource title')).toHaveClass('is-invalid')
  })
})
