import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  fetchAgreements,
  saveAgreement,
  fetchAgreement,
  toggleAgreementStatus,
  checkAgreementSign,
  submitAgreementSign,
  downloadAgreementSign,
  fetchSignedAgreementHtml,
  cancelAgreementSign,
  fetchAgreementPreviewValues,
} from '../../../src/modules/agreement/services'

afterEach(() => server.resetHandlers())

describe('fetchAgreements', () => {
  it('GETs the template list and resolves with the raw envelope', async () => {
    server.use(
      http.get('*/common/agreement-templates', () =>
        HttpResponse.json({ status: true, message: 'ok', data: [{ id: 1, slug: 'borrower' }] })
      )
    )

    const result = await fetchAgreements()
    expect(result.status).toBe(true)
    expect(result.data).toEqual([{ id: 1, slug: 'borrower' }])
  })
})

describe('saveAgreement', () => {
  it('POSTs to /save when no id is given (create)', async () => {
    let receivedUrl = ''
    server.use(
      http.post('*/common/agreement-templates/save', async ({ request }) => {
        receivedUrl = new URL(request.url).pathname
        return HttpResponse.json({ status: true, message: 'Saved', data: { id: 10, slug: 'partner' } })
      })
    )

    const result = await saveAgreement({ slug: 'partner', template_html: '<p>hi</p>' })
    expect(receivedUrl).toContain('/common/agreement-templates/save')
    expect(result.data?.id).toBe(10)
  })

  it('POSTs to /save/:id when an id is given (update)', async () => {
    let hitUpdateUrl = false
    server.use(
      http.post('*/common/agreement-templates/save/5', () => {
        hitUpdateUrl = true
        return HttpResponse.json({ status: true, message: 'Updated', data: { id: 5, slug: 'partner' } })
      })
    )

    await saveAgreement({ id: 5, slug: 'partner' })
    expect(hitUpdateUrl).toBe(true)
  })

  it('logs and rethrows when the save request fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(http.post('*/common/agreement-templates/save', () => HttpResponse.json({ message: 'boom' }, { status: 500 })))

    await expect(saveAgreement({ slug: 'partner' })).rejects.toBeTruthy()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('fetchAgreement', () => {
  it('POSTs { slug } to the /show endpoint and resolves with the envelope', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/agreement-templates/show', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: { id: 1, slug: 'borrower', template_html: '<p/>' } })
      })
    )

    const result = await fetchAgreement('borrower')
    expect(receivedBody).toEqual({ slug: 'borrower' })
    expect(result.data?.slug).toBe('borrower')
  })

  it('rethrows on 404 without logging to console.error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(http.post('*/common/agreement-templates/show', () => HttpResponse.json({ message: 'Not found' }, { status: 404 })))

    await expect(fetchAgreement('borrower')).rejects.toBeTruthy()
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('logs to console.error and rethrows on non-404 errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(http.post('*/common/agreement-templates/show', () => HttpResponse.json({ message: 'boom' }, { status: 500 })))

    await expect(fetchAgreement('borrower')).rejects.toBeTruthy()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('toggleAgreementStatus', () => {
  it('POSTs the full payload to /update-status/:id', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/agreement-templates/update-status/3', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: { id: 3, slug: 'partner', is_active: false } })
      })
    )

    const result = await toggleAgreementStatus({ id: 3, slug: 'partner', is_active: false })
    expect(receivedBody).toEqual({ id: 3, slug: 'partner', is_active: false })
    expect(result.data?.is_active).toBe(false)
  })
})

describe('checkAgreementSign', () => {
  it('GETs the sign-check endpoint and resolves with needs_sign/template', async () => {
    server.use(
      http.get('*/common/agreement-sign/check', () =>
        HttpResponse.json({
          status: true,
          message: 'ok',
          data: { needs_sign: true, template: { id: 1, slug: 'borrower', template_html: '<p/>' } },
        })
      )
    )

    const result = await checkAgreementSign()
    expect(result.data?.needs_sign).toBe(true)
  })
})

describe('submitAgreementSign', () => {
  it('POSTs the sign payload', async () => {
    let receivedBody: any = null
    server.use(
      http.post('*/common/agreement-sign/submit', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, message: 'Signed', data: null })
      })
    )

    await submitAgreementSign({ agreement_template_id: 1, content_html: '<p>signed</p>' })
    expect(receivedBody).toEqual({ agreement_template_id: 1, content_html: '<p>signed</p>' })
  })
})

describe('downloadAgreementSign', () => {
  it('GETs the plain download URL when no userId is given', async () => {
    let hitUrl = ''
    server.use(
      http.get('*/common/agreement-sign/download', ({ request }) => {
        hitUrl = new URL(request.url).pathname
        return new HttpResponse('pdf-bytes')
      })
    )

    await downloadAgreementSign()
    expect(hitUrl).toContain('/common/agreement-sign/download')
  })

  it('GETs /download/:userId when a userId is given', async () => {
    let hitUrl = ''
    server.use(
      http.get('*/common/agreement-sign/download/12', ({ request }) => {
        hitUrl = new URL(request.url).pathname
        return new HttpResponse('pdf-bytes')
      })
    )

    await downloadAgreementSign(12)
    expect(hitUrl).toContain('/common/agreement-sign/download/12')
  })
})

describe('fetchSignedAgreementHtml', () => {
  it('GETs /html/:userId when userId is given and resolves the content_html', async () => {
    server.use(
      http.get('*/common/agreement-sign/html/8', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { content_html: '<p>signed html</p>' } })
      )
    )

    const result = await fetchSignedAgreementHtml(8)
    expect(result.data?.content_html).toBe('<p>signed html</p>')
  })
})

describe('cancelAgreementSign', () => {
  it('POSTs /cancel/:userId when userId is given', async () => {
    let hitUrl = ''
    server.use(
      http.post('*/common/agreement-sign/cancel/4', ({ request }) => {
        hitUrl = new URL(request.url).pathname
        return HttpResponse.json({ status: true, message: 'Cancelled', data: null })
      })
    )

    await cancelAgreementSign(4)
    expect(hitUrl).toContain('/common/agreement-sign/cancel/4')
  })

  it('POSTs the plain /cancel URL when no userId is given', async () => {
    let hitUrl = ''
    server.use(
      http.post('*/common/agreement-sign/cancel', ({ request }) => {
        hitUrl = new URL(request.url).pathname
        return HttpResponse.json({ status: true, message: 'Cancelled', data: null })
      })
    )

    await cancelAgreementSign()
    expect(hitUrl).toContain('/common/agreement-sign/cancel')
  })
})

// Partner profile › Configuration › Agreement: the host names the partner
// whose agreements these are; without one, the signed-in user's own.
describe('naming another partner (partner_id)', () => {
  it('lists, opens, saves and toggles that partner\'s templates', async () => {
    const seen: Record<string, unknown> = {}
    server.use(
      http.get('*/common/agreement-templates', ({ request }) => {
        seen.list = new URL(request.url).searchParams.get('partner_id')
        return HttpResponse.json({ status: true, data: [] })
      }),
      http.post('*/common/agreement-templates/show', async ({ request }) => {
        seen.show = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1, slug: 'borrower' } })
      }),
      http.post('*/common/agreement-templates/save', async ({ request }) => {
        seen.save = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1, slug: 'borrower' } })
      }),
      http.post('*/common/agreement-templates/update-status/1', async ({ request }) => {
        seen.status = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1, slug: 'borrower' } })
      })
    )

    await fetchAgreements(42)
    await fetchAgreement('borrower', 42)
    await saveAgreement({ slug: 'borrower', template_html: '<p/>' }, 42)
    await toggleAgreementStatus({ id: 1, slug: 'borrower', is_active: false }, 42)

    expect(seen.list).toBe('42')
    expect(seen.show).toEqual({ slug: 'borrower', partner_id: 42 })
    expect(seen.save).toMatchObject({ slug: 'borrower', partner_id: 42 })
    expect(seen.status).toMatchObject({ is_active: false, partner_id: 42 })
  })

  it('sends no partner_id for the user\'s own templates', async () => {
    let listParam: string | null = 'unset'
    let showBody: any = null
    server.use(
      http.get('*/common/agreement-templates', ({ request }) => {
        listParam = new URL(request.url).searchParams.get('partner_id')
        return HttpResponse.json({ status: true, data: [] })
      }),
      http.post('*/common/agreement-templates/show', async ({ request }) => {
        showBody = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1, slug: 'borrower' } })
      })
    )

    await fetchAgreements()
    await fetchAgreement('borrower')

    expect(listParam).toBeNull()
    expect(showBody).toEqual({ slug: 'borrower' })
  })
})

describe('fetchAgreementPreviewValues', () => {
  it('POSTs for the merge values of the template owner, naming the configured partner, and resolves with them', async () => {
    let body: unknown = null
    server.use(
      http.post('*/common/agreement-templates/preview-values', async ({ request }) => {
        body = await request.json().catch(() => null)
        return HttpResponse.json({ status: true, message: 'ok', data: { 'owner.company_name': 'Acme Lending', today: '10/30/2026' } })
      })
    )

    const result = await fetchAgreementPreviewValues(7)

    expect(body).toEqual({ partner_id: 7 })
    expect(result).toEqual({ 'owner.company_name': 'Acme Lending', today: '10/30/2026' })
  })
})
