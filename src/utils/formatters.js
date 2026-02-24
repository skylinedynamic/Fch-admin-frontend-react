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
        // Handle MM/DD/YYYY or DD/MM/YYYY
        if (parts[2].length === 4) {
            const year = parseInt(parts[2]);
            const p0 = parseInt(parts[0]);
            const p1 = parseInt(parts[1]);
            
            // If p0 > 12, it must be DD-MM-YYYY
            // If p1 > 12, it must be MM-DD-YYYY
            // If both <= 12, default to MM-DD-YYYY (US standard)
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
    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
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
