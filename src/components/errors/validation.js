/**
 * Validates if a value is not empty.
 * @param {any} value - The value to check.
 * @param {string} fieldName - The name of the field for the error message.
 * @returns {string|null} - Error message or null if valid.
 */
export const validateRequired = (value, fieldName) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} is required.`;
    }
    return null;
};

/**
 * Validates an email address.
 * @param {string} email - The email to check.
 * @returns {string|null} - Error message or null if valid.
 */
export const validateEmail = (email) => {
    if (!email) return null; // Allow empty if not required (use validateRequired for that)
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
        return "Please enter a valid email address.";
    }
    return null;
};

/**
 * Validates a phone number (basic check).
 * @param {string} phone - The phone number to check.
 * @returns {string|null} - Error message or null if valid.
 */
export const validatePhone = (value) => {
  if (!value) return "Phone number is required";

  // Remove spaces, dashes, parentheses
  const cleaned = value.replace(/\D/g, '');

  // US & Canada numbers must be 10 digits (without country code)
  if (/^1?(\d{10})$/.test(cleaned)) {
    return null; // valid
  }

  return "Invalid phone number. Enter a valid number";
};

/**
 * Validates if a date is valid.
 * @param {string|Date} date - The date to check.
 * @param {string} fieldName - The name of the field.
 * @returns {string|null} - Error message or null if valid.
 */
export const validateDate = (date, fieldName) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return `Please enter a valid date for ${fieldName}.`;
    }
    return null;
};

/**
 * Validates a SSN (Social Security Number).
 * @param {string} ssn - The SSN to check.
 * @returns {string|null} - Error message or null if valid.
 */
export const validateSSN = (ssn) => {
    if (!ssn) return null;
    // Basic format check: XXX-XX-XXXX or just 9 digits
    const re = /^(?:\d{3}-\d{2}-\d{4}|\d{9})$/;
    if (!re.test(ssn)) {
        return "Please enter a valid SSN (XXX-XX-XXXX or 9 digits).";
    }
    return null;
};
