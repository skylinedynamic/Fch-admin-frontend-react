import { afterEach, describe, expect, it } from 'vitest'

import { clearStrayModalBackdrops } from '../../src/utils/modalBackdrop'

/**
 * The guard that keeps one modal's cleanup from deleting another's overlay.
 *
 * ProfileCompleteCheckModal is mounted globally, so its backdrop is in the
 * document on every page. Screens that swept up leftover backdrops took it with
 * them, and the profile modal was left sitting over a page that was not dimmed.
 */
function addBackdrop(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'modal-backdrop fade show'
  document.body.appendChild(el)
  return el
}

function addOpenModal(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'modal fade show'
  document.body.appendChild(el)
  return el
}

describe('clearStrayModalBackdrops', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.body.className = ''
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })

  it('removes a backdrop left behind with no modal on screen', () => {
    addBackdrop()
    document.body.classList.add('modal-open')
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = '17px'

    clearStrayModalBackdrops()

    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(0)
    expect(document.body.classList.contains('modal-open')).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(document.body.style.paddingRight).toBe('')
  })

  it('leaves the backdrop alone while a modal is still shown', () => {
    // The case that broke the profile modal: its overlay is a backdrop, and it
    // is not stray - it belongs to the modal open right next to it.
    addOpenModal()
    addBackdrop()
    document.body.classList.add('modal-open')

    clearStrayModalBackdrops()

    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(1)
    expect(document.body.classList.contains('modal-open')).toBe(true)
  })

  it('does not touch body scroll state while a modal is shown', () => {
    // Removing modal-open here would let the page behind scroll under the modal.
    addOpenModal()
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = '17px'

    clearStrayModalBackdrops()

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('17px')
  })

  it('is safe to call when there is nothing to clean up', () => {
    expect(() => clearStrayModalBackdrops()).not.toThrow()
    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(0)
  })

  it('clears several stray backdrops at once', () => {
    // Reopening a modal mid-transition can stack them.
    addBackdrop()
    addBackdrop()

    clearStrayModalBackdrops()

    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(0)
  })
})
