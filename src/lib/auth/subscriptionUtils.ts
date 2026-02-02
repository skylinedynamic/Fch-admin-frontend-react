import { AuthUser } from '../../store/auth/authStore';
import { SUBSCRIPTION_STATUS_TYPES } from '../../config/partnerTypeOptions';

/**
 * Helper: convert string date to midnight Date object, or null
 */
const toDate = (d?: string | null) => {
    if (!d) return null;
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

/**
 * Determine if a user is restricted from using the platform
 */
export function isSubscriptionRestricted(user: AuthUser | null | undefined): boolean {
    if (!user) return false;

    // Hosts are never restricted
    if (user.is_host === 1) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = toDate(user.subscription_end_date);
    const nextInstallmentDate = toDate(user.next_installment_date);
    const nextPlatformFeeDate = toDate(user.next_platform_fee_date);
    const phase = user.phase;

    // Subscription inactive → restricted
    if ((user.subscription_status || '') !== SUBSCRIPTION_STATUS_TYPES.ACTIVE) {
        return true;
    }

    // Enrollment phase → check next installment
    if (phase === 'enrollment') {
        if (nextInstallmentDate && today >= nextInstallmentDate) {
            return true;
        }
        return false;
    }

    // Subscription ended → platform fee may apply
    if (endDate && today >= endDate) {
        // Platform fee due today or past → restricted
        if (nextPlatformFeeDate && today >= nextPlatformFeeDate) {
            return true;
        }
        // Package ended, platform fee not yet due → ok
        return false;
    }

    // Platform fee phase before subscription end (rare edge case)
    if (phase === 'platform_fee') {
        if (nextPlatformFeeDate && today >= nextPlatformFeeDate) {
            return true;
        }
        return false;
    }

    // Default → not restricted
    return false;
}
