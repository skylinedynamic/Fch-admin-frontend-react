import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import CommentPanel from '../../../../src/components/Common/CommentPanel/CommentPanel'

afterEach(() => server.resetHandlers())

beforeEach(() => {
    useAuthStore.setState({ user: { id: 7, name: 'Jason Rodriguez' } } as never)
})

describe('CommentPanel (admin)', () => {
    it('shows the empty state when there are no comments', async () => {
        server.use(
            http.get('*/common/comments', () => HttpResponse.json({ status: true, message: '', data: [] }))
        )

        renderWithProviders(<CommentPanel entityType="funding_request" entityId={42} />)

        expect(await screen.findByText(/no comments yet/i)).toBeInTheDocument()
    })

    it('shows a Delete control only on the current users own comment', async () => {
        server.use(
            http.get('*/common/comments', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: [
                        {
                            id: 1,
                            body: 'My own comment',
                            visibility: 'internal',
                            user: { id: 7, name: 'Jason Rodriguez' },
                            created_at: '2026-09-20T10:00:00Z',
                            updated_at: '2026-09-20T10:00:00Z',
                        },
                        {
                            id: 2,
                            body: "Someone else's comment",
                            visibility: 'internal',
                            user: { id: 99, name: 'Other Partner User' },
                            created_at: '2026-09-20T11:00:00Z',
                            updated_at: '2026-09-20T11:00:00Z',
                        },
                    ],
                })
            )
        )

        renderWithProviders(<CommentPanel entityType="funding_request" entityId={42} />)

        await screen.findByText('My own comment')
        expect(screen.getByText("Someone else's comment")).toBeInTheDocument()
        // Only one Delete link — on the current user's own comment, not the other's.
        expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(1)
    })

    it('deletes a comment and removes it from the list', async () => {
        let deleteCalled = false

        server.use(
            http.get('*/common/comments', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: [
                        {
                            id: 1,
                            body: 'Delete me',
                            visibility: 'internal',
                            user: { id: 7, name: 'Jason Rodriguez' },
                            created_at: '2026-09-20T10:00:00Z',
                            updated_at: '2026-09-20T10:00:00Z',
                        },
                    ],
                })
            ),
            http.delete('*/common/comments/1', () => {
                deleteCalled = true
                return HttpResponse.json({ status: true, message: '', data: [] })
            })
        )

        renderWithProviders(<CommentPanel entityType="funding_request" entityId={42} />)
        await screen.findByText('Delete me')

        await userEvent.click(screen.getByRole('button', { name: /delete/i }))

        expect(await screen.findByText(/no comments yet/i)).toBeInTheDocument()
        expect(deleteCalled).toBe(true)
    })

    it('posts a new comment scoped to the given entity', async () => {
        server.use(
            http.get('*/common/comments', () => HttpResponse.json({ status: true, message: '', data: [] })),
            http.post('*/common/comments', async ({ request }) => {
                const body = (await request.json()) as { entity_type: string; entity_id: number; body: string }
                expect(body).toEqual({ entity_type: 'funding_request', entity_id: 42, body: 'Please review this' })
                return HttpResponse.json({ status: true, data: { id: 3 } }, { status: 201 })
            })
        )

        renderWithProviders(<CommentPanel entityType="funding_request" entityId={42} />)
        await screen.findByText(/no comments yet/i)

        await userEvent.type(screen.getByPlaceholderText(/add a comment/i), 'Please review this')
        await userEvent.click(screen.getByRole('button', { name: /post/i }))
    })
})
