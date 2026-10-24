export const formatPhoneNumber = (value) => {
    if (!value) return value;

    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');

    // Format as (###) ###-####
    if (phoneNumber.length <= 3) {
        return phoneNumber;
    } else if (phoneNumber.length <= 6) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
};

export const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    // Remove time part if present
    const cleanDateStr = typeof dateStr === 'string' 
        ? (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0])
        : String(dateStr);
    
    // Split by hyphens or slashes
    const parts = cleanDateStr.includes('-') ? cleanDateStr.split('-') : cleanDateStr.split('/');
    
    if (parts.length === 3) {
        // Handle YYYY-MM-DD or YYYY/MM/DD
        if (parts[0].length === 4) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            return new Date(year, month, day);
        }
        // Handle MM/DD/YYYY or DD/MM/YYYY
        if (parts[2].length === 4) {
            const year = parseInt(parts[2]);
            const p0 = parseInt(parts[0]);
            const p1 = parseInt(parts[1]);
            
            if (p0 > 12) {
                return new Date(year, p1 - 1, p0);
            } else {
                return new Date(year, p0 - 1, p1);
            }
        }
    }

    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};

export const normalizeDate = (dateStr) => {
    if (!dateStr) return undefined;
    if (dateStr instanceof Date) {
        return `${String(dateStr.getMonth() + 1).padStart(2, '0')}-${String(dateStr.getDate()).padStart(2, '0')}-${dateStr.getFullYear()}`;
    }

    // Handle MM-DD-YYYY or MM/DD/YYYY directly
    const cleanDateStr = typeof dateStr === 'string' 
        ? (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0])
        : String(dateStr);

    const parts = cleanDateStr.includes('-') ? cleanDateStr.split('-') : cleanDateStr.split('/');
    
    if (parts.length === 3) {
        if (parts[0].length <= 2 && parts[2].length === 4) {
            // Already MM-DD-YYYY -> return as is (normalized to -)
            return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
        }
        if (parts[0].length === 4) {
            // YYYY-MM-DD -> MM-DD-YYYY
            return `${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}-${parts[0]}`;
        }
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
    }

    return dateStr;
};

export const formatZipCode = (value) => {
    if (!value) return value;
    const numericValue = value.replace(/\D/g, '');
    return numericValue.slice(0, 5);
};

export const formatDUNS = (value) => {
    if (!value) return value;
    const numericValue = value.replace(/\D/g, '');
    return numericValue.slice(0, 9);
};

export const formatBusinessEIN = (value) => {
    if (!value) return value;
    const numericValue = value.replace(/\D/g, '');
    const cleanValue = numericValue.slice(0, 9);
    
    if (cleanValue.length <= 2) {
        return cleanValue;
    }
    return `${cleanValue.slice(0, 2)}-${cleanValue.slice(2)}`;
};

/**
 * A stored EIN as the screens show it, XX-XXXXXXX - the API keeps nine digits,
 * older rows a hyphenated writing. Anything that is not a writing of an EIN is
 * shown as it is, so opening and saving a record never quietly blanks it.
 */
export const displayEIN = (value) => {
    if (!value) return '';
    return /^[\d\s-]+$/.test(value) ? formatBusinessEIN(value) : value;
};

/**
 * Masks or reveals an SSN string in ###-##-#### format.
 * @param value Raw SSN digits
 * @param reveal Whether to reveal the full SSN
 */
export const formatSSN = (value, reveal = false) => {
    if (!value) return '—';
    const digits = value.replace(/\D/g, '');
    if (reveal) {
        if (digits.length <= 3) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
    }
    const last4 = digits.slice(-4).padStart(4, '*');
    return `***-**-${last4}`;
};

/**
 * Formats a date string into a human-readable format.
 * @param dateStr ISO or YYYY-MM-DD string
 */
export const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return dateStr;
    }
};

/**
 * Formats a date string into a human-readable format including time.
 * @param dateStr ISO or YYYY-MM-DD HH:mm:ss string
 */
export const parseDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
};

/**
 * Formats a funding option's "speed to funds" (free text such as "1-5 Days" or
 * "24-72 Hours"). Adds "Days" only to a bare number or range, and drops a
 * "Days" an earlier save appended after a unit (BUG-025: "1-5 Days Days").
 * @param value The stored speed to funds
 * @param fallback What to show when there is no value
 */
export const formatSpeedToFunds = (value, fallback = '—') => {
    const speed = (value ?? '').toString().trim().replace(/\b(days?|hours?|weeks?|months?)(\s+days)+$/i, '$1');
    if (!speed) return fallback;
    return /[a-z]/i.test(speed) ? speed : `${speed} Days`;
};
