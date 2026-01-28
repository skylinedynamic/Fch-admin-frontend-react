import { AuthUser } from '../../store/auth/authStore';

/**
 * Checks if a user's subscription is overdue or expired, requiring restricted access.
 * 
 * Rules:
 * 1. Host users (is_host: 1) are never restricted.
 * 2. If status is not 'active' or 'Active', user is restricted.
 * 3. For 'Payment Plan (11-month plan)': restricted if today is >= next_installment_date.
 * 4. For 'One Time Payment': restricted if today is >= subscription_end_date.
 */
export function isSubscriptionRestricted(user: AuthUser | null | undefined): boolean {
    if (!user) return false;

    // Rule 1: Hosts are never restricted
    if (user.is_host === 1) return false;

    // Rule 2: Basic status check (case-insensitive for safety)
    const status = (user.subscription_status || '').toString().toLowerCase();
    if (status !== 'active') return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enrollmentType = user.enrollment_type as string;

    // Rule 3: Payment Plan check
    if (enrollmentType === 'Payment Plan (11-month plan)') {
        if (user.next_installment_date) {
            const installmentDate = new Date(user.next_installment_date as string);
            // If today is equal to or past the installment date, access is restricted
            if (today >= installmentDate) {
                return true;
            }
        }
    }

    // Rule 4: One Time Payment check
    if (enrollmentType === 'One Time Payment') {
        if (user.subscription_end_date) {
            const endDate = new Date(user.subscription_end_date as string);
            // If today is equal to or past the end date, access is restricted
            if (today >= endDate) {
                return true;
            }
        }
    }

    return false;
}
