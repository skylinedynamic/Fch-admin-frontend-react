import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, renderWithProviders, screen, waitFor } from '../../../../test-utils'
import { server } from '../../../../mocks/server'
import AgreementBuilder from '../../../../../src/pages/settings/components/AgreementBuilder'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// The dashboard (agreement list, settings) is not what is under test here:
// it only has to open the builder.
vi.mock('../../../../../src/pages/settings/components/AgreementBuilder/AgreementDashboard', () => ({
  AgreementDashboard: ({ onEdit }: { onEdit: (t: 'partner') => void }) => (
    <button onClick={() => onEdit('partner')}>Edit partner agreement</button>
  ),
}))

const openBuilder = async () => {
  server.use(
    http.post('*/common/agreement-templates/show', () => HttpResponse.json({ status: true, data: null })),
  )
  renderWithProviders(<AgreementBuilder />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit partner agreement' }))
  await screen.findByRole('button', { name: 'Save Template' })
}

describe('AgreementBuilder calendar', () => {
  it('the preview opens the app calendar in the agreement date fields', async () => {
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    const frame = await screen.findByTitle('Preview')
    expect(frame.getAttribute('srcdoc')).toContain('data-app-calendar')
  })

  it('saves the agreement itself, without the preview calendar script', async () => {
    let saved: Record<string, string> | null = null
    server.use(
      http.post('*/common/agreement-templates/save', async ({ request }) => {
        saved = (await request.json()) as Record<string, string>
        return HttpResponse.json({ status: true, message: 'Saved' })
      }),
    )
    await openBuilder()

    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }))

    await waitFor(() => expect(saved).not.toBeNull())
    expect(saved!.template_html).toContain('agreement-form')
    expect(saved!.template_html).not.toContain('data-app-calendar')
  })
})
