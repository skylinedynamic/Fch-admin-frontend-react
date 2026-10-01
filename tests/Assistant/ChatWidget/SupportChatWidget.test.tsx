import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import SupportChatWidget from '../../../src/components/Common/ChatWidget/SupportChatWidget'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
    return { ...actual, useNavigate: () => navigateMock }
})

afterEach(() => {
    server.resetHandlers()
    navigateMock.mockClear()
})

const noSessions = () =>
    http.get('*/common/assistant/wlp/sessions', () => HttpResponse.json({ status: true, message: '', data: [] }))

// Enabled, with no welcome line or suggested questions in the agent's
// instructions — the widget shows only its greeting.
const enabledConfig = () =>
    http.get('*/common/assistant/wlp/config', () =>
        HttpResponse.json({ status: true, message: '', data: { is_ready: true, welcome_subtitle: null, quick_suggestions: [] } })
    )

const configWith = (welcome_subtitle: string, quick_suggestions: string[]) =>
    http.get('*/common/assistant/wlp/config', () =>
        HttpResponse.json({ status: true, message: '', data: { is_ready: true, welcome_subtitle, quick_suggestions } })
    )

const open = async () => {
    await userEvent.click(await screen.findByRole('button', { name: /open ask support/i }))
    await screen.findByPlaceholderText(/type a message/i)
}

const sendMessage = async (text: string) => {
    await userEvent.type(screen.getByPlaceholderText(/type a message/i), text)
    await userEvent.click(screen.getByRole('button', { name: /send message/i }))
}

describe('SupportChatWidget (admin/WLP)', () => {
    it('is closed until the floating button is clicked, then shows the empty-state prompt once history loads', async () => {
        server.use(noSessions(), enabledConfig())

        renderWithProviders(<SupportChatWidget />)

        expect(screen.queryByText(/ask support/i)).not.toBeInTheDocument()

        await open()

        // Nothing is built in: with no copy from the backend the welcome card
        // shows only its greeting — no subtitle and no suggested questions.
        expect(await screen.findByText(/welcome to our live chat/i)).toBeInTheDocument()
        expect(screen.queryByText(/suggested questions/i)).not.toBeInTheDocument()
    })

    it('renders the live-derived welcome subtitle and suggestion chips from the config endpoint', async () => {
        server.use(
            noSessions(),
            configWith('Ask a question about your custom domain or client records.', [
                'How do I set up my custom domain?',
                'How do I manage client records?',
            ])
        )

        renderWithProviders(<SupportChatWidget />)
        await open()

        expect(await screen.findByText(/ask a question about your custom domain or client records\./i)).toBeInTheDocument()
        expect(screen.getByText('How do I set up my custom domain?')).toBeInTheDocument()
        expect(screen.getByText('How do I manage client records?')).toBeInTheDocument()
    })

    it('re-fetches on every reopen, so an edited prompt is reflected without a page reload', async () => {
        let callCount = 0
        server.use(
            noSessions(),
            http.get('*/common/assistant/wlp/config', () => {
                callCount += 1
                return HttpResponse.json({
                    status: true,
                    message: '',
                    // Calls 1 (page-load check) and 2 (first open) see the old copy; the reopen sees the new.
                    data: callCount <= 2
                        ? { is_ready: true, welcome_subtitle: 'Ask about the old prompt topic.', quick_suggestions: ['Old prompt question?'] }
                        : { is_ready: true, welcome_subtitle: 'Ask about the new prompt topic.', quick_suggestions: ['New prompt question?'] },
                })
            })
        )

        renderWithProviders(<SupportChatWidget />)
        await open()
        expect(await screen.findByText(/ask about the old prompt topic\./i)).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: /minimize ask support/i }))
        await userEvent.click(screen.getByRole('button', { name: /open ask support/i }))

        expect(await screen.findByText(/ask about the new prompt topic\./i)).toBeInTheDocument()
        expect(screen.getByText('New prompt question?')).toBeInTheDocument()
        expect(screen.queryByText('Old prompt question?')).not.toBeInTheDocument()
    })

    it('clicking a suggestion chip sends it as a real message', async () => {
        server.use(
            noSessions(),
            configWith('Ask a question about resetting a password.', ['How do I reset a client password?']),
            http.post('*/common/assistant/wlp/messages', async ({ request }) => {
                const body = (await request.json()) as { message: string }
                expect(body.message).toBe('How do I reset a client password?')
                return HttpResponse.json({
                    status: true,
                    message: '',
                    data: {
                        session_id: 'session-1',
                        message_id: 'message-1',
                        answer: 'Here is how.',
                        created_at: 'Sep 27, 2026 3:00 PM',
                        actions: [],
                        sources: [],
                        escalation: { required: false, reason: null, route: null },
                        policy: { live_data_used: false, restricted_content_blocked: false, sensitive_input_detected: false },
                    },
                })
            })
        )

        renderWithProviders(<SupportChatWidget />)
        await open()

        await userEvent.click(await screen.findByText('How do I reset a client password?'))

        expect(await screen.findByText('Here is how.')).toBeInTheDocument()
    })

    it('is not shown at all when the assistant is disabled', async () => {
        let configCalls = 0
        server.use(
            noSessions(),
            http.get('*/common/assistant/wlp/config', () => {
                configCalls++
                return HttpResponse.json({ status: true, message: '', data: { is_ready: false, welcome_subtitle: null, quick_suggestions: [] } })
            })
        )

        const { container } = renderWithProviders(<SupportChatWidget />)

        await waitFor(() => expect(configCalls).toBeGreaterThan(0))
        expect(screen.queryByRole('button', { name: /open ask support/i })).not.toBeInTheDocument()
        expect(container.querySelector('.support-chat-fab, [class*="support-chat"]')).toBeNull()
    })

    it('is not shown when the enabled check fails', async () => {
        let configCalls = 0
        server.use(
            noSessions(),
            http.get('*/common/assistant/wlp/config', () => {
                configCalls++
                return HttpResponse.error()
            })
        )

        renderWithProviders(<SupportChatWidget />)

        await waitFor(() => expect(configCalls).toBeGreaterThan(0))
        expect(screen.queryByRole('button', { name: /open ask support/i })).not.toBeInTheDocument()
    })

    it('appears and disappears without a reload when the host switches the assistant on or off', async () => {
        let enabled = false
        server.use(
            noSessions(),
            http.get('*/common/assistant/wlp/config', () =>
                HttpResponse.json({ status: true, message: '', data: { is_ready: enabled, welcome_subtitle: null, quick_suggestions: [] } })
            )
        )

        renderWithProviders(<SupportChatWidget />)
        await waitFor(() => expect(screen.queryByRole('button', { name: /open ask support/i })).not.toBeInTheDocument())

        // The host enables it elsewhere; this page re-checks (here: on returning to the tab).
        enabled = true
        window.dispatchEvent(new Event('focus'))
        expect(await screen.findByRole('button', { name: /open ask support/i })).toBeInTheDocument()

        // ...and disables it again while the panel is open: the whole chat goes away.
        await open()
        enabled = false
        window.dispatchEvent(new Event('focus'))

        await waitFor(() => expect(screen.queryByPlaceholderText(/type a message/i)).not.toBeInTheDocument())
        expect(screen.queryByRole('button', { name: /open ask support/i })).not.toBeInTheDocument()
    })

    it('asks for the welcome copy only when the panel is opened', async () => {
        const asked: Array<string | null> = []
        server.use(
            noSessions(),
            http.get('*/common/assistant/wlp/config', ({ request }) => {
                asked.push(new URL(request.url).searchParams.get('intro'))
                return HttpResponse.json({ status: true, message: '', data: { is_ready: true, welcome_subtitle: null, quick_suggestions: [] } })
            })
        )

        renderWithProviders(<SupportChatWidget />)
        await screen.findByRole('button', { name: /open ask support/i })

        // The page-load check is the cheap one: no intro requested.
        expect(asked).toEqual([null])

        await open()

        await waitFor(() => expect(asked).toEqual([null, '1']))
    })

    it('renders a native button for an action in the served route map and navigates to that route on click', async () => {
        server.use(
            noSessions(),
            // No destinations are built into the widget: the allowlist is the map the backend serves.
            http.get('*/common/assistant/wlp/config', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: { is_ready: true, welcome_subtitle: null, quick_suggestions: [], navigation: { settings: '/settings' } },
                })
            ),
            http.post('*/common/assistant/wlp/messages', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: {
                        session_id: 'session-123',
                        message_id: 'message-456',
                        answer: 'Go to Settings.\n\n[[ACTION:navigate_settings]]\n\nThen select **Email Configuration**.',
                        actions: [{ type: 'navigate', id: 'navigate_settings', label: 'Take Me There', path: '/settings' }],
                        sources: [],
                        escalation: { required: false, reason: null, route: null },
                        policy: { live_data_used: false, restricted_content_blocked: false, sensitive_input_detected: false },
                    },
                })
            )
        )

        renderWithProviders(<SupportChatWidget />)
        await open()
        await sendMessage('How do I set up email?')

        const ctaButton = await screen.findByRole('button', { name: 'Take Me There' })
        // The bold markdown around "Email Configuration" also renders as real text.
        expect(screen.getByText('Email Configuration')).toBeInTheDocument()

        await userEvent.click(ctaButton)

        // Navigation follows the route map served by the config endpoint.
        expect(navigateMock).toHaveBeenCalledWith('/settings')
    })

    it('renders no button for an action that is not in the served route map', async () => {
        server.use(
            noSessions(),
            enabledConfig(),
            http.post('*/common/assistant/wlp/messages', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: {
                        session_id: 'session-123',
                        message_id: 'message-456',
                        answer: 'Go to Settings.\n\n[[ACTION:navigate_settings]]',
                        actions: [{ type: 'navigate', id: 'navigate_settings', label: 'Take Me There', path: '/settings' }],
                        sources: [],
                        escalation: { required: false, reason: null, route: null },
                        policy: { live_data_used: false, restricted_content_blocked: false, sensitive_input_detected: false },
                    },
                })
            )
        )

        renderWithProviders(<SupportChatWidget />)
        await open()
        await sendMessage('How do I set up email?')

        expect(await screen.findByText(/Go to Settings/)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Take Me There' })).not.toBeInTheDocument()
    })

    it('ignores an action whose path does not match the local allowlist entry, as a defense-in-depth check', async () => {
        server.use(
            noSessions(),
            enabledConfig(),
            http.post('*/common/assistant/wlp/messages', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: {
                        session_id: 'session-123',
                        message_id: 'message-456',
                        answer: 'Suspicious reply.\n\n[[ACTION:navigate_settings]]',
                        // A server bug or compromised response claiming a different path
                        // for a known action id — the frontend must refuse to trust it.
                        actions: [{ type: 'navigate', id: 'navigate_settings', label: 'Take Me There', path: '/some/other/route' }],
                        sources: [],
                        escalation: { required: false, reason: null, route: null },
                        policy: { live_data_used: false, restricted_content_blocked: false, sensitive_input_detected: false },
                    },
                })
            )
        )

        renderWithProviders(<SupportChatWidget />)
        await open()
        await sendMessage('Trigger it')

        await screen.findByText(/suspicious reply\./i)
        expect(screen.queryByRole('button', { name: 'Take Me There' })).not.toBeInTheDocument()
    })

    it('minimizing hides the panel and reopening restores the in-memory conversation without refetching history', async () => {
        server.use(
            noSessions(),
            enabledConfig(),
            http.post('*/common/assistant/wlp/messages', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: {
                        session_id: 'session-123',
                        message_id: 'message-456',
                        answer: 'Sure thing.',
                        actions: [],
                        sources: [],
                        escalation: { required: false, reason: null, route: null },
                        policy: { live_data_used: false, restricted_content_blocked: false, sensitive_input_detected: false },
                    },
                })
            )
        )

        renderWithProviders(<SupportChatWidget />)
        await open()
        await sendMessage('Hi')
        await screen.findByText('Sure thing.')

        await userEvent.click(screen.getByRole('button', { name: /minimize ask support/i }))
        expect(screen.queryByText('Sure thing.')).not.toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: /open ask support/i }))
        await waitFor(() => expect(screen.getByText('Sure thing.')).toBeInTheDocument())
    })

    it('restores a prior session on open via the sessions and history endpoints', async () => {
        server.use(
            enabledConfig(),
            http.get('*/common/assistant/wlp/sessions', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: [{ session_id: 'old-session', status: 'open', last_message_at: '2026-09-26T00:00:00Z', created_at: '2026-09-25T00:00:00Z' }],
                })
            ),
            http.get('*/common/assistant/wlp/conversations/old-session/messages', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: [
                        { message_id: 'm1', role: 'user', content: 'Earlier question', actions: [], sources: [], created_at: '2026-09-25T00:00:00Z' },
                        { message_id: 'm2', role: 'assistant', content: 'Earlier answer', actions: [], sources: [], created_at: '2026-09-25T00:01:00Z' },
                    ],
                })
            )
        )

        renderWithProviders(<SupportChatWidget />)
        await open()

        expect(await screen.findByText('Earlier question')).toBeInTheDocument()
        expect(screen.getByText('Earlier answer')).toBeInTheDocument()
    })

    it('renders the server-provided timestamp under an assistant reply', async () => {
        server.use(
            noSessions(),
            enabledConfig(),
            http.post('*/common/assistant/wlp/messages', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: {
                        session_id: 'session-123',
                        message_id: 'message-456',
                        answer: 'Here you go.',
                        created_at: 'Sep 27, 2026 2:58 PM',
                        actions: [],
                        sources: [],
                        escalation: { required: false, reason: null, route: null },
                        policy: { live_data_used: false, restricted_content_blocked: false, sensitive_input_detected: false },
                    },
                })
            )
        )

        renderWithProviders(<SupportChatWidget />)
        await open()
        await sendMessage('What time is it?')

        await screen.findByText('Here you go.')
        // The timestamp is rendered exactly as the backend formatted it
        // (toTimezone() against the caller's own X-Timezone header) — no
        // client-side re-parsing that could disagree with the server.
        expect(screen.getByText('Sep 27, 2026 2:58 PM')).toBeInTheDocument()
    })

    it('badges the launcher and plays a notification when a reply arrives while minimized, and clears on reopen', async () => {
        // A manually-resolved deferred, not a real setTimeout — the reply
        // resolves only when this test says so, so "minimize before the
        // reply arrives" is guaranteed by explicit control flow rather than
        // a race against wall-clock timing (which can flake under the CPU
        // contention a full parallel suite run creates — see vitest.config.ts).
        let resolveReply!: () => void;
        const replyGate = new Promise<void>((resolve) => { resolveReply = resolve; });

        server.use(
            noSessions(),
            enabledConfig(),
            http.post('*/common/assistant/wlp/messages', async () => {
                await replyGate;
                return HttpResponse.json({
                    status: true,
                    message: '',
                    data: {
                        session_id: 'session-123',
                        message_id: 'message-456',
                        answer: 'Delayed reply.',
                        created_at: 'Sep 27, 2026 2:58 PM',
                        actions: [],
                        sources: [],
                        escalation: { required: false, reason: null, route: null },
                        policy: { live_data_used: false, restricted_content_blocked: false, sensitive_input_detected: false },
                    },
                })
            })
        )

        renderWithProviders(<SupportChatWidget />)
        await open()
        await userEvent.type(screen.getByPlaceholderText(/type a message/i), 'Will you be quick?')
        await userEvent.click(screen.getByRole('button', { name: /send message/i }))

        // Minimize while the reply is still deliberately held back.
        await userEvent.click(screen.getByRole('button', { name: /minimize ask support/i }))

        // Only now does the response settle — openRef.current is guaranteed
        // to already be false by this point.
        resolveReply();

        await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());

        await userEvent.click(screen.getByRole('button', { name: /open ask support/i }))
        expect(screen.queryByText('1')).not.toBeInTheDocument()
        expect(await screen.findByText('Delayed reply.')).toBeInTheDocument()
    })

    it('starts a new session and clears the conversation when clicking the New Session button', async () => {
        server.use(
            enabledConfig(),
            http.get('*/common/assistant/wlp/sessions', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: [{ session_id: 'session-1', status: 'open', last_message_at: '2026-09-27T00:00:00Z', created_at: '2026-09-27T00:00:00Z' }],
                })
            ),
            http.get('*/common/assistant/wlp/conversations/session-1/messages', () =>
                HttpResponse.json({
                    status: true,
                    message: '',
                    data: [
                        { message_id: 'm1', role: 'user', content: 'Previous question', actions: [], sources: [], created_at: '2026-09-27T00:00:00Z' },
                        { message_id: 'm2', role: 'assistant', content: 'Previous answer', actions: [], sources: [], created_at: '2026-09-27T00:01:00Z' },
                    ],
                })
            ),
            http.post('*/common/assistant/wlp/sessions', () =>
                HttpResponse.json({
                    status: true,
                    message: 'Session created',
                    data: {
                        session_id: 'session-new-999',
                        status: 'open',
                        created_at: '2026-09-27T00:02:00Z',
                    },
                })
            )
        )

        renderWithProviders(<SupportChatWidget />)
        await open()

        expect(await screen.findByText('Previous question')).toBeInTheDocument()

        const newSessionBtn = screen.getByRole('button', { name: /start new conversation|start new session/i })
        await userEvent.click(newSessionBtn)

        await waitFor(() => {
            expect(screen.queryByText('Previous question')).not.toBeInTheDocument()
            // Nothing is built in: with no copy from the backend the welcome card
            // shows only its greeting — no subtitle and no suggested questions.
            expect(screen.getByText(/welcome to our live chat/i)).toBeInTheDocument()
            expect(screen.queryByText(/suggested questions/i)).not.toBeInTheDocument()
        })
    })
})
