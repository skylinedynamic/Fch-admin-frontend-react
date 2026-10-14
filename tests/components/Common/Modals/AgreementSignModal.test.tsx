import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import AgreementSignModal from '../../../../src/components/Common/Modals/AgreementSignModal'

const TEMPLATE_HTML = '<!DOCTYPE html><html><head></head><body><form id="agreement-form"><input class="flatpickr"/></form></body></html>'

afterEach(() => useAuthStore.setState({ user: null } as any))

describe('AgreementSignModal calendar', () => {
  it('the agreement opens the app calendar in its date fields', async () => {
    useAuthStore.setState({ user: { id: 1, is_agreement_signed: false } } as any)
    server.use(
      http.get('*/common/agreement-sign/check', () =>
        HttpResponse.json({ status: true, data: { needs_sign: true, template: { id: 7, template_html: TEMPLATE_HTML } } }),
      ),
    )

    renderWithProviders(<AgreementSignModal />)

    const frame = await screen.findByTitle('Agreement Content')
    expect(frame.getAttribute('srcdoc')).toContain('<form id="agreement-form">')
    expect(frame.getAttribute('srcdoc')).toContain('data-app-calendar')
  })
})
