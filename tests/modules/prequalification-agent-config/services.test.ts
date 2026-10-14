import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchPreQualificationAgentConfigs,
  savePreQualificationAgentSettings,
} from '../../../src/modules/prequalification-agent-config/services'

afterEach(() => server.resetHandlers())

describe('fetchPreQualificationAgentConfigs', () => {
  it('GETs every step config and returns the envelope as-is', async () => {
    server.use(
      http.get('*/common/prequalification-agent-config', () =>
        HttpResponse.json({ status: true, data: [{ step: 'intake', agent_id: 'asst_a', enabled: true, vector_stores: [] }] })
      )
    )

    const result = await fetchPreQualificationAgentConfigs()

    expect(result.status).toBe(true)
    expect(result.data[0]).toMatchObject({ step: 'intake', agent_id: 'asst_a' })
  })
})

describe('savePreQualificationAgentSettings', () => {
  it('PUTs the settings to the step in the path', async () => {
    let step = ''
    let body: unknown = null
    server.use(
      http.put('*/common/prequalification-agent-config/:step', async ({ request, params }) => {
        step = String(params.step)
        body = await request.json()
        return HttpResponse.json({ status: true })
      })
    )

    const payload = { agent_id: 'asst_b', enabled: true, vector_stores: [{ id: 'vs_9', enabled: false }] }
    const result = await savePreQualificationAgentSettings('intake' as never, payload as never)

    expect(step).toBe('intake')
    expect(body).toEqual(payload)
    expect(result).toEqual({ status: true })
  })

  it('rejects when the server refuses the agent', async () => {
    server.use(
      http.put('*/common/prequalification-agent-config/:step', () =>
        HttpResponse.json({ status: false, message: 'Agent does not return a structured result.' }, { status: 422 })
      )
    )

    await expect(
      savePreQualificationAgentSettings('intake' as never, { agent_id: 'asst_x', enabled: true, vector_stores: [] })
    ).rejects.toMatchObject({ response: { status: 422 } })
  })
})
