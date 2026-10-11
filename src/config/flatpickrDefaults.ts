import flatpickr from 'flatpickr'

/**
 * Defaults for every Flatpickr picker in the app.
 *
 * On a phone or tablet Flatpickr normally swaps its calendar for the browser's
 * native date input, so a touch device got a different calendar from the
 * desktop one - without the month/year dropdowns, in the browser's colours.
 * With disableMobile every device gets the app's calendar. A picker may still
 * pass its own disableMobile to override this.
 *
 * The borrower (client-fch) and partner (Fch-admin-frontend-react) portals
 * carry identical copies of this file; keep the two in sync.
 */
export const applyFlatpickrDefaults = () => {
  flatpickr.setDefaults({ disableMobile: true })
}
