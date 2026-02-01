import { AuthUser } from '../../store/auth/authStore';
import { SUBSCRIPTION_STATUS_TYPES } from '../../config/partnerTypeOptions';

const toDate = (d?: string | null) => {
    if (!d) return null;
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

/**
 * Returns true if the user should be restricted due to pending payment
 */
export function isSubscriptionRestricted(user: AuthUser | null | undefined): boolean {
    if (!user) return false;

    // 1️⃣ Host users are never restricted
    if (user.is_host === 1) return false;

    // 2️⃣ Non-active subscription is restricted
    if ((user.subscription_status || '') !== SUBSCRIPTION_STATUS_TYPES.ACTIVE) {
        return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextInstallmentDate = toDate(user.next_installment_date);
    const nextPlatformFeeDate = toDate(user.next_platform_fee_date);

    // 3️⃣ Enrollment phase restriction (one-time or installments)
    if (user.phase === 'enrollment') {
        if (nextInstallmentDate && today >= nextInstallmentDate) {
            return true; // installment due → restrict
        }
        return false; // not yet due → allow
    }

    // 4️⃣ Platform fee phase restriction (monthly after enrollment)
    if (user.phase === 'platform_fee') {
        if (nextPlatformFeeDate && today >= nextPlatformFeeDate) {
            return true; // platform fee due → restrict
        }
        return false; // not yet due → allow
    }

    // 5️⃣ Default allow
    return false;
}
