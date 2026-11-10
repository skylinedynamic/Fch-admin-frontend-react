import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import ClientFundingSequences from '../../../src/pages/clients/components/ClientFundingSequences'

afterEach(() => server.resetHandlers())

const withOption = (readiness_factors: unknown[]) =>
  server.use(
    http.get('*/common/funding-sequencings/client-funding-options/7', () =>
      HttpResponse.json({
        status: true,
        data: {
          groups: [{
            id: 1,
            name: 'Business Credit',
            sequencings: [{ id: 11, name: '0% Intro Business Cards', icon: 'card', icon_color: 'blue', amount_range: '$5,000 - $250,000', engine_status: 'Active', readiness_factors }],
          }],
          types: [],
        },
      })
    )
  )

/**
 * Defect (BUG-162 class): the client's Funding Sequence tab searched only from
 * the Filters button - Enter in "Search funding options..." did nothing. Enter
 * now applies the search together with the chosen category, as Filters does.
 */
describe('ClientFundingSequences — Enter applies the search and the category', () => {
  const serveOptions = () =>
    server.use(
      http.get('*/common/funding-sequencings/client-funding-options/7', () =>
        HttpResponse.json({
          status: true,
          data: {
            groups: [{
              id: 1,
              name: 'Funding Options',
              sequencings: [
                { id: 11, name: 'Premium Rewards Cards', funding_type_id: 1, amount_range: '$10,000 - $500,000', readiness_factors: [] },
                { id: 12, name: 'Business Credit Builder', funding_type_id: 1, amount_range: '$2,000 - $100,000', readiness_factors: [] },
                { id: 21, name: 'Premium Term Loan', funding_type_id: 2, amount_range: '$50,000 - $1,000,000', readiness_factors: [] },
              ],
            }],
            types: [{ id: 1, name: 'Business Credit Cards' }, { id: 2, name: 'Term Loans' }],
          },
        })
      )
    )

  const searchBox = () => screen.getByPlaceholderText('Search funding options...')

  const pickCategory = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await user.click(document.querySelector('.p-dropdown') as HTMLElement)
    const item = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown-item')).find((o) => o.textContent === name)
      expect(found).toBeTruthy()
      return found as HTMLElement
    })
    await user.click(item)
  }

  it('searches when Enter is pressed in the search box', async () => {
    serveOptions()
    const user = userEvent.setup()
    renderWithProviders(<ClientFundingSequences clientId="7" />)
    expect(await screen.findByText('Business Credit Builder')).toBeInTheDocument()

    await user.type(searchBox(), 'Premium{Enter}')

    expect(await screen.findByText('Premium Rewards Cards')).toBeInTheDocument()
    expect(screen.getByText('Premium Term Loan')).toBeInTheDocument()
    expect(screen.queryByText('Business Credit Builder')).not.toBeInTheDocument()
  })

  it('applies the chosen category with the search on Enter', async () => {
    serveOptions()
    const user = userEvent.setup()
    renderWithProviders(<ClientFundingSequences clientId="7" />)
    expect(await screen.findByText('Business Credit Builder')).toBeInTheDocument()

    await pickCategory(user, 'Term Loans')
    await user.type(searchBox(), 'Premium{Enter}')

    expect(await screen.findByText('Premium Term Loan')).toBeInTheDocument()
    expect(screen.queryByText('Premium Rewards Cards')).not.toBeInTheDocument()
    expect(screen.queryByText('Business Credit Builder')).not.toBeInTheDocument()
  })

  it('applies a chosen category on Enter with an empty search', async () => {
    serveOptions()
    const user = userEvent.setup()
    renderWithProviders(<ClientFundingSequences clientId="7" />)
    expect(await screen.findByText('Business Credit Builder')).toBeInTheDocument()

    await pickCategory(user, 'Term Loans')
    await user.type(searchBox(), '{Enter}')

    expect(await screen.findByText('Premium Term Loan')).toBeInTheDocument()
    expect(screen.queryByText('Business Credit Builder')).not.toBeInTheDocument()
    expect(screen.queryByText('Premium Rewards Cards')).not.toBeInTheDocument()
  })

  it('does not filter on other keys, only on Enter or Filters', async () => {
    serveOptions()
    const user = userEvent.setup()
    renderWithProviders(<ClientFundingSequences clientId="7" />)
    expect(await screen.findByText('Business Credit Builder')).toBeInTheDocument()

    await user.type(searchBox(), 'Premium')

    expect(screen.getByText('Business Credit Builder')).toBeInTheDocument()
  })

  it('shows "No funding options found" with Reset when Enter matches nothing, and Reset brings all back', async () => {
    serveOptions()
    const user = userEvent.setup()
    renderWithProviders(<ClientFundingSequences clientId="7" />)
    expect(await screen.findByText('Business Credit Builder')).toBeInTheDocument()

    await user.type(searchBox(), 'zzz-nothing{Enter}')

    expect(await screen.findByText('No funding options found')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset Filters' }))
    expect(await screen.findByText('Business Credit Builder')).toBeInTheDocument()
    expect(screen.getByText('Premium Term Loan')).toBeInTheDocument()
  })
})

/**
 * Defect: the "Failed Requirements" tooltip was always centred above its card
 * by CSS, inside the card list - a tall one ran over the filter bar and tabs
 * and out of the window. It is now drawn on top of the page (document.body),
 * placed where it fits (here: below a card near the top), and its arrow points
 * at the card.
 */
describe('ClientFundingSequences — tooltip placement', () => {
  afterEach(() => vi.restoreAllMocks())

  it('opens below a card near the top of the window, on top of the page, with the arrow on the card', async () => {
    withOption([
      { label: 'Revenue', status: 'Failed' },
      { label: 'Time in Business', status: 'Failed' },
    ])
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const rect = (top: number, left: number, width: number, height: number) =>
        ({ top, left, width, height, bottom: top + height, right: left + width, x: left, y: top, toJSON: () => ({}) }) as DOMRect
      if (this.classList.contains('funding-card')) return rect(100, 400, 290, 300)
      if (this.classList.contains('funding-missing-tooltip')) return rect(0, 0, 320, 300)
      return rect(0, 0, 0, 0)
    })
    renderWithProviders(<ClientFundingSequences clientId="7" />)

    await userEvent.hover(await screen.findByText('0% Intro Business Cards'))

    const tip = (await screen.findByText('Failed Requirements')).closest('.funding-missing-tooltip') as HTMLElement
    expect(tip.parentElement).toBe(document.body)
    await waitFor(() => expect(tip).toHaveAttribute('data-placement', 'bottom'))
    expect(tip.style.top).toBe('410px')
    expect(tip.style.left).toBe(`${400 + 145 - 160}px`)
    expect(tip.style.getPropertyValue('--tooltip-arrow-left')).toBe('160px')
  })

  /**
   * Defect: near the bottom of the window a tall tooltip fitted neither above
   * nor below its card, so it was cut short and scrolled. It opens beside the
   * card instead, in full, with its arrow on the card's middle.
   */
  it('opens beside a card near the bottom of the window, in full, without scrolling', async () => {
    withOption([
      { label: 'Revenue', status: 'Failed' },
      { label: 'Time in Business', status: 'Failed' },
    ])
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const rect = (top: number, left: number, width: number, height: number) =>
        ({ top, left, width, height, bottom: top + height, right: left + width, x: left, y: top, toJSON: () => ({}) }) as DOMRect
      // jsdom's window is 1024 x 768.
      if (this.classList.contains('funding-card')) return rect(500, 300, 290, 300)
      if (this.classList.contains('funding-missing-tooltip')) return rect(0, 0, 320, 520)
      return rect(0, 0, 0, 0)
    })
    renderWithProviders(<ClientFundingSequences clientId="7" />)

    await userEvent.hover(await screen.findByText('0% Intro Business Cards'))

    const tip = (await screen.findByText('Failed Requirements')).closest('.funding-missing-tooltip') as HTMLElement
    await waitFor(() => expect(tip).toHaveAttribute('data-placement', 'right'))
    expect(tip.style.left).toBe('600px')
    expect(tip.style.top).toBe('240px')
    expect(tip.style.getPropertyValue('--tooltip-arrow-top')).toBe('410px')
    expect((tip.querySelector('.funding-missing-tooltip-body') as HTMLElement).style.maxHeight).toBe('')
  })

  it('lines each requirement icon up with its text', async () => {
    withOption([{ label: 'Revenue', status: 'Failed' }])
    renderWithProviders(<ClientFundingSequences clientId="7" />)

    await userEvent.hover(await screen.findByText('0% Intro Business Cards'))

    const item = (await screen.findByText(/^Revenue:/)).closest('.funding-missing-tooltip-item') as HTMLElement
    const icon = item.querySelector('i') as HTMLElement
    // The icon sits in a box one text line high, centred in it - no hand-tuned margin.
    expect(icon).toHaveClass('funding-missing-tooltip-icon')
    expect(icon.style.marginTop).toBe('')
  })

  it('closes when the pointer leaves the card', async () => {
    withOption([{ label: 'Revenue', status: 'Failed' }])
    renderWithProviders(<ClientFundingSequences clientId="7" />)

    const name = await screen.findByText('0% Intro Business Cards')
    await userEvent.hover(name)
    expect(await screen.findByText('Failed Requirements')).toBeInTheDocument()
    await userEvent.unhover(name)

    await waitFor(() => expect(screen.queryByText('Failed Requirements')).not.toBeInTheDocument())
  })
})

/**
 * Defect: a client's failed Banking Activity read "Banking Activity: Missing /
 * Required: Uploaded" - neither why nor what to do. The API's reason and
 * requirement are shown instead.
 */
describe('ClientFundingSequences — Banking Activity reason', () => {
  it('says why Banking Activity failed and what is required', async () => {
    withOption([{
      label: 'Banking Activity',
      status: 'Failed',
      group: 'banking',
      borrower_value: 'Missing',
      required_value: 'Uploaded',
      reason_code: 'not_uploaded',
      reason: 'No Business Bank Statements uploaded yet.',
      requirement: 'Upload your Business Bank Statements on the Documents page.',
    }])
    renderWithProviders(<ClientFundingSequences clientId="7" />)

    await userEvent.hover(await screen.findByText('0% Intro Business Cards'))

    expect(await screen.findByText('Banking Activity: No Business Bank Statements uploaded yet.')).toBeInTheDocument()
    expect(screen.getByText('Required: Upload your Business Bank Statements on the Documents page.')).toBeInTheDocument()
    expect(screen.queryByText('Required: Uploaded')).not.toBeInTheDocument()
  })

  it('keeps the figures for a check with no reason', async () => {
    withOption([{ label: 'Minimum Monthly Deposits', status: 'Failed', borrower_value: 5000, required_value: 60000 }])
    renderWithProviders(<ClientFundingSequences clientId="7" />)

    await userEvent.hover(await screen.findByText('0% Intro Business Cards'))

    expect(await screen.findByText('Minimum Monthly Deposits: $5,000')).toBeInTheDocument()
    expect(screen.getByText('Required: $60,000')).toBeInTheDocument()
  })
})
