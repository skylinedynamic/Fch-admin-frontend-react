import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import OpenAiConfigForm from '../../../src/pages/settings/components/OpenAiConfigForm'

// The real confirmation modal is a Bootstrap modal: closing it starts a timed
// hide animation, and when a test ends (unmounting it) before that timer
// fires, Bootstrap touches an element that no longer exists and throws
// outside any test. What these tests care about is when the dialog is shown,
// what it says and what its two buttons do — so a plain stand-in is used.
vi.mock('../../../src/components/Common/Modals/DynamicActionModal', () => ({
    default: (props: {
        show: boolean
        title: string
        description: ReactNode
        warningText?: string
        confirmText?: string
        cancelText?: string
        onConfirm: () => void
        onClose: () => void
    }) =>
        props.show ? (
            <div role="dialog" aria-label={props.title}>
                <h4>{props.title}</h4>
                <div>{props.description}</div>
                {props.warningText && <p>{props.warningText}</p>}
                <button type="button" onClick={props.onClose}>{props.cancelText ?? 'Cancel'}</button>
                <button type="button" onClick={props.onConfirm}>{props.confirmText ?? 'Confirm'}</button>
            </div>
        ) : null,
}))

/**
 * The Support Assistants part of the OpenAI Configuration form: the Borrower
 * and WL Partner agent ids and their switches, saved by the form's one
 * "Save Configuration" button.
 */

afterEach(() => {
    server.resetHandlers()
})

// Anchored: the show/hide buttons are labelled "Show … Agent ID".
const BORROWER = /^Borrower Assistant Agent ID/
const PARTNER = /^WL Partner Assistant Agent ID/

const assistant = (assistant_type: string, over: Record<string, unknown> = {}) => ({
    assistant_type,
    agent_id: null,
    is_enabled: true,
    is_ready: false,
    agent: null,
    agent_error: null,
    ...over,
})

const liveAgent = (name: string) => ({
    is_ready: true,
    agent: { name, model: 'gpt-6-astra', reasoning_effort: 'medium' },
})

/** The stored OpenAI key/model plus the two assistants' saved settings. */
const page = (borrower: Record<string, unknown> = {}, wlp: Record<string, unknown> = {}) => [
    http.get('*/common/openai/config', () =>
        HttpResponse.json({ status: true, message: '', data: { has_api_key: true, aue_model: 'gpt-5.6-luna', reasoning_effort: 'medium' } })
    ),
    http.get('*/common/openai/models', () =>
        HttpResponse.json({ status: true, message: '', data: { models: ['gpt-5.6-luna'], is_fallback: false, error: null, reasoning_efforts: [] } })
    ),
    http.get('*/common/assistant-config', () =>
        HttpResponse.json({ status: true, message: '', data: [assistant('wlp_support', wlp), assistant('borrower_support', borrower)] })
    ),
]

/** Records every save the form makes, in order. */
const captureSaves = () => {
    const calls: Array<{ to: string; body: any }> = []

    server.use(
        http.post('*/common/openai/config', async ({ request }) => {
            calls.push({ to: 'openai', body: await request.json() })
            return HttpResponse.json({ status: true, message: '', data: null })
        }),
        http.put('*/common/assistant-config/:type', async ({ params, request }) => {
            calls.push({ to: params.type as string, body: await request.json() })
            return HttpResponse.json({ status: true, message: '', data: null })
        })
    )

    return calls
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save Configuration' }))

describe('OpenAiConfigForm — support assistants', () => {
    it('shows both saved agent ids masked, with each live agent name', async () => {
        server.use(
            ...page(
                { agent_id: 'agent_borrower', ...liveAgent('FCH Borrower Support Assistant') },
                { agent_id: 'agent_wlp', ...liveAgent('FCH WL Partner Support Assistant') }
            )
        )

        renderWithProviders(<OpenAiConfigForm />)

        const borrower = await screen.findByLabelText(BORROWER)
        expect(borrower).toHaveValue('agent_borrower')
        expect(borrower).toHaveAttribute('type', 'password')
        expect(screen.getByLabelText(PARTNER)).toHaveValue('agent_wlp')
        expect(screen.getByText(/FCH Borrower Support Assistant · gpt-6-astra/)).toBeInTheDocument()
        expect(screen.getByText(/FCH WL Partner Support Assistant · gpt-6-astra/)).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Show Borrower Assistant Agent ID' }))
        expect(borrower).toHaveAttribute('type', 'text')
        expect(screen.getByLabelText(PARTNER)).toHaveAttribute('type', 'password')
    })

    it('has exactly one save button, which saves the key settings and both assistants', async () => {
        server.use(...page({ agent_id: 'agent_borrower' }, { agent_id: 'agent_wlp' }))
        const calls = captureSaves()

        renderWithProviders(<OpenAiConfigForm />)
        await screen.findByLabelText(BORROWER)

        expect(screen.getAllByRole('button', { name: /save/i })).toHaveLength(1)

        await save()

        await waitFor(() => expect(calls).toHaveLength(3))
        expect(calls.map((c) => c.to)).toEqual(['openai', 'borrower_support', 'wlp_support'])
        expect(calls[1].body).toEqual({ agent_id: 'agent_borrower', enabled: true })
        expect(calls[2].body).toEqual({ agent_id: 'agent_wlp', enabled: true })
    })

    it('requires an Agent ID for an enabled assistant and saves nothing', async () => {
        server.use(...page({}, { agent_id: 'agent_wlp' }))
        const calls = captureSaves()

        renderWithProviders(<OpenAiConfigForm />)
        await screen.findByLabelText(BORROWER)
        await save()

        expect(await screen.findByText(/required while the assistant is enabled/)).toBeInTheDocument()
        expect(calls).toHaveLength(0)
    })

    it('refuses an id that is not an agent id and saves nothing', async () => {
        server.use(...page({}, { agent_id: 'agent_wlp' }))
        const calls = captureSaves()

        renderWithProviders(<OpenAiConfigForm />)
        await userEvent.type(await screen.findByLabelText(BORROWER), 'pmpt_123')
        await save()

        expect(await screen.findByText(/must start with "agent_"/)).toBeInTheDocument()
        expect(calls).toHaveLength(0)
    })

    it('a disabled assistant may have no Agent ID, and keeps one it already has', async () => {
        server.use(...page({ agent_id: 'agent_borrower' }, { is_enabled: false }))
        const calls = captureSaves()

        renderWithProviders(<OpenAiConfigForm />)
        await screen.findByLabelText(BORROWER)

        // switch the borrower assistant off; the partner one is already off with no id
        await userEvent.click(screen.getByRole('switch', { name: /Borrower Assistant/ }))
        await userEvent.click(await screen.findByRole('button', { name: 'Yes, Disable' }))
        await save()

        await waitFor(() => expect(calls).toHaveLength(3))
        expect(calls[1].body).toEqual({ agent_id: 'agent_borrower', enabled: false })
        expect(calls[2].body).toEqual({ agent_id: null, enabled: false })
    })

    it('asks the host to confirm before disabling, and says who loses the chat', async () => {
        server.use(...page({ agent_id: 'agent_borrower' }, { agent_id: 'agent_wlp' }))

        renderWithProviders(<OpenAiConfigForm />)
        await screen.findByLabelText(BORROWER)

        const partnerSwitch = screen.getByRole('switch', { name: /WL Partner Assistant/ })
        await userEvent.click(partnerSwitch)

        expect(await screen.findByText('Disable the WL Partner Assistant?')).toBeInTheDocument()
        expect(screen.getByText(/will no longer see the support chat in the partner portal/)).toBeInTheDocument()
        // Nothing changes until the host confirms.
        expect(partnerSwitch).toBeChecked()

        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
        expect(partnerSwitch).toBeChecked()

        await userEvent.click(partnerSwitch)
        await userEvent.click(await screen.findByRole('button', { name: 'Yes, Disable' }))
        expect(partnerSwitch).not.toBeChecked()
        expect(screen.getByRole('switch', { name: /Borrower Assistant/ })).toBeChecked()
    })

    it('enables an assistant straight away, with no confirmation', async () => {
        server.use(...page({ agent_id: 'agent_borrower', is_enabled: false }, { agent_id: 'agent_wlp' }))
        const calls = captureSaves()

        renderWithProviders(<OpenAiConfigForm />)
        await screen.findByLabelText(BORROWER)

        const borrowerSwitch = screen.getByRole('switch', { name: /Borrower Assistant/ })
        await userEvent.click(borrowerSwitch)

        expect(borrowerSwitch).toBeChecked()
        // The confirmation dialog stays closed (it is only for disabling).
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.queryByText(/^Enable the /)).not.toBeInTheDocument()

        await save()

        await waitFor(() => expect(calls).toHaveLength(3))
        expect(calls[1].body).toEqual({ agent_id: 'agent_borrower', enabled: true })
    })

    it("shows the server's validation message under the assistant it belongs to", async () => {
        server.use(
            ...page({ agent_id: 'agent_borrower' }, { agent_id: 'agent_wlp' }),
            http.post('*/common/openai/config', () => HttpResponse.json({ status: true, message: '', data: null })),
            http.put('*/common/assistant-config/borrower_support', () => HttpResponse.json({ status: true, message: '', data: null })),
            http.put('*/common/assistant-config/wlp_support', () =>
                HttpResponse.json(
                    { status: false, message: 'Validation failed.', errors: { agent_id: ['OpenAI could not load this agent. No agent found.'] } },
                    { status: 422 }
                )
            )
        )

        renderWithProviders(<OpenAiConfigForm />)
        await screen.findByLabelText(BORROWER)
        await save()

        expect(await screen.findByText(/OpenAI could not load this agent/)).toBeInTheDocument()
        expect(screen.getByLabelText(PARTNER)).toHaveClass('is-invalid')
        expect(screen.getByLabelText(BORROWER)).not.toHaveClass('is-invalid')
    })

    it("shows OpenAI's own error when a saved agent cannot be read", async () => {
        server.use(...page({ agent_id: 'agent_borrower', agent_error: 'OpenAI Agents API error (403): missing api.agents.read' }))

        renderWithProviders(<OpenAiConfigForm />)

        expect(await screen.findByText(/missing api\.agents\.read/)).toBeInTheDocument()
    })
})
