import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { ownerSummaryResponse } from '../../mocks/ownerSummary'
import OwnerSummary from '../../../src/pages/owner-summary/OwnerSummary'
import { useAuthStore } from '../../../src/store/auth'
import { OWNER_SUMMARY_PERMISSION } from '../../../src/config/ownerSummary'

// Business Insights › Export PDF: a menu with the summary report and the
// details report, each downloaded from the API for the period and payments
// on screen (it used to print the page).

const download = vi.hoisted(() => ({ downloadBlob: vi.fn() }))
vi.mock('../../../src/utils/fileDownload', async (original) => ({
  ...(await original<typeof import('../../../src/utils/fileDownload')>()),
  downloadBlob: download.downloadBlob,
}))

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn() }) }
})
import { toast } from 'react-toastify'

let exports: URLSearchParams[] = []

beforeEach(() => {
  exports = []
  download.downloadBlob.mockReset()
  vi.mocked(toast.error).mockReset()
  useAuthStore.setState({ token: 't', user: { id: 1, name: 'Olive Owner', is_host: 1, entity_type: 'Partner', permissions: [OWNER_SUMMARY_PERMISSION.VIEW, OWNER_SUMMARY_PERMISSION.EXPORT] } } as never)
  server.use(
    http.get('*/common/owner-summary', () => HttpResponse.json(ownerSummaryResponse())),
    http.get('*/common/owner-summary/export', ({ request }) => {
      const query = new URL(request.url).searchParams
      exports.push(query)
      return new HttpResponse(new Blob(['%PDF-1.7']), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=business-insights-${query.get('type')}-2026-11-01-to-2026-11-30.pdf`,
        },
      })
    })
  )
})

afterEach(() => server.resetHandlers())

const renderPage = async () => {
  renderWithProviders(<OwnerSummary />, { route: '/owner-summary' })
  await screen.findByTestId('owner-kpis')
}

const openMenu = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Export PDF' }))
  return screen.findByRole('menu', { name: 'Export PDF' })
}

describe('Business Insights › Export PDF', () => {
  it('offers the summary report and the details report, each saying what it holds', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    await renderPage()

    const menu = within(await openMenu())

    expect(menu.getByRole('menuitem', { name: /Summary report/ })).toHaveTextContent('One page')
    expect(menu.getByRole('menuitem', { name: /Details report/ })).toHaveTextContent('Every section in full')
    expect(print).not.toHaveBeenCalled()
    print.mockRestore()
  })

  it('downloads the summary report for the period and payments on screen', async () => {
    await renderPage()

    await userEvent.click(within(await openMenu()).getByRole('menuitem', { name: /Summary report/ }))

    await waitFor(() => expect(download.downloadBlob).toHaveBeenCalledTimes(1))
    expect(exports[0].get('type')).toBe('summary')
    expect(exports[0].get('period')).toBe('this_month')
    expect(exports[0].get('environment')).toBe('production')
    expect(download.downloadBlob.mock.calls[0][1]).toBe('business-insights-summary-2026-11-01-to-2026-11-30.pdf')
    expect(screen.queryByRole('menu', { name: 'Export PDF' })).not.toBeInTheDocument()
  })

  it('downloads the details report for the period and payments chosen', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'This week' }))
    await userEvent.click(screen.getByRole('button', { name: 'All Payment' }))

    await userEvent.click(within(await openMenu()).getByRole('menuitem', { name: /Details report/ }))

    await waitFor(() => expect(download.downloadBlob).toHaveBeenCalledTimes(1))
    expect(exports[0].get('type')).toBe('details')
    expect(exports[0].get('period')).toBe('this_week')
    expect(exports[0].get('environment')).toBe('all')
  })

  it('says so when the report could not be made, and leaves the button usable', async () => {
    server.use(http.get('*/common/owner-summary/export', () => HttpResponse.json({ message: 'Server Error' }, { status: 500 })))
    await renderPage()

    await userEvent.click(within(await openMenu()).getByRole('menuitem', { name: /Summary report/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('The report could not be made. Please try again.'))
    expect(download.downloadBlob).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Export PDF' })).toBeEnabled()
  })

  it('closes the menu on Escape without exporting', async () => {
    await renderPage()
    await openMenu()

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('menu', { name: 'Export PDF' })).not.toBeInTheDocument())
    expect(exports).toHaveLength(0)
  })
})
