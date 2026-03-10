export interface AvatarConfig {
    icon: string;
    bgClass: string;
}

/**
 * Gets the icon and color configuration for an activity log based on its type and reference.
 * Returns null if no specific configuration is found, allowing the UI to fallback to dynamic images or initials.
 */
export const getAvatarConfig = (logType: string, reference: string = ''): AvatarConfig | null => {
    if (logType === 'email') {
        return {
            icon: 'ri-mail-send-line',
            bgClass: 'bg-primary-subtle text-primary'
        };
    }

    if (logType === 'activity') {
        const ref = reference.toLowerCase();

        switch (ref) {
            case 'call':
                return {
                    icon: 'ri-phone-line',
                    bgClass: 'bg-success-subtle text-success'
                };
            case 'meeting':
                return {
                    icon: 'ri-group-line',
                    bgClass: 'bg-warning-subtle text-warning'
                };
            case 'email':
                return {
                    icon: 'ri-mail-line',
                    bgClass: 'bg-primary-subtle text-primary'
                };
            case 'event':
            default:
                return {
                    icon: 'ri-calendar-event-line',
                    bgClass: 'bg-info-subtle text-info'
                };
        }
    }

    return null;
};
