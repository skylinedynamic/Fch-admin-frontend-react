import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchAgreementPreviewSigners,
  fetchAgreementPreviewValues,
  fetchAgreementSignerPreview,
} from '../../../src/modules/agreement/services'

/**
 * Agreement Builder › Preview as Partner / Preview as Borrower (fch-api
 * AgreementTemplateController::previewSigners / previewValues) and a partner's /
 * client's Agreement tab › Preview (AgreementSignController::preview).
 */
afterEach(() => server.resetHandlers())

const SIGNER = { user_id: 77, name: 'Ada Partner', email: 'ada@acme.test', business_name: 'Acme Lending', enrollment_type: 'Installment', has_sign: false }

describe('fetchAgreementPreviewSigners', () => {
  it('GETs who signs the agreement type, searched', async () => {
    let url: URL | null = null
    server.use(http.get('*/common/agreement-templates/preview-signers', ({ request }) => {
      url = new URL(request.url)
      return HttpResponse.json({ status: true, data: [SIGNER] })
    }))

    expect(await fetchAgreementPreviewSigners('partner', 'ada')).toEqual([SIGNER])
    expect(url!.searchParams.get('type')).toBe('partner')
    expect(url!.searchParams.get('search')).toBe('ada')
    expect(url!.searchParams.has('partner_id')).toBe(false)
  })

  it('leaves an empty search out', async () => {
    let url: URL | null = null
    server.use(http.get('*/common/agreement-templates/preview-signers', ({ request }) => {
      url = new URL(request.url)
      return HttpResponse.json({ status: true, data: [] })
    }))

    await fetchAgreementPreviewSigners('borrower', '  ')
    expect(url!.searchParams.has('search')).toBe(false)
  })

  it("names the partner when listing another partner's clients", async () => {
    let url: URL | null = null
    server.use(http.get('*/common/agreement-templates/preview-signers', ({ request }) => {
      url = new URL(request.url)
      return HttpResponse.json({ status: true, data: [] })
    }))

    await fetchAgreementPreviewSigners('borrower', '', 42)
    expect(url!.searchParams.get('partner_id')).toBe('42')
  })

  it('gives an empty list, not a crash, when the answer is not a list', async () => {
    server.use(http.get('*/common/agreement-templates/preview-signers', () => HttpResponse.json({ status: true, data: null })))

    expect(await fetchAgreementPreviewSigners('partner')).toEqual([])
  })
})

describe('fetchAgreementPreviewValues', () => {
  it("asks for the owner's details alone without a signer", async () => {
    let body: unknown = 'unset'
    server.use(http.post('*/common/agreement-templates/preview-values', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { 'owner.company_name': 'Acme' } })
    }))

    expect(await fetchAgreementPreviewValues()).toEqual({ 'owner.company_name': 'Acme' })
    expect(body).toEqual({})
  })

  it("asks for one signer's values, with the agreement type", async () => {
    let body: unknown = null
    server.use(http.post('*/common/agreement-templates/preview-values', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { 'signer.name': 'Ada Partner' } })
    }))

    expect(await fetchAgreementPreviewValues(42, { userId: 77, type: 'partner' })).toEqual({ 'signer.name': 'Ada Partner' })
    expect(body).toEqual({ partner_id: 42, signer_user_id: 77, type: 'partner' })
  })
})

describe('fetchAgreementSignerPreview', () => {
  it('GETs the agreement one partner / client would sign, filled with their details', async () => {
    server.use(http.get('*/common/agreement-sign/preview/77', () =>
      HttpResponse.json({ status: true, data: { template_id: 8, slug: 'partner', template_html: '<p>Dear Ada</p>' } })))

    expect(await fetchAgreementSignerPreview(77)).toEqual({ template_id: 8, slug: 'partner', template_html: '<p>Dear Ada</p>' })
  })
})
