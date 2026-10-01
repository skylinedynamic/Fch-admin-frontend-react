import type { Client, BorrowerPlan } from './types';
import { locationData } from '../location';
import { getCountryPhoneInfo } from '../../config/locations';
import { ENROLLMENT_TYPE_INSTALLMENT, ENROLLMENT_TYPE_ONE_TIME, FIXED_ENROLLMENT_FOR_BORROWER } from '../../config/subscriptionConfig';
import { ENTITY_TYPE_BORROWER, OTHERS } from '../../config/appConfig';

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
 * Build the enrollment sub-object required by the backend.
 * All billing/plan fields are grouped here instead of being sent flat.
 */
const buildEnrollmentObject = (
    formData: Client,
    amount: number,
    enrollment_type: string | undefined,
    isInstallment: boolean
): Record<string, any> => {
    const enrollment: Record<string, any> = {
        plan_id: formData.plan_id || undefined,
        enrollment_type: enrollment_type || undefined,
        amount: amount,
    };

    if (isInstallment) {
        enrollment.down_payment      = Number(formData.installment_down_payment || 0);
        enrollment.months            = Number(formData.installment_months || 12);
        enrollment.monthly_amount    = Number(formData.installment_monthly_amount || 0);
        enrollment.remaining_balance = Math.max(
            0,
            Number(amount || 0) - Number(formData.installment_down_payment || 0)
        );
    }

    return enrollment;
};

/**
 * Maps the form data to the backend payload for client creation.
 */
export const mapClientPayload = (formData: Client, isHost: boolean, nonHostPlan?: BorrowerPlan): Client => {
    const payload: any = { ...formData };

    // Correctly resolve city choices for initial creation. If OTHERS but no input, keep OTHERS.
    if (payload.city === OTHERS) {
        payload.city = payload.other_city?.trim() || OTHERS;
    }

    if (payload.business_city === OTHERS) {
        payload.business_city = payload.business_other_city?.trim() || OTHERS;
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

    // SSN is optional on create — an empty/untouched field must not be sent
    // as '' (fails the backend's format validation).
    if (!payload.ssn) {
        delete payload.ssn;
    }

    payload.entity_type = ENTITY_TYPE_BORROWER;
    payload.status = formData.status;
    payload.country_code = getCountryPhoneInfo(formData.country)?.prefix || '';

    // Check if free trial
    const isFreeTrial = payload.is_free_trail == 1 || payload.is_free_trail === true || payload.is_free_trail === 'true' || payload.is_free_trail === '1';

    // Strip all flat enrollment fields — they go into `enrollment` sub-object below
    const flatEnrollmentFields = [
        'plan_id', 'enrollment_type', 'enrollment_amount', 'enrollment_payment',
        'payment_amount', 'amount', 'is_partner_paying', 'installment_applied',
        'installment_down_payment', 'installment_months', 'installment_monthly_amount',
        'installment_remaining_balance', 'subscriptions', 'enrollment_details',
    ];
    flatEnrollmentFields.forEach(f => delete payload[f]);

    if (isFreeTrial) {
        // Free trial: send no enrollment object at all
        return payload;
    }

    // ── Calculate enrollment amount & type ───────────────────────────────────
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
            enrollment_type = ENROLLMENT_TYPE_ONE_TIME;
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

            enrollment_type = formData.enrollment_type || ENROLLMENT_TYPE_ONE_TIME;
        } else {
            amount = nonHostPlan?.total_amount ? parseFloat(nonHostPlan.total_amount as string) : 800;
            enrollment_type = nonHostPlan?.enrollment_type || FIXED_ENROLLMENT_FOR_BORROWER;
        }
    }

    // Override amount with explicit enrollment_amount if filled
    if ((formData as any).enrollment_amount !== undefined && (formData as any).enrollment_amount !== '') {
        amount = Number((formData as any).enrollment_amount || amount);
    }

    const isInstallment = (enrollment_type || '').toString().toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase();

    // ── Build enrollment sub-object ──────────────────────────────────────────
    payload.enrollment = buildEnrollmentObject(formData, amount, enrollment_type, isInstallment);

    return payload;
};

/**
 * Maps the form data for client update.
 */
export const mapClientUpdatePayload = (formData: Client, isHost: boolean, wasFreeTrial = false): Partial<Client> => {
    const payload: any = {
        ...formData,
        // Resolve city pairs without deleting them. If OTHERS is selected but empty, keep OTHERS.
        city: formData.city === OTHERS ? (formData.other_city?.trim() || OTHERS) : (formData.city || ''),
        business_city: formData.business_city === OTHERS ? (formData.business_other_city?.trim() || OTHERS) : (formData.business_city || ''),
        other_city: formData.other_city || '',
        business_other_city: formData.business_other_city || '',
    };

    // Read-only login state, shown with the email field — never sent back.
    delete payload.pending_email;
    delete payload.user_id;

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

    // SSN: the field is pre-filled with the real, formatted value and edited
    // directly. Only omit it if it's been cleared entirely — sending '' would
    // fail the backend's format validation.
    if (!payload.ssn) {
        delete payload.ssn;
    }
    delete payload.last_4_ssn;

    if (formData.status) {
        payload.status = formData.status;
    }

    payload.country_code = getCountryPhoneInfo(formData.country)?.prefix || '';

    // Detect free trial → regular conversion
    // `is_free_trail` is typed as `boolean` but defensively checked against the
    // legacy wire formats (0/1, "true"/"1") some callers may still pass in.
    const rawIsFreeTrail = formData.is_free_trail as unknown;
    const isConvertingFromFreeTrial = wasFreeTrial && !(rawIsFreeTrail == 1 || rawIsFreeTrail === true || rawIsFreeTrail === 'true' || rawIsFreeTrail === '1');

    // Strip all flat enrollment/billing fields always (they go into `enrollment` sub-object when needed)
    const flatEnrollmentFields = [
        'plan_id', 'subscription_plan_id', 'partner_type', 'enrollment_type',
        'enrollment_amount', 'installment_down_payment', 'installment_months',
        'installment_monthly_amount', 'installment_remaining_balance', 'invoice',
        'is_partner_paying', 'latest_subscription', 'subscription', 'amount',
        'payment_amount', 'enrollment_payment', 'installment_applied',
        'subscriptions', 'enrollment_details',
    ];
    flatEnrollmentFields.forEach(f => delete payload[f]);

    if (isConvertingFromFreeTrial) {
        // ── Build enrollment sub-object for migration ────────────────────────
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

                enrollment_type = formData.enrollment_type || ENROLLMENT_TYPE_ONE_TIME;
            } else {
                amount = 800; // default/fallback
                enrollment_type = FIXED_ENROLLMENT_FOR_BORROWER;
            }
        }

        // Override with explicit enrollment_amount if filled
        if ((formData as any).enrollment_amount !== undefined && (formData as any).enrollment_amount !== '') {
            amount = Number((formData as any).enrollment_amount || amount);
        }

        const isInstallment = (enrollment_type || '').toString().toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase();

        payload.enrollment = buildEnrollmentObject(formData, amount, enrollment_type, isInstallment);
    }
    // When NOT converting, send no enrollment sub-object at all (update is for personal/business fields only)

    // Filter out completely empty bank account rows before sending to backend
    if (payload.bank_accounts && Array.isArray(payload.bank_accounts)) {
        payload.bank_accounts = payload.bank_accounts.filter(
            (acc: any) => acc.id || acc.bank_name || acc.account_open_date
        );
    }

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
