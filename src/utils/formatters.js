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
    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
    
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
        // Handle MM/DD/YYYY or DD/MM/YYYY - default to DD/MM/YYYY for SubscriptionSection consistency
        if (parts[2].length === 4) {
            const year = parseInt(parts[2]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[0]);
            return new Date(year, month, day);
        }
    }

    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};
