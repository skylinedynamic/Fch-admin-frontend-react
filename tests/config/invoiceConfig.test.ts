import { describe, expect, it } from 'vitest'
import {
    INVOICE_STATUS_COLORS,
    INVOICE_STATUS_OPTIONS,
    STATUS_CANCELED,
    STATUS_EXPIRED,
} from '../../src/config/invoiceConfig'

/**
 * Defect (BUG-021 round 2, R2-OP-INV-05): the Invoices Status filter offered
 * "Overdue", which no invoice ever gets - an unpaid invoice locks the profile
 * instead, and paying late starts the next month from the payment date. It had
 * no "Expired", which older invoices carry, and spelt "Cancelled" while the API
 * stores "Canceled". The options must be the statuses fch-api's Invoice model
 * stores.
 */
describe('invoice status options', () => {
    const values = INVOICE_STATUS_OPTIONS.map((option) => option.value)

    it('does not offer Overdue', () => {
        expect(values).not.toContain('Overdue')
    })

    it('offers Expired', () => {
        expect(STATUS_EXPIRED).toBe('Expired')
        expect(values).toContain(STATUS_EXPIRED)
    })

    it('spells Canceled the way the API stores it', () => {
        expect(STATUS_CANCELED).toBe('Canceled')
        expect(values).toContain(STATUS_CANCELED)
        expect(values).not.toContain('Cancelled')
    })

    it('gives Expired and Canceled a badge colour', () => {
        expect(INVOICE_STATUS_COLORS[STATUS_EXPIRED]).toBeTruthy()
        expect(INVOICE_STATUS_COLORS[STATUS_CANCELED]).toBeTruthy()
        expect(INVOICE_STATUS_COLORS).not.toHaveProperty('Overdue')
    })
})
