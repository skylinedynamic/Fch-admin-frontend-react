import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchSavedAgreementTemplates,
  fetchSavedAgreementTemplate,
  saveAgreementAsTemplate,
  deleteSavedAgreementTemplate,
} from '../../../src/modules/agreement/services'

/**
 * Agreement Builder › Save as Template (fch-api AgreementSavedTemplateController,
 * /common/agreement-templates/saved): the partner's own named templates, or -
 * from Partner profile › Configuration - another partner's, named with partner_id.
 */
afterEach(() => server.resetHandlers())

const TEMPLATE = { id: 4, slug: 'borrower', name: 'Short form', created_at: '2026-11-17T10:00:00Z', updated_at: '2026-11-17T10:00:00Z' }

describe('fetchSavedAgreementTemplates', () => {
  it('GETs the saved templates of one agreement type', async () => {
    let url: URL | null = null
    server.use(http.get('*/common/agreement-templates/saved', ({ request }) => {
      url = new URL(request.url)
      return HttpResponse.json({ status: true, data: [TEMPLATE] })
    }))

    expect(await fetchSavedAgreementTemplates('borrower')).toEqual([TEMPLATE])
    expect(url!.searchParams.get('slug')).toBe('borrower')
    expect(url!.searchParams.has('partner_id')).toBe(false)
  })

  it('gives an empty list, not a crash, when the answer is not a list', async () => {
    server.use(http.get('*/common/agreement-templates/saved', () => HttpResponse.json({ status: true, data: { id: 8 } })))

    expect(await fetchSavedAgreementTemplates('borrower')).toEqual([])
  })

  it("names the partner when listing another partner's", async () => {
    let url: URL | null = null
    server.use(http.get('*/common/agreement-templates/saved', ({ request }) => {
      url = new URL(request.url)
      return HttpResponse.json({ status: true, data: [] })
    }))

    expect(await fetchSavedAgreementTemplates('borrower', 7)).toEqual([])
    expect(url!.searchParams.get('partner_id')).toBe('7')
  })
})

describe('fetchSavedAgreementTemplate', () => {
  it('GETs one template with its blocks', async () => {
    server.use(http.get('*/common/agreement-templates/saved/4', () =>
      HttpResponse.json({ status: true, data: { ...TEMPLATE, template_json: '{"blocks":[]}' } })))

    expect(await fetchSavedAgreementTemplate(4)).toMatchObject({ id: 4, template_json: '{"blocks":[]}' })
  })
})

describe('saveAgreementAsTemplate', () => {
  it('POSTs the agreement under its name, with partner_id for another partner', async () => {
    let body: Record<string, unknown> | null = null
    server.use(http.post('*/common/agreement-templates/saved', async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({ status: true, message: 'Template saved', data: TEMPLATE })
    }))

    const res = await saveAgreementAsTemplate({ slug: 'borrower', name: 'Short form', template_json: '{"blocks":[]}' }, 7)

    expect(body).toEqual({ slug: 'borrower', name: 'Short form', template_json: '{"blocks":[]}', partner_id: 7 })
    expect(res.data).toEqual(TEMPLATE)
  })
})

describe('deleteSavedAgreementTemplate', () => {
  it('DELETEs the template', async () => {
    let deleted = false
    server.use(http.delete('*/common/agreement-templates/saved/4', () => {
      deleted = true
      return HttpResponse.json({ status: true, data: null })
    }))

    await deleteSavedAgreementTemplate(4)
    expect(deleted).toBe(true)
  })
})
