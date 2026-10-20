import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchAssistantConfig,
  fetchAssistantHistory,
  listAssistantSessions,
  sendAssistantMessage,
  startNewAssistantSession,
} from '../../../src/modules/support-chat/services'

afterEach(() => server.resetHandlers())

describe('sendAssistantMessage', () => {
  it('POSTs the message payload and returns the envelope', async () => {
    let body: unknown = null
    server.use(
      http.post('*/common/assistant/wlp/messages', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: { session_id: 's1', reply: 'Hello' } })
      })
    )

    const payload = { message: 'Hi', session_id: 's1' }
    const result: any = await sendAssistantMessage(payload as never)

    expect(body).toEqual(payload)
    expect(result.data).toMatchObject({ session_id: 's1', reply: 'Hello' })
  })
})

describe('fetchAssistantHistory', () => {
  it('GETs the messages of the given session', async () => {
    let session = ''
    server.use(
      http.get('*/common/assistant/wlp/conversations/:id/messages', ({ params }) => {
        session = String(params.id)
        return HttpResponse.json({ status: true, message: 'ok', data: [{ role: 'user', content: 'Hi' }] })
      })
    )

    const result: any = await fetchAssistantHistory('abc-123')

    expect(session).toBe('abc-123')
    expect(result.data).toHaveLength(1)
  })
})

describe('listAssistantSessions', () => {
  it('GETs the signed-in user sessions', async () => {
    server.use(
      http.get('*/common/assistant/wlp/sessions', () =>
        HttpResponse.json({ status: true, message: 'ok', data: [{ session_id: 's2' }, { session_id: 's1' }] })
      )
    )

    const result: any = await listAssistantSessions()

    expect(result.data.map((s: any) => s.session_id)).toEqual(['s2', 's1'])
  })
})

describe('startNewAssistantSession', () => {
  it('POSTs with no body and returns the new session id', async () => {
    let method = ''
    server.use(
      http.post('*/common/assistant/wlp/sessions', ({ request }) => {
        method = request.method
        return HttpResponse.json({ status: true, message: 'ok', data: { session_id: 'fresh' } })
      })
    )

    const result = await startNewAssistantSession()

    expect(method).toBe('POST')
    expect(result.data.session_id).toBe('fresh')
  })
})

describe('fetchAssistantConfig', () => {
  const reply = { status: true, message: 'ok', data: { is_ready: true, welcome_subtitle: null, quick_suggestions: [] } }

  it('asks only for readiness by default (no intro parameter)', async () => {
    let search = 'unset'
    server.use(
      http.get('*/common/assistant/wlp/config', ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json(reply)
      })
    )

    const result = await fetchAssistantConfig()

    expect(search).toBe('')
    expect(result.data.is_ready).toBe(true)
  })

  it('adds intro=1 when the welcome line and suggestions are wanted', async () => {
    let intro: string | null = null
    server.use(
      http.get('*/common/assistant/wlp/config', ({ request }) => {
        intro = new URL(request.url).searchParams.get('intro')
        return HttpResponse.json({ ...reply, data: { ...reply.data, welcome_subtitle: 'Ask me anything', quick_suggestions: ['Pricing'] } })
      })
    )

    const result = await fetchAssistantConfig(true)

    expect(intro).toBe('1')
    expect(result.data.quick_suggestions).toEqual(['Pricing'])
  })
})
