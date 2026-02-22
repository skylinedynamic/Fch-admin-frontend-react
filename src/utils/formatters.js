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
        return `${dateStr.getFullYear()}-${String(dateStr.getMonth() + 1).padStart(2, '0')}-${String(dateStr.getDate()).padStart(2, '0')}`;
    }

    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Handle MM-DD-YYYY or MM/DD/YYYY
    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
    const parts = cleanDateStr.includes('-') ? cleanDateStr.split('-') : cleanDateStr.split('/');
    
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            // Already YYYY-MM-DD
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
            // MM-DD-YYYY -> YYYY-MM-DD
            return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    return dateStr;
};
