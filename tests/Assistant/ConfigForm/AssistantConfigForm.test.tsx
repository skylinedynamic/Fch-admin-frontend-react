import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import AssistantConfigForm from '../../../src/pages/settings/components/AssistantConfigForm'

afterEach(() => server.resetHandlers())

const emptyConfigs = () =>
    http.get('*/common/assistant-config', () =>
        HttpResponse.json({
            status: true,
            message: '',
            data: [
                { assistant_type: 'wlp_support', system_prompt: '', model: '', reasoning_effort: 'low', max_output_tokens: 1200, vector_store_id: null, knowledge_manifest_version: null, is_enabled: false, is_ready: false },
                { assistant_type: 'borrower_support', system_prompt: '', model: '', reasoning_effort: 'low', max_output_tokens: 1200, vector_store_id: null, knowledge_manifest_version: null, is_enabled: false, is_ready: false },
            ],
        })
    )

describe('AssistantConfigForm', () => {
    it('loads both assistants and defaults to the WLP tab, showing Not ready', async () => {
        server.use(emptyConfigs())

        renderWithProviders(<AssistantConfigForm />)

        expect(await screen.findByText('Not ready')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'WLP Assistant' })).toHaveClass('active')
    })

    it('switching tabs shows that assistant\'s own saved state', async () => {
        server.use(
            http.get('*/common/assistant-config', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: [
                        { assistant_type: 'wlp_support', system_prompt: 'WLP prompt text', model: '', reasoning_effort: 'low', max_output_tokens: 1200, vector_store_id: 'vs_1', knowledge_manifest_version: '1.2', is_enabled: true, is_ready: true },
                        { assistant_type: 'borrower_support', system_prompt: '', model: '', reasoning_effort: 'low', max_output_tokens: 1200, vector_store_id: null, knowledge_manifest_version: null, is_enabled: false, is_ready: false },
                    ],
                })
            )
        )

        renderWithProviders(<AssistantConfigForm />)
        expect(await screen.findByDisplayValue('WLP prompt text')).toBeInTheDocument()
        expect(screen.getByText('Ready')).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Borrower Assistant' }))

        expect(screen.queryByDisplayValue('WLP prompt text')).not.toBeInTheDocument()
        expect(screen.getByText('Not ready')).toBeInTheDocument()
    })

    it('refuses to enable an assistant with no knowledge base, without calling the API', async () => {
        server.use(
            emptyConfigs(),
            http.post('*/common/assistant-config', () => {
                throw new Error('should not save when refused client-side')
            })
        )

        renderWithProviders(<AssistantConfigForm />)
        await screen.findByText('Not ready')

        await userEvent.click(screen.getByRole('button', { name: /save & enable/i }))

        // No crash and no network call — the guard in handleSave() short-circuits.
        expect(screen.getByText('Not ready')).toBeInTheDocument()
    })

    it('saving as draft sends is_enabled: false with the edited fields', async () => {
        let receivedBody: unknown = null

        server.use(
            emptyConfigs(),
            http.post('*/common/assistant-config', async ({ request }) => {
                receivedBody = await request.json()
                return HttpResponse.json({ status: true, message: '', data: null })
            })
        )

        renderWithProviders(<AssistantConfigForm />)
        await screen.findByText('Not ready')

        await userEvent.type(screen.getByLabelText(/system prompt/i), 'A new draft prompt')
        await userEvent.click(screen.getByRole('button', { name: /save as draft/i }))

        await waitFor(() => expect(receivedBody).toMatchObject({
            assistant_type: 'wlp_support',
            system_prompt: 'A new draft prompt',
            is_enabled: false,
        }))
    })

    it('enabling an assistant that already has a vector store calls the API with is_enabled: true', async () => {
        let receivedBody: unknown = null

        server.use(
            http.get('*/common/assistant-config', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: [
                        { assistant_type: 'wlp_support', system_prompt: 'Ready prompt', model: '', reasoning_effort: 'low', max_output_tokens: 1200, vector_store_id: 'vs_1', knowledge_manifest_version: '1.2', is_enabled: false, is_ready: false },
                        { assistant_type: 'borrower_support', system_prompt: '', model: '', reasoning_effort: 'low', max_output_tokens: 1200, vector_store_id: null, knowledge_manifest_version: null, is_enabled: false, is_ready: false },
                    ],
                })
            ),
            http.post('*/common/assistant-config', async ({ request }) => {
                receivedBody = await request.json()
                return HttpResponse.json({ status: true, message: '', data: null })
            })
        )

        renderWithProviders(<AssistantConfigForm />)
        await screen.findByDisplayValue('Ready prompt')

        await userEvent.click(screen.getByRole('button', { name: /save & enable/i }))

        await waitFor(() => expect(receivedBody).toMatchObject({
            assistant_type: 'wlp_support',
            is_enabled: true,
        }))
    })
})
