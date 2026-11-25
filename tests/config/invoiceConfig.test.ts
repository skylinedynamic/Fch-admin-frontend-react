import { describe, expect, it } from 'vitest'
import {
    INVOICE_STATUS_COLORS,
    STATUS_ALL,
    STATUS_CANCELED,
    STATUS_EXPIRED,
    invoiceStatusFilterOptions,
} from '../../src/config/invoiceConfig'

/**
 * Defect (BUG-021 round 2, R2-OP-INV-05): the Invoices Status filter offered
 * "Overdue", which no invoice ever gets - an unpaid invoice locks the profile
 * instead, and paying late starts the next month from the payment date. It had
 * no "Expired", which older invoices carry, and spelt "Cancelled" while the API
 * stores "Canceled". The options must be the statuses fch-api's Invoice model
 * stores.
 */
// R3-BUG-078: the options themselves now come from the API (status_options,
// fch-api Invoice::STATUSES); the portal adds "All Status" and keeps no list.
describe('invoice status options', () => {
    it('are "All Status" and then what the API sends', () => {
        const fromApi = [{ label: 'Paid', value: 'Paid' }, { label: STATUS_EXPIRED, value: STATUS_EXPIRED }]

        expect(invoiceStatusFilterOptions(fromApi)).toEqual([{ label: STATUS_ALL, value: null }, ...fromApi])
        expect(invoiceStatusFilterOptions()).toEqual([{ label: STATUS_ALL, value: null }])
    })

    it('spells Canceled the way the API stores it', () => {
        expect(STATUS_CANCELED).toBe('Canceled')
    })

    it('gives Expired and Canceled a badge colour', () => {
        expect(INVOICE_STATUS_COLORS[STATUS_EXPIRED]).toBeTruthy()
        expect(INVOICE_STATUS_COLORS[STATUS_CANCELED]).toBeTruthy()
        expect(INVOICE_STATUS_COLORS).not.toHaveProperty('Overdue')
    })
})
