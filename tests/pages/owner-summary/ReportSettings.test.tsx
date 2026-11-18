import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-toastify'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { ownerSummaryResponse } from '../../mocks/ownerSummary'
import OwnerSummary from '../../../src/pages/owner-summary/OwnerSummary'
import { useAuthStore } from '../../../src/store/auth'
import { OWNER_SUMMARY_PERMISSION } from '../../../src/config/ownerSummary'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const URL = '*/common/owner-summary/report-settings'

let saved: unknown[] = []

const settingsAre = (enabled: boolean, recipients: string[]) =>
  server.use(http.get(URL, () => HttpResponse.json({ status: true, message: 'ok', data: { enabled, recipients } })))

beforeEach(() => {
  saved = []
  // Report settings shows to whoever may manage the weekly report.
  useAuthStore.setState({ user: { id: 1, name: 'Dev Eloper', is_host: 1, entity_type: 'Employee', permissions: [OWNER_SUMMARY_PERMISSION.VIEW, OWNER_SUMMARY_PERMISSION.MANAGE_REPORT] } } as never)
  server.use(
    http.get('*/common/owner-summary', () => HttpResponse.json(ownerSummaryResponse())),
    http.put(URL, async ({ request }) => {
      const body = await request.json()
      saved.push(body)
      return HttpResponse.json({ status: true, message: 'Report settings saved', data: body })
    })
  )
  vi.mocked(toast.success).mockClear()
})

afterEach(() => server.resetHandlers())

const openSettings = async () => {
  renderWithProviders(<OwnerSummary />, { route: '/owner-summary' })
  await screen.findByTestId('owner-kpis')
  await userEvent.click(screen.getByRole('button', { name: 'Report settings' }))
  return within(await screen.findByRole('dialog', { name: 'Report settings' }))
}

describe('Report settings', () => {
  it('asks for the settings only when opened', async () => {
    let asked = 0
    server.use(http.get(URL, () => {
      asked += 1
      return HttpResponse.json({ status: true, message: 'ok', data: { enabled: false, recipients: [] } })
    }))
    renderWithProviders(<OwnerSummary />, { route: '/owner-summary' })
    await screen.findByTestId('owner-kpis')
    expect(asked).toBe(0)

    await userEvent.click(screen.getByRole('button', { name: 'Report settings' }))

    await waitFor(() => expect(asked).toBe(1))
  })

  it('shows what is saved and says when the report goes out', async () => {
    settingsAre(true, ['owner@example.test', 'finance@example.test'])
    const dialog = await openSettings()

    expect(await dialog.findByRole('checkbox', { name: /send the weekly report/i })).toBeChecked()
    expect(dialog.getByText(/sundays at 10:00 am et, last week's numbers, pdf attached/i)).toBeInTheDocument()
    expect(dialog.getByRole('textbox', { name: 'Recipient 1' })).toHaveValue('owner@example.test')
    expect(dialog.getByRole('textbox', { name: 'Recipient 2' })).toHaveValue('finance@example.test')
    expect(dialog.getByText('Up to 10 addresses.')).toBeInTheDocument()
  })

  it('starts off with one empty address', async () => {
    settingsAre(false, [])
    const dialog = await openSettings()

    expect(await dialog.findByRole('checkbox', { name: /send the weekly report/i })).not.toBeChecked()
    expect(dialog.getByRole('textbox', { name: 'Recipient 1' })).toHaveValue('')
    expect(dialog.queryByRole('button', { name: 'Remove recipient 1' })).not.toBeInTheDocument()
  })

  it('saves the choice and the addresses, leaving out empty rows, then closes', async () => {
    settingsAre(false, [])
    const dialog = await openSettings()

    await userEvent.click(await dialog.findByRole('checkbox', { name: /send the weekly report/i }))
    await userEvent.type(dialog.getByRole('textbox', { name: 'Recipient 1' }), 'owner@example.test')
    await userEvent.click(dialog.getByRole('button', { name: '+ Add recipient' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Save settings' }))

    await waitFor(() => expect(saved).toEqual([{ enabled: true, recipients: ['owner@example.test'] }]))
    expect(toast.success).toHaveBeenCalledWith('Report settings saved')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Report settings' })).not.toBeInTheDocument())
  })

  it('removes an address', async () => {
    settingsAre(true, ['owner@example.test', 'finance@example.test'])
    const dialog = await openSettings()

    await userEvent.click(await dialog.findByRole('button', { name: 'Remove recipient 1' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Save settings' }))

    await waitFor(() => expect(saved).toEqual([{ enabled: true, recipients: ['finance@example.test'] }]))
  })

  it('stops offering more rows at ten addresses', async () => {
    settingsAre(true, Array.from({ length: 10 }, (_, i) => `person${i}@example.test`))
    const dialog = await openSettings()

    expect(await dialog.findByRole('button', { name: '+ Add recipient' })).toBeDisabled()
  })

  it('shows a refused address under its own field, keeps the dialog open and sends no toast', async () => {
    settingsAre(true, ['owner@example.test', 'finance@fourcornerfunding'])
    server.use(http.put(URL, () => HttpResponse.json(
      { message: 'Enter a valid email address.', errors: { 'recipients.1': ['Enter a valid email address.'] } },
      { status: 422 }
    )))
    const dialog = await openSettings()

    await userEvent.click(await dialog.findByRole('button', { name: 'Save settings' }))

    const message = await dialog.findByText('Enter a valid email address.')
    expect(message.closest('[data-recipient="1"]')).not.toBeNull()
    expect(dialog.getByRole('textbox', { name: 'Recipient 2' })).toHaveAttribute('aria-invalid', 'true')
    expect(dialog.getByRole('textbox', { name: 'Recipient 1' })).toHaveAttribute('aria-invalid', 'false')
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('shows a problem with the whole list under Recipients', async () => {
    settingsAre(false, [])
    server.use(http.put(URL, () => HttpResponse.json(
      { status: false, message: 'x', errors: { recipients: 'Add at least one address to send the report to.' } },
      { status: 422 }
    )))
    const dialog = await openSettings()

    await userEvent.click(await dialog.findByRole('checkbox', { name: /send the weekly report/i }))
    await userEvent.click(dialog.getByRole('button', { name: 'Save settings' }))

    expect(await dialog.findByText('Add at least one address to send the report to.')).toBeInTheDocument()
  })

  it('drops an error once that address is edited', async () => {
    settingsAre(true, ['bad@nowhere'])
    server.use(http.put(URL, () => HttpResponse.json(
      { message: 'x', errors: { 'recipients.0': ['Enter a valid email address.'] } },
      { status: 422 }
    )))
    const dialog = await openSettings()
    await userEvent.click(await dialog.findByRole('button', { name: 'Save settings' }))
    await dialog.findByText('Enter a valid email address.')

    await userEvent.type(dialog.getByRole('textbox', { name: 'Recipient 1' }), 'x')

    expect(dialog.queryByText('Enter a valid email address.')).not.toBeInTheDocument()
  })

  it('Cancel closes without saving, and reopening shows what is saved', async () => {
    settingsAre(true, ['owner@example.test'])
    const dialog = await openSettings()

    await userEvent.clear(await dialog.findByRole('textbox', { name: 'Recipient 1' }))
    await userEvent.type(dialog.getByRole('textbox', { name: 'Recipient 1' }), 'changed@example.test')
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Report settings' })).not.toBeInTheDocument())
    expect(saved).toEqual([])

    await userEvent.click(screen.getByRole('button', { name: 'Report settings' }))
    const reopened = within(await screen.findByRole('dialog', { name: 'Report settings' }))
    expect(await reopened.findByRole('textbox', { name: 'Recipient 1' })).toHaveValue('owner@example.test')
  })

  it('says so when the settings cannot be loaded', async () => {
    server.use(http.get(URL, () => HttpResponse.json({ message: 'x' }, { status: 500 })))
    const dialog = await openSettings()

    expect(await dialog.findByText(/report settings could not be loaded/i)).toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: 'Save settings' })).not.toBeInTheDocument()
  })
})
