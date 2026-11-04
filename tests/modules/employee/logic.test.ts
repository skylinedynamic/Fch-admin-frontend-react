import { describe, it, expect } from 'vitest'
import { formDataValue } from '../../../src/modules/employee/logic'

/**
 * Defect: R2 BUG-029 - an employee created with a login was stored with job
 * status "[object Object]": the form appended a value as it was, so an object
 * (an option instead of its value) was sent as its string form. The list
 * showed it and the Status filter never matched it.
 */
describe('formDataValue', () => {
    it('sends a picked option as its value, never "[object Object]"', () => {
        expect(formDataValue({ label: 'Active', value: 'Active' })).toBe('Active')
    })

    it('keeps text and numbers as they are', () => {
        expect(formDataValue('Inactive')).toBe('Inactive')
        expect(formDataValue(42)).toBe('42')
    })

    it('keeps a file', () => {
        const file = new File(['x'], 'photo.png', { type: 'image/png' })
        expect(formDataValue(file)).toBe(file)
    })

    it('leaves out any other object rather than sending its string form', () => {
        expect(formDataValue({ id: 3, name: 'Wanda' })).toBeNull()
        expect(formDataValue(['a', 'b'])).toBeNull()
        expect(formDataValue({ label: 'Nested', value: { deep: true } })).toBeNull()
    })

    it('leaves out nothing-values', () => {
        expect(formDataValue(null)).toBeNull()
        expect(formDataValue(undefined)).toBeNull()
    })
})
