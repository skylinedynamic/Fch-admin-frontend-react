/**
 * A synchronous stand-in for Bootstrap's Modal.
 *
 * The real class finishes show/hide in transition callbacks that fire after a
 * test has unmounted its component, and then throw against a ref that is gone
 * ("Cannot read properties of null (reading 'style')"). Page tests that open a
 * confirmation modal mock the module with this:
 *
 *   vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
 */
export default class FakeModal {
  private el: HTMLElement

  constructor(el: HTMLElement) {
    this.el = el
  }

  show() {
    this.el.classList.add('show')
    this.el.style.display = 'block'
    this.el.removeAttribute('aria-hidden')
    this.el.setAttribute('aria-modal', 'true')
  }

  hide() {
    this.el.classList.remove('show')
    this.el.style.display = 'none'
    this.el.setAttribute('aria-hidden', 'true')
    this.el.removeAttribute('aria-modal')
  }

  dispose() {}

  static getInstance() {
    return null
  }

  static getOrCreateInstance(el: HTMLElement) {
    return new FakeModal(el)
  }
}
