/**
 * Scrolls to the first element with a validation error.
 * Matches by name, id, or inputid (for PrimeReact components).
 * 
 * @param errors - An object containing field validation errors
 */
export const scrollToFirstError = (errors: Record<string, any>) => {
    if (!errors || Object.keys(errors).length === 0) return;

    // Use a small timeout to ensure data has been rendered/classes applied
    setTimeout(() => {
        const firstErrorKey = Object.keys(errors)[0];
        const escapedKey = CSS.escape(firstErrorKey);
        const selector = `[name="${firstErrorKey}"], #${escapedKey}, [inputid="${firstErrorKey}"]`;
        const errorElement = document.querySelector(selector);
        
        if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

/**
 * The API's first validation message from a failed request, else its
 * message, else the fallback - so a refusal says why instead of "failed".
 */
export const apiErrorMessage = (error: any, fallback: string): string => {
    const data = error?.response?.data
    const first = data?.errors ? Object.values(data.errors)[0] : undefined
    const message = Array.isArray(first) ? first[0] : first

    if (typeof message === 'string' && message) return message
    if (typeof data?.message === 'string' && data.message && error?.response?.status === 422) return data.message
    return fallback
}
