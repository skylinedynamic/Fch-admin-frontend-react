import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, waitFor } from '@testing-library/react'
import EventTypeDropdown from '../../../src/components/Appointment/EventTypeDropdown'

const zoom = { uri: 'ET1', name: '30 Minute Meeting', duration: 30, locations: [{ kind: 'zoom_conference' }], asks_location: false }
const phone = { uri: 'ET2', name: 'Phone call', duration: 15, locations: [{ kind: 'outbound_call' }], asks_location: true }

/** As the form's other PrimeReact dropdowns: open it, click the panel item. */
async function pickEventType(container: ParentNode, option: string) {
  await userEvent.click(container.querySelector('.calendly-event-type-dropdown') as HTMLElement)
  const item = await waitFor(() => {
    const found = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find((el) => el.textContent?.trim().startsWith(option))
    if (!found) throw new Error(`no "${option}" option`)
    return found as HTMLElement
  })
  await userEvent.click(item)
}

describe('EventTypeDropdown (several Calendly event types: the form\'s own dropdown)', () => {
  it('shows the chosen event type with its length, like the form\'s other dropdowns', () => {
    const { container } = render(<EventTypeDropdown inputId="et" eventTypes={[zoom, phone]} value="ET1" onChange={vi.fn()} />)

    expect(container.querySelector('.p-dropdown.calendly-event-type-dropdown')).not.toBeNull()
    expect(container.querySelector('.p-dropdown-label')?.textContent).toBe('30 Minute Meeting (30 min)')
  })

  it('picks another one', async () => {
    const onChange = vi.fn()
    const { container } = render(<EventTypeDropdown eventTypes={[zoom, phone]} value="ET1" onChange={onChange} />)

    await pickEventType(container, 'Phone call')

    expect(onChange).toHaveBeenCalledWith('ET2')
  })
})
