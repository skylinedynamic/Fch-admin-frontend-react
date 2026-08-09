import type { Client, BorrowerPlan } from './types';
import { locationData, getCountryPhoneInfo } from '../../config/locations';
import { ENROLLMENT_TYPE_INSTALLMENT, ENROLLMENT_TYPE_ONE_TIME } from '../../config/subscriptionConfig';

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
    if (payload.free_trail_end_date) {
        payload.free_trail_end_date = normalizeDate(payload.free_trail_end_date);
    }

    payload.entity_type = 'Borrower';
    payload.status = formData.status;
    payload.country_code = getCountryPhoneInfo(formData.country)?.prefix || '';

    // Check if free trial
    const isFreeTrial = payload.is_free_trail == 1 || payload.is_free_trail === true || payload.is_free_trail === 'true' || payload.is_free_trail === '1';

    if (isFreeTrial) {
        delete payload.plan_id;
        delete payload.enrollment_type;
        delete payload.enrollment_amount;
        delete (payload as any).payment_amount;
        delete (payload as any).enrollment_payment;
        delete (payload as any).amount;
        delete payload.installment_down_payment;
        delete payload.installment_months;
        delete payload.installment_monthly_amount;
        delete payload.installment_remaining_balance;
        delete payload.is_partner_paying;
        delete (payload as any).installment_applied;
        delete (payload as any).subscriptions;
        delete (payload as any).enrollment_details;
        return payload;
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
        if (payload.plan_id) {
            const rawAmount = payload.enrollment_payment ??
                payload.payment_amount ??
                payload.amount;

            amount = (rawAmount === '' || rawAmount === null || rawAmount === undefined)
                ? 0
                : (typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount));

            if (isNaN(amount)) amount = 0;

            enrollment_type = payload.enrollment_type || 'One Time Payment';
        } else {
            amount = nonHostPlan?.total_amount ? parseFloat(nonHostPlan.total_amount as string) : 800;
            enrollment_type = nonHostPlan?.enrollment_type || 'Fixed enrollment';
        }
    }

    payload.enrollment_amount = Number(formData.enrollment_amount || amount || 0);
    payload.enrollment_type = enrollment_type;
    payload.is_partner_paying = !isHost && String(payload.plan_id) !== '5';

    // Strip legacy/unwanted fields
    delete (payload as any).amount;
    delete (payload as any).payment_amount;
    delete (payload as any).enrollment_payment;
    delete (payload as any).installment_applied;
    delete (payload as any).subscriptions;
    delete (payload as any).enrollment_details;

    const isInstallment = (enrollment_type || '').toString().toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase();

    if (!isInstallment) {
        delete payload.installment_down_payment;
        delete payload.installment_months;
        delete payload.installment_monthly_amount;
        delete payload.installment_remaining_balance;
    } else {
        payload.installment_remaining_balance = Math.max(0, Number(payload.enrollment_amount || 0) - Number(formData.installment_down_payment || 0));
        payload.installment_down_payment = Number(formData.installment_down_payment || 0);
        payload.installment_months = Number(formData.installment_months || 12);
        payload.installment_monthly_amount = Number(formData.installment_monthly_amount || 0);
    }

    return payload;
};

/**
 * Maps the form data for client update.
 */
export const mapClientUpdatePayload = (formData: Client, isHost: boolean, wasFreeTrial = false): Partial<Client> => {
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
    if (payload.free_trail_end_date) {
        payload.free_trail_end_date = normalizeDate(payload.free_trail_end_date);
    }

    if (formData.status) {
        payload.status = formData.status;
    }

    // Detect free trial → regular conversion
    const isConvertingFromFreeTrial = wasFreeTrial && !(formData.is_free_trail == 1 || formData.is_free_trail === true || formData.is_free_trail === 'true' || formData.is_free_trail === '1');

    if (isConvertingFromFreeTrial) {
        // Calculate Enrollment Type and Amount (mirrors mapClientPayload)
        let amount = 0;
        let enrollment_type = formData.enrollment_type;

        if (isHost) {
            const rawAmount = formData.enrollment_payment ??
                (formData as any).enrollment_amount ??
                formData.payment_amount ??
                formData.amount;

            amount = (rawAmount === '' || rawAmount === null || rawAmount === undefined)
                ? 0
                : (typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount));

            if (isNaN(amount)) amount = 0;

            if (!enrollment_type && formData.plan_id) {
                enrollment_type = 'Default Enrollment';
            }
        } else {
            if (formData.plan_id) {
                const rawAmount = formData.enrollment_payment ??
                    formData.payment_amount ??
                    formData.amount;

                amount = (rawAmount === '' || rawAmount === null || rawAmount === undefined)
                    ? 0
                    : (typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount));

                if (isNaN(amount)) amount = 0;

                enrollment_type = formData.enrollment_type || 'One Time Payment';
            } else {
                amount = 800; // default/fallback
                enrollment_type = 'Fixed enrollment';
            }
        }

        payload.enrollment_amount = Number(formData.enrollment_amount || amount || 0);
        payload.enrollment_type = enrollment_type;
        payload.is_partner_paying = !isHost && String(payload.plan_id) !== '5';

        const isInstallment = (enrollment_type || '').toString().toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase();
        if (!isInstallment) {
            delete payload.installment_down_payment;
            delete payload.installment_months;
            delete payload.installment_monthly_amount;
            delete payload.installment_remaining_balance;
        } else {
            payload.installment_remaining_balance = Math.max(0, Number(payload.enrollment_amount || 0) - Number(formData.installment_down_payment || 0));
            payload.installment_down_payment = Number(formData.installment_down_payment || 0);
            payload.installment_months = Number(formData.installment_months || 12);
            payload.installment_monthly_amount = Number(formData.installment_monthly_amount || 0);
        }
    } else {
        if (!isHost) {
            payload.is_partner_paying = String(payload.plan_id) !== '5';
        } else {
            const rawAmount = payload.enrollment_payment ?? payload.payment_amount ?? payload.amount;

            if (rawAmount !== undefined && rawAmount !== null) {
                const amount = (rawAmount === '' || rawAmount === null)
                    ? 0
                    : (typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount));

                payload.enrollment_payment = isNaN(amount) ? 0 : amount;
            } else if (payload.plan_id) {
                payload.enrollment_payment = 0;
            }
        }
    }

    payload.country_code = getCountryPhoneInfo(formData.country)?.prefix || '';

    // Strip enrollment, billing, subscription, and invoice properties on update always
    const enrollmentFieldsToSkip = [
        'plan_id',
        'subscription_plan_id',
        'partner_type',
        'enrollment_type',
        'enrollment_amount',
        'installment_down_payment',
        'installment_months',
        'installment_monthly_amount',
        'installment_remaining_balance',
        'invoice',
        'is_partner_paying',
        'latest_subscription',
        'subscription',
        'amount',
        'payment_amount',
        'enrollment_payment',
        'installment_applied',
        'subscriptions', // Read-only history list — never sent to the API
        'enrollment_details' // Read-only summary object from API — never sent on update
    ];

    // Fields that are always allowed through during a free trial conversion
    const freeTrialConversionAllowedFields = [
        'plan_id',
        'subscription_plan_id',
        'enrollment_type',
        'enrollment_amount',
        'installment_down_payment',
        'installment_months',
        'installment_monthly_amount',
        'installment_remaining_balance',
        'is_free_trail',
        'free_trail_end_date',
        'is_partner_paying',
        'amount',
        'payment_amount',
        'enrollment_payment',
        'installment_applied'
    ];

    enrollmentFieldsToSkip.forEach(field => {
        if (!isConvertingFromFreeTrial || !freeTrialConversionAllowedFields.includes(field)) {
            delete payload[field];
        }
    });

    delete payload.enrollment_details;

    return payload;
};

/**
 * Calculates enrollment display details based on a plan.
 */
export const calculateEnrollmentDetails = (plan: BorrowerPlan, isHost: boolean) => {
    const installments = plan.total_installments_count ||
        (plan.enrollment_type === ENROLLMENT_TYPE_ONE_TIME ? 1 : (isHost ? 6 : 1));

    const totalAmount = plan.total_amount || 0;
    const price = typeof plan.total_amount === 'string' ? parseFloat(plan.total_amount) : (plan.total_amount || 0);

    return {
        installments,
        totalAmount,
        price,
        isOneTime: installments === 1
    };
};
