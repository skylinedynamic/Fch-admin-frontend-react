import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, renderWithProviders, screen } from '../../test-utils'
import ErrorPage from '../../../src/pages/Utility/ErrorPage'

describe('ErrorPage', () => {
  it.each([
    [403, 'Access Denied', 'Sorry, you do not have permission to access this page.'],
    [404, 'Page Not Found', 'The page you are looking for does not exist or has been moved.'],
    [500, 'Internal Server Error', 'Something went wrong on our end. Please try again later.'],
  ] as const)('shows the default title and message for %i', (status, title, message) => {
    renderWithProviders(<ErrorPage status={status} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(String(status))
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(title)
    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('defaults to 404', () => {
    renderWithProviders(<ErrorPage />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('404')
  })

  it('lets a page override the title and message', () => {
    renderWithProviders(<ErrorPage status={404} title="Payment Not Found" message="That payment does not exist." />)

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Payment Not Found')
    expect(screen.getByText('That payment does not exist.')).toBeInTheDocument()
  })

  it('links back to the dashboard', () => {
    renderWithProviders(<ErrorPage status={403} />)

    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/')
  })

  it('Back returns to the previous page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/clients', '/access-denied']} initialIndex={1}>
        <Routes>
          <Route path="/clients" element={<div>Clients page</div>} />
          <Route path="/access-denied" element={<ErrorPage status={403} />} />
        </Routes>
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(await screen.findByText('Clients page')).toBeInTheDocument()
  })
})
