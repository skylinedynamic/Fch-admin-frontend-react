import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import AssistantConfigForm from '../../../src/pages/settings/components/AssistantConfigForm'

beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
    server.resetHandlers()
    vi.restoreAllMocks()
})

const inForce = { version: '1.3.2', sha256: 'abcdef1234567890abcdef', source: 'file' as const }

const config = (assistant_type: string, over: Record<string, unknown> = {}) => ({
    assistant_type,
    prompt: inForce,
    model: null,
    reasoning_effort: null,
    max_output_tokens: null,
    vector_store_id: null,
    knowledge_manifest_version: null,
    is_enabled: false,
    is_ready: false,
    ...over,
})

const configs = (wlp: Record<string, unknown> = {}, borrower: Record<string, unknown> = {}) =>
    http.get('*/common/assistant-config', () =>
        HttpResponse.json({ status: true, message: '', data: [config('wlp_support', wlp), config('borrower_support', borrower)] })
    )

const prompts = (versions: unknown[] = [], forceOverride: Record<string, unknown> = {}) =>
    http.get('*/common/assistant-config/:type/prompts', () =>
        HttpResponse.json({ status: true, message: '', data: { in_force: { ...inForce, ...forceOverride }, versions } })
    )

const routes = (data: unknown[] = []) =>
    http.get('*/common/assistant-config/:type/routes', () => HttpResponse.json({ status: true, message: '', data }))

const longPrompt = 'FCH WLP SUPPORT ASSISTANT v1.3.3 ' + 'approved instruction text '.repeat(20)

const PASTE_PLACEHOLDER = /paste the complete approved instructions/i

describe('AssistantConfigForm', () => {
    it('loads the live prompt identity and defaults to the WLP tab', async () => {
        server.use(configs(), prompts(), routes())

        renderWithProviders(<AssistantConfigForm />)

        expect(await screen.findByText('application default')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'WLP Assistant' })).toHaveClass('active')
        expect(screen.getByText(/no released versions yet/i)).toBeInTheDocument()
    })

    it("switching tabs shows that assistant's own state", async () => {
        server.use(configs({}, { is_ready: true, vector_store_id: 'vs_borrower' }), prompts(), routes())

        renderWithProviders(<AssistantConfigForm />)
        await screen.findByText('application default')

        await userEvent.click(screen.getByRole('button', { name: 'Borrower Assistant' }))

        expect(await screen.findByText(/vs_borrower/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Borrower Assistant' })).toHaveClass('active')
    })

    it('refuses to save without a version and a complete prompt, without calling the API', async () => {
        let called = false

        server.use(
            configs(),
            prompts(),
            routes(),
            http.post('*/common/assistant-config/:type/prompts', () => {
                called = true
                return HttpResponse.json({ status: true, message: '', data: { id: 1 } })
            })
        )

        renderWithProviders(<AssistantConfigForm />)
        await screen.findByText('application default')

        await userEvent.click(screen.getByRole('button', { name: /save & activate/i }))

        expect(called).toBe(false)
        expect(window.confirm).not.toHaveBeenCalled()
    })

    it('saving without activating creates the version and does not activate it', async () => {
        let created: any = null
        let activated = false

        server.use(
            configs(),
            prompts(),
            routes(),
            http.post('*/common/assistant-config/:type/prompts', async ({ request }) => {
                created = await request.json()
                return HttpResponse.json({ status: true, message: '', data: { id: 7, version: '1.3.3' } })
            }),
            http.post('*/common/assistant-config/:type/prompts/:id/activate', () => {
                activated = true
                return HttpResponse.json({ status: true, message: '', data: {} })
            })
        )

        renderWithProviders(<AssistantConfigForm />)
        await screen.findByText('application default')

        await userEvent.click(screen.getByPlaceholderText(PASTE_PLACEHOLDER))
        await userEvent.paste(longPrompt)
        // The version label is suggested from the prompt's own header.
        expect(screen.getByLabelText('Version')).toHaveValue('1.3.3')

        await userEvent.click(screen.getByRole('button', { name: /don.t activate/i }))

        await waitFor(() => expect(created).not.toBeNull())
        expect(created.version).toBe('1.3.3')
        expect(created.content).toContain('approved instruction text')
        expect(activated).toBe(false)
    })

    it('save & activate creates the version and then activates it', async () => {
        let activatedId: string | null = null

        server.use(
            configs(),
            prompts(),
            routes(),
            http.post('*/common/assistant-config/:type/prompts', () =>
                HttpResponse.json({ status: true, message: '', data: { id: 9, version: '1.3.3' } })
            ),
            http.post('*/common/assistant-config/:type/prompts/:id/activate', ({ params }) => {
                activatedId = params.id as string
                return HttpResponse.json({ status: true, message: '', data: {} })
            })
        )

        renderWithProviders(<AssistantConfigForm />)
        await screen.findByText('application default')

        await userEvent.click(screen.getByPlaceholderText(PASTE_PLACEHOLDER))
        await userEvent.paste(longPrompt)
        await userEvent.click(screen.getByRole('button', { name: /save & activate/i }))

        await waitFor(() => expect(activatedId).toBe('9'))
        expect(window.confirm).toHaveBeenCalled()
    })

    it('lists released versions and rolls back to an older one', async () => {
        let activatedId: string | null = null

        server.use(
            configs(),
            prompts(
                [
                    { id: 2, assistant_type: 'wlp_support', version: '1.3.3', content_sha256: 'b', notes: 'new', is_active: true, activated_at: null, created_at: '2026-09-30T00:00:00Z' },
                    { id: 1, assistant_type: 'wlp_support', version: '1.3.2', content_sha256: 'a', notes: null, is_active: false, activated_at: null, created_at: '2026-09-29T00:00:00Z' },
                ],
                { version: '1.3.3', source: 'database' }
            ),
            routes(),
            http.post('*/common/assistant-config/:type/prompts/:id/activate', ({ params }) => {
                activatedId = params.id as string
                return HttpResponse.json({ status: true, message: '', data: {} })
            })
        )

        renderWithProviders(<AssistantConfigForm />)

        expect(await screen.findByText('Live')).toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: /roll back to this/i }))

        await waitFor(() => expect(activatedId).toBe('1'))
    })

    it('adds a navigation destination through the routes endpoint', async () => {
        let body: any = null
        let key: string | undefined

        server.use(
            configs(),
            prompts(),
            routes([{ route_key: 'leads', label: 'Leads', path: '/leads', is_active: true, source: 'default' }]),
            http.put('*/common/assistant-config/:type/routes/:key', async ({ request, params }) => {
                body = await request.json()
                key = params.key as string
                return HttpResponse.json({ status: true, message: '', data: {} })
            })
        )

        renderWithProviders(<AssistantConfigForm />)
        expect(await screen.findByText('leads')).toBeInTheDocument()

        await userEvent.type(screen.getByPlaceholderText('new_key'), 'reports')
        await userEvent.type(screen.getByPlaceholderText('Visible name'), 'Reports')
        await userEvent.type(screen.getByPlaceholderText('/path'), '/reports')
        await userEvent.click(screen.getByRole('button', { name: 'Add' }))

        await waitFor(() => expect(key).toBe('reports'))
        expect(body).toEqual({ label: 'Reports', path: '/reports', is_active: true })
    })
})
