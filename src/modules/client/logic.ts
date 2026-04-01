import type { Client, BorrowerPlan } from './types';
import { locationData, getCountryPhoneInfo } from '../../config/locations';

const normalizeDate = (dateStr: any): string | undefined => {
    if (!dateStr) return undefined;
    if (dateStr instanceof Date) {
        return `${String(dateStr.getMonth() + 1).padStart(2, '0')}-${String(dateStr.getDate()).padStart(2, '0')}-${dateStr.getFullYear()}`;
    }

    // Handle MM-DD-YYYY or MM/DD/YYYY directly
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
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

    // Fallback attempt to parse with Date object
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
    }

    return dateStr;
};

/**
 * Maps the form data to the backend payload for client creation.
 */
export const mapClientPayload = (formData: Client, isHost: boolean, nonHostPlan?: BorrowerPlan): Client => {
    const payload = { ...formData };

    // Correctly resolve city choices for initial creation. If 'Others' but no input, keep 'Others'.
    if (payload.city === 'Others') {
        payload.city = payload.other_city?.trim() || 'Others';
    }

    if (payload.business_city === 'Others') {
        payload.business_city = payload.business_other_city?.trim() || 'Others';
    }

    // Resolve business country code to phone prefix
    const businessPhoneInfo = getCountryPhoneInfo(payload.business_country);
    if (businessPhoneInfo) {
        payload.business_country_code = businessPhoneInfo.prefix;
    }

    // Normalize dates
    if (payload.business_start_date) {
        payload.business_start_date = normalizeDate(payload.business_start_date);
    }
    if (payload.date_of_birth) {
        payload.date_of_birth = normalizeDate(payload.date_of_birth);
    }

    // Calculate Enrollment Type and Amount
    let amount = 0;
    let enrollment_type = payload.enrollment_type;

    if (isHost) {
        const rawAmount = payload.enrollment_payment ??
            (payload as any).enrollment_amount ??
            payload.payment_amount ??
            payload.amount;

        amount = (rawAmount === '' || rawAmount === null || rawAmount === undefined)
            ? 0
            : (typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount));

        if (isNaN(amount)) amount = 0;

        if (!enrollment_type && payload.plan_id) {
            enrollment_type = 'Default Enrollment';
        }
    } else {
        amount = nonHostPlan?.payment_amount ? parseFloat(nonHostPlan.payment_amount as string) : 800;
        enrollment_type = nonHostPlan?.enrollment_type || 'Fixed enrollment';
    }

    payload.amount = amount;
    payload.enrollment_payment = amount;
    payload.enrollment_type = enrollment_type;
    payload.payment_amount = amount;
    payload.entity_type = 'Borrower';
    payload.is_partner_paying = !isHost;
    payload.status = formData.status;
    payload.country_code = getCountryPhoneInfo(formData.country)?.prefix || '';

    delete (payload as any).enrollment_amount;

    return payload;
};

/**
 * Maps the form data for client update.
 */
export const mapClientUpdatePayload = (formData: Client, isHost: boolean): Partial<Client> => {
    const payload: any = {
        ...formData,
        // Resolve city pairs without deleting them. If 'Others' is selected but empty, keep 'Others'.
        city: formData.city === 'Others' ? (formData.other_city?.trim() || 'Others') : (formData.city || ''),
        business_city: formData.business_city === 'Others' ? (formData.business_other_city?.trim() || 'Others') : (formData.business_city || ''),
        other_city: formData.other_city || '',
        business_other_city: formData.business_other_city || '',
    };

    // Resolve business country code to phone prefix
    const businessPhoneInfo = getCountryPhoneInfo(formData.business_country);
    if (businessPhoneInfo) {
        payload.business_country_code = businessPhoneInfo.prefix;
    }

    if (payload.business_start_date) {
        payload.business_start_date = normalizeDate(payload.business_start_date);
    }
    if (payload.date_of_birth) {
        payload.date_of_birth = normalizeDate(payload.date_of_birth);
    }

    if (formData.status) {
        payload.status = formData.status;
    }

    if (!isHost) {
        payload.is_partner_paying = true;
    } else {
        const rawAmount = payload.enrollment_payment ?? payload.payment_amount ?? payload.amount;

        if (rawAmount !== undefined && rawAmount !== null) {
            const amount = (rawAmount === '' || rawAmount === null)
                ? 0
                : (typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount));

            payload.amount = isNaN(amount) ? 0 : amount;
            payload.payment_amount = payload.amount;
            payload.enrollment_payment = payload.amount;
        } else if (payload.plan_id) {
            payload.amount = 0;
            payload.payment_amount = 0;
            payload.enrollment_payment = 0;
        }
    }

    payload.country_code = getCountryPhoneInfo(formData.country)?.prefix || '';

    delete (payload as any).enrollment_amount;

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
