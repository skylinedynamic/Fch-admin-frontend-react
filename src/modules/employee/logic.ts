/**
 * What the employee form puts in its FormData for one value. A value was
 * appended as it was, so an object - a dropdown option instead of its value -
 * was sent as "[object Object]" and stored as the employee's job status
 * (R2 BUG-029). An option is sent as its value; any other object is left out.
 */
export function formDataValue(value: unknown): string | Blob | null {
    if (value === null || value === undefined) return null
    if (value instanceof Blob) return value
    if (typeof value !== 'object') return String(value)

    if (!Array.isArray(value) && 'value' in value) {
        const inner = (value as { value: unknown }).value
        if (inner !== null && inner !== undefined && typeof inner !== 'object') return String(inner)
    }

    return null
}
