import type { Client, BorrowerPlan } from './types';

/**
 * Maps the form data to the backend payload for client creation.
 * Implements the "accurate lead pattern" for both host and non-host clients.
 */
export const mapClientPayload = (formData: Client, isHost: boolean, nonHostPlan?: BorrowerPlan): Client => {
    const payload = { ...formData };

    // Normalize city
    if (payload.city === 'Others') {
        payload.city = payload.other_city;
    }

    // Calculate Enrollment Type and Amount
    let amount = 0;
    let enrollment_type = payload.enrollment_type;

    if (isHost) {
        amount = payload.payment_amount ? parseFloat(payload.payment_amount as string) : 0;
    } else {
        // Fallback to 800 if nonHostPlan is missing (as per original code)
        amount = nonHostPlan?.payment_amount ? parseFloat(nonHostPlan.payment_amount as string) : 800;
        enrollment_type = nonHostPlan?.enrollment_type || 'Fixed enrollment';
    }

    // Add specific payload fields required by backend
    payload.amount = amount;
    payload.enrollment_type = enrollment_type;
    payload.payment_amount = amount;
    payload.entity_type = 'Borrower';
    payload.is_partner_paying = !isHost;

    return payload;
};

/**
 * Maps the form data for client update.
 * Removes certain fields that shouldn't be updated via profile edit.
 */
export const mapClientUpdatePayload = (formData: Client, isHost: boolean): Partial<Client> => {
    const payload = {
        ...formData,
        city: formData.city === 'Others' ? formData.other_city : formData.city,
    };

    // Remove enrollment specific fields as requested by backend/user rules
    delete payload.enrollment_type;
    delete payload.payment_amount;
    delete payload.amount;
    delete payload.enrollment_amount;

    if (!isHost) {
        payload.is_partner_paying = true;
    }

    return payload;
};

/**
 * Calculates enrollment display details based on a plan.
 */
export const calculateEnrollmentDetails = (plan: BorrowerPlan, isHost: boolean) => {
    const installments = plan.total_installments_count ||
        (plan.enrollment_type && plan.enrollment_type.includes('One Time') ? 1 : (isHost ? 6 : 1));

    const totalAmount = plan.total_amount || plan.payment_amount;
    const price = typeof plan.payment_amount === 'string' ? parseFloat(plan.payment_amount) : plan.payment_amount;

    return {
        installments,
        totalAmount,
        price,
        isOneTime: installments === 1
    };
};
