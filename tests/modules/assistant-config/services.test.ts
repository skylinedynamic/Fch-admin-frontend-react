import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchAssistantConfigs, saveAssistantSettings } from '../../../src/modules/assistant-config/services'

afterEach(() => server.resetHandlers())

describe('fetchAssistantConfigs', () => {
  it('GETs the configs and returns the envelope as-is', async () => {
    server.use(
      http.get('*/common/assistant-config', () =>
        HttpResponse.json({ status: true, data: [{ type: 'wlp', agent_id: 'asst_1', enabled: true, vector_stores: [] }] })
      )
    )

    const result = await fetchAssistantConfigs()

    expect(result.status).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({ agent_id: 'asst_1', enabled: true })
  })
})

describe('saveAssistantSettings', () => {
  it('PUTs the settings to the assistant type in the path', async () => {
    let body: unknown = null
    let path = ''
    server.use(
      http.put('*/common/assistant-config/:type', async ({ request, params }) => {
        path = String(params.type)
        body = await request.json()
        return HttpResponse.json({ status: true })
      })
    )

    const payload = { agent_id: 'asst_2', enabled: false, vector_stores: [{ id: 'vs_1', enabled: true }] }
    const result = await saveAssistantSettings('wlp' as never, payload as never)

    expect(path).toBe('wlp')
    expect(body).toEqual(payload)
    expect(result).toEqual({ status: true })
  })

  it('sends a null agent id when the assistant is being cleared', async () => {
    let body: any = null
    server.use(
      http.put('*/common/assistant-config/:type', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true })
      })
    )

    await saveAssistantSettings('wlp' as never, { agent_id: null, enabled: false, vector_stores: [] })

    expect(body.agent_id).toBeNull()
    expect(body.vector_stores).toEqual([])
  })

  it('rejects when OpenAI validation fails server-side', async () => {
    server.use(
      http.put('*/common/assistant-config/:type', () =>
        HttpResponse.json({ status: false, message: 'Unknown vector store.', errors: { vector_stores: 'Unknown vector store.' } }, { status: 422 })
      )
    )

    await expect(
      saveAssistantSettings('wlp' as never, { agent_id: 'asst_1', enabled: true, vector_stores: [] })
    ).rejects.toMatchObject({ response: { status: 422 } })
  })
})
