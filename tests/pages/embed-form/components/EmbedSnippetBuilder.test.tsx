import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { fireEvent, renderWithProviders, screen, within } from '../../../test-utils'
import EmbedSnippetBuilder from '../../../../src/pages/embed-form/components/EmbedSnippetBuilder'

/**
 * A partner fits the embed code to their own site: header, footer, background,
 * frame, height and corner radius. The code and the live preview follow every
 * change; the direct link is not part of this.
 */
const FORM = 'https://forms.fcf.test/form/pk_live_abc123'
const SCRIPT = 'https://forms.fcf.test/form/assets/embed.js'

const mount = (scriptUrl: string | null = SCRIPT) =>
  renderWithProviders(<EmbedSnippetBuilder directUrl={FORM} scriptUrl={scriptUrl} formTitle="Loan Application" />)

/** The admin's own dropdown (CustomDropdown), not a native select. */
const chooseBackground = async (user: ReturnType<typeof userEvent.setup>, option: RegExp) => {
  await user.click(screen.getByRole('button', { name: 'Background' }))
  await user.click(screen.getByRole('button', { name: option }))
}

const code = () => (screen.getByLabelText('Embed code') as HTMLTextAreaElement).value
const preview = () => screen.getByTitle('Embed preview') as HTMLIFrameElement

describe('EmbedSnippetBuilder', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('explains how to use the code, step by step', () => {
    mount()

    const guide = screen.getByRole('region', { name: /how to add the form to your website/i })
    const steps = within(within(guide).getByRole('list', { name: 'Steps' })).getAllByRole('listitem').map((step) => step.textContent)
    expect(steps).toHaveLength(4)
    expect(steps[0]).toMatch(/choose the look/i)
    expect(steps[1]).toMatch(/copy embed html/i)
    expect(steps[2]).toMatch(/paste/i)
    expect(steps[3]).toMatch(/allowed domains/i)
    // One general instruction for where to paste - no list of site builders.
    expect(within(guide).getByText(/an "HTML", "Code" or "Embed" block/i)).toBeInTheDocument()
    for (const platform of ['WordPress', 'Wix', 'Squarespace', 'Webflow', 'Shopify']) {
      expect(within(guide).queryByText(platform)).not.toBeInTheDocument()
    }
    // What usually goes wrong.
    expect(within(guide).getByText(/keep both lines/i)).toBeInTheDocument()
    expect(within(guide).getByText(/copy it again/i)).toBeInTheDocument()
  })

  it('the guide can be hidden and shown again', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('button', { name: /hide guide/i }))
    expect(screen.queryByRole('list', { name: 'Steps' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show guide/i }))
    expect(screen.getByRole('list', { name: 'Steps' })).toBeInTheDocument()
  })

  it('starts with the standard look and automatic height', () => {
    mount()

    expect(code()).toContain(`<iframe src="${FORM}" data-fch-embed`)
    expect(code()).toContain(`<script src="${SCRIPT}" async></script>`)
    expect(code()).toContain('title="Loan Application"')
    expect(preview()).toHaveAttribute('src', FORM)
  })

  it('turning parts off updates the code and the preview', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('checkbox', { name: /show header/i }))
    await user.click(screen.getByRole('checkbox', { name: /show footer/i }))
    await user.click(screen.getByRole('checkbox', { name: /card frame/i }))
    await chooseBackground(user, /^transparent/i)

    expect(code()).toContain(`src="${FORM}?header=0&amp;footer=0&amp;bg=transparent&amp;frame=0"`)
    expect(preview()).toHaveAttribute('src', `${FORM}?header=0&footer=0&bg=transparent&frame=0`)
  })

  it('a colour code can be given for the background', async () => {
    const user = userEvent.setup()
    mount()

    await chooseBackground(user, /^colour code$/i)
    const hex = screen.getByLabelText('Background colour code')
    await user.clear(hex)
    await user.type(hex, '#1A2B3C')

    expect(code()).toContain(`src="${FORM}?bg=1a2b3c"`)
    expect(preview()).toHaveAttribute('src', `${FORM}?bg=1a2b3c`)
    expect(screen.getByLabelText('Pick background colour')).toHaveValue('#1a2b3c')
  })

  it('an unreadable colour code is flagged and left out of the code', async () => {
    const user = userEvent.setup()
    mount()

    await chooseBackground(user, /^colour code$/i)
    const hex = screen.getByLabelText('Background colour code')
    await user.clear(hex)
    await user.type(hex, 'blue')

    expect(hex).toHaveClass('is-invalid')
    expect(screen.getByText(/six-digit colour code/i)).toBeInTheDocument()
    expect(code()).not.toContain('bg=')
  })

  it('a primary colour matches the form to the site', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('checkbox', { name: /use my site's primary colour/i }))
    const hex = screen.getByLabelText('Primary colour code')
    await user.clear(hex)
    await user.type(hex, '#2D9A96')

    expect(code()).toContain(`src="${FORM}?color=2d9a96"`)
    expect(preview()).toHaveAttribute('src', `${FORM}?color=2d9a96`)
    expect(screen.getByLabelText('Pick primary colour')).toHaveValue('#2d9a96')

    // Turned off again, the form keeps the brand colour.
    await user.click(screen.getByRole('checkbox', { name: /use my site's primary colour/i }))
    expect(code()).not.toContain('color=')
  })

  it('an unreadable primary colour is flagged and left out', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('checkbox', { name: /use my site's primary colour/i }))
    const hex = screen.getByLabelText('Primary colour code')
    await user.clear(hex)
    await user.type(hex, 'teal')

    expect(hex).toHaveClass('is-invalid')
    expect(code()).not.toContain('color=')
  })

  it('a fixed height drops the script and uses the height given', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('radio', { name: /fixed height/i }))
    const height = screen.getByLabelText('Height in pixels')
    await user.clear(height)
    await user.type(height, '950')

    expect(code()).toContain('height="950"')
    expect(code()).not.toContain('<script')
  })

  it('the background uses the admin dropdown, showing the chosen option', async () => {
    const user = userEvent.setup()
    mount()

    const toggle = screen.getByRole('button', { name: 'Background' })
    expect(toggle).toHaveClass('form-select')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(toggle).toHaveTextContent('Light grey')

    await chooseBackground(user, /^white$/i)

    expect(screen.getByRole('button', { name: 'Background' })).toHaveTextContent('White')
    expect(code()).toContain('?bg=white')
  })

  it('the corner radius goes into the code and the preview', () => {
    mount()

    fireEvent.change(screen.getByLabelText(/corner radius/i), { target: { value: '16' } })

    expect(code()).toContain('border-radius:16px')
    expect(preview().style.borderRadius).toBe('16px')
  })

  it('without the script address, offers only a fixed height', () => {
    mount(null)

    expect(screen.getByRole('radio', { name: /automatic height/i })).toBeDisabled()
    expect(code()).not.toContain('<script')
  })

  it('says the preview works here whatever Allowed Domains are listed', () => {
    // The form now always lets the admin panel frame it (fch-api frame-ancestors),
    // so the old "the preview stays blank" warning was wrong.
    mount()
    expect(screen.getByText(/the preview always works here/i)).toBeInTheDocument()
    expect(screen.queryByText(/preview stays blank/i)).not.toBeInTheDocument()
  })

  it('copies the current code', async () => {
    // user-event installs its own clipboard; watch that one.
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    mount()

    await user.click(screen.getByRole('checkbox', { name: /show header/i }))
    await user.click(screen.getByRole('button', { name: /copy embed html/i }))

    expect(writeText).toHaveBeenCalledWith(code())
    expect(await screen.findByRole('button', { name: /embed code copied/i })).toBeInTheDocument()
  })
})
