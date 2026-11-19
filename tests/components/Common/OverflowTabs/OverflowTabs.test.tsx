import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@testing-library/react'
import OverflowTabs, { type OverflowTab } from '../../../../src/components/Common/OverflowTabs'

/**
 * A page's tabs on one line; the ones that do not fit go into a More dropdown.
 * jsdom has no layout, so each test gives the elements their widths: the line
 * (`.overflow-tabs`), each tab (`data-tab-key`) and More (`data-more`).
 */
const TABS: OverflowTab[] = [
  { key: 'info', label: 'Partner information' },
  { key: 'docs', label: 'Documents' },
  { key: 'clients', label: 'Client List' },
  { key: 'mail', label: 'Mail Notification' },
  { key: 'off', label: 'Agreement', disabled: true },
]

/** Every tab 100px wide, More 80px, the line `line` px. */
const layout = (line: number) => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const width = this.classList.contains('overflow-tabs')
      ? line
      : this.dataset.tabKey
        ? 100
        : this.dataset.more !== undefined
          ? 80
          : 0
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  })
}

function Harness({ initial = 'info' }: { initial?: string }) {
  const [active, setActive] = useState(initial)
  return <OverflowTabs tabs={TABS} activeKey={active} onSelect={setActive} ariaLabel="Partner sections" />
}

const tablist = () => within(screen.getByRole('tablist', { name: 'Partner sections' }))
const moreButton = () => screen.queryByRole('button', { name: /More/ })

afterEach(() => vi.restoreAllMocks())

describe('OverflowTabs', () => {
  it('shows every tab on the line when they fit, with no More button', () => {
    layout(1000)
    render(<Harness />)

    expect(tablist().getAllByRole('tab').map((t) => t.textContent)).toEqual(['Partner information', 'Documents', 'Client List', 'Mail Notification', 'Agreement'])
    expect(moreButton()).not.toBeInTheDocument()
  })

  it('puts the tabs that do not fit into More, which lists them when opened', async () => {
    layout(300)
    render(<Harness />)

    expect(tablist().getAllByRole('tab').map((t) => t.textContent)).toEqual(['Partner information', 'Documents'])
    expect(moreButton()).toHaveAccessibleName('More (3 more tabs)')
    expect(moreButton()).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(moreButton()!)

    const menu = within(screen.getByRole('menu'))
    expect(moreButton()).toHaveAttribute('aria-expanded', 'true')
    expect(menu.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Client List', 'Mail Notification', 'Agreement'])
    expect(menu.getByRole('menuitem', { name: 'Agreement' })).toBeDisabled()
  })

  it('opens a tab picked from More and brings it onto the line', async () => {
    layout(300)
    render(<Harness />)

    await userEvent.click(moreButton()!)
    await userEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Mail Notification' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(tablist().getByRole('tab', { name: 'Mail Notification' })).toHaveAttribute('aria-selected', 'true')
    expect(tablist().getAllByRole('tab').map((t) => t.textContent)).toEqual(['Partner information', 'Mail Notification'])
  })

  it('starts with an open tab that is far down the list on the line', () => {
    layout(300)
    render(<Harness initial="mail" />)

    expect(tablist().getByRole('tab', { name: 'Mail Notification' })).toHaveAttribute('aria-selected', 'true')
  })

  it('closes More on Escape and on a click outside it', async () => {
    layout(300)
    render(<><Harness /><p>Elsewhere</p></>)

    await userEvent.click(moreButton()!)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await userEvent.click(moreButton()!)
    await userEvent.click(screen.getByText('Elsewhere'))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('does not open a disabled tab', async () => {
    layout(1000)
    const onSelect = vi.fn()
    render(<OverflowTabs tabs={TABS} activeKey="info" onSelect={onSelect} ariaLabel="Partner sections" />)

    await userEvent.click(tablist().getByRole('tab', { name: 'Agreement' }))

    expect(onSelect).not.toHaveBeenCalled()
    expect(tablist().getByRole('tab', { name: 'Agreement' })).toHaveAttribute('aria-disabled', 'true')
  })
})
