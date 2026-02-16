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
        const selector = `[name="${firstErrorKey}"], #${firstErrorKey}, [inputid="${firstErrorKey}"]`;
        const errorElement = document.querySelector(selector);
        
        if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};
