import type { Client, BorrowerPlan } from './types';

const normalizeDate = (dateStr: any): string | undefined => {
    if (!dateStr) return undefined;
    if (dateStr instanceof Date) {
        return `${dateStr.getFullYear()}-${String(dateStr.getMonth() + 1).padStart(2, '0')}-${String(dateStr.getDate()).padStart(2, '0')}`;
    }

    // If it's already YYYY-MM-DD, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // If it's MM-DD-YYYY or MM/DD/YYYY
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (parts.length === 3) {
        if (parts[2].length === 4) {
            // MM-DD-YYYY -> YYYY-MM-DD
            return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
    }

    // Fallback attempt to parse with Date object
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    return dateStr;
};

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

    // Normalize date
    if (payload.business_start_date) {
        payload.business_start_date = normalizeDate(payload.business_start_date);
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
    const payload: any = {
        ...formData,
        city: formData.city === 'Others' ? formData.other_city : formData.city,
    };

    // Normalize date
    if (payload.business_start_date) {
        payload.business_start_date = normalizeDate(payload.business_start_date);
    }

    // Keep enrollment fields for now to address "wrong data update" issue
    // delete payload.enrollment_type;
    // delete payload.payment_amount;
    // delete payload.amount;
    // delete payload.enrollment_amount;
    // delete payload.plan_id;

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
