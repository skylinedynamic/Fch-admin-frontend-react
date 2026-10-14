import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test-utils'
import BusinessFinancialsSection from '../../../../src/pages/clients/components/BusinessFinancialsSection'

describe('BusinessFinancialsSection', () => {
  it('the bank account open-date picker uses the shared month and year dropdowns', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BusinessFinancialsSection />)

    await user.click(screen.getByRole('button', { name: /Add Bank Account/i }))

    await waitFor(() => {
      expect(document.querySelector('.fp-yd-trigger[data-kind="year"]')).not.toBeNull()
      expect(document.querySelector('.fp-yd-trigger[data-kind="month"]')).not.toBeNull()
    })
  })
})
