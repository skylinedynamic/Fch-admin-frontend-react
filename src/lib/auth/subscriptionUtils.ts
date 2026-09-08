import { UserSubscription } from './auth';
import { STATUS_ACTIVE, STATUS_CANCELLED, STATUS_COMPLETED } from '../../config/subscriptionConfig';
import { parseDateOnly, startOfToday } from '../../utils/helper';

// These API fields are date-only ("YYYY-MM-DD") and carry no timezone, so they
// must be read as local calendar dates - see parseDateOnly(). Using new Date()
// on them parses midnight UTC and locks users behind UTC out a day early.
const toDate = parseDateOnly;

/**
 * Determine if a user is restricted from using the platform
 */
export function isSubscriptionRestricted(subscription: UserSubscription | null | undefined): boolean {
    if (!subscription) return false;

    // Hosts are never restricted
    if (subscription.is_host) return false;

    // Free trial partners/users are not restricted if not expired
    const isFreeTrial = !!subscription.is_free_trail;
    const trialEndDate = subscription.free_trail_end_date as string | undefined;

    if (isFreeTrial) {
        if (trialEndDate) {
            const today = startOfToday();
            const end = toDate(trialEndDate);
            if (end && today > end) {
                return true; // Expired → restricted
            }
        }
        return false; // Active free trial → not restricted
    }

    const subStatus = String(subscription.subscription_status || '').toLowerCase().trim();
    const activeStatus = String(STATUS_ACTIVE || 'active').toLowerCase().trim();
    const cancelledStatus = String(STATUS_CANCELLED || 'cancelled').toLowerCase().trim();
    const completedStatus = String(STATUS_COMPLETED || 'completed').toLowerCase().trim();

    // If status is not active, cancelled, or completed → restricted
    if (subStatus && subStatus !== activeStatus && subStatus !== cancelledStatus && subStatus !== completedStatus) {
        return true;
    }

    const today = startOfToday();

    const endDate = toDate(subscription.subscription_end_date);

    // If subscription_end_date is null, no need to lock
    if (!endDate) {
        return false;
    }

    // Lock profile/menu if current date is past subscription_end_date
    if (today > endDate) {
        return true;
    }

    // Default → not restricted
    return false;
}
