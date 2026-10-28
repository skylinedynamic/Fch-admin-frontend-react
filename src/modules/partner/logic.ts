import { PARTNER_TYPES } from '../../config/partnerTypeOptions';
import { DEFAULT_INSTALLMENT_MONTHS, ENROLLMENT_TYPE_INSTALLMENT } from '../../config/subscriptionConfig';
import type { PartnerOption } from './types';

/**
 * The installment months a new enrollment starts with: 12, or the plan's
 * "Installment Upto" (Plan & Fee) when that is lower. The API sends the same
 * rule as installment_default_months; the limit is the fallback.
 */
export const defaultInstallmentMonths = (
    plan: { installment_default_months?: number | null; total_installment_count_upto?: number | null } | null | undefined
): number => {
    const fromApi = Number(plan?.installment_default_months);
    if (fromApi > 0) return fromApi;
    const upto = Number(plan?.total_installment_count_upto);
    return upto > 0 ? Math.min(DEFAULT_INSTALLMENT_MONTHS, upto) : DEFAULT_INSTALLMENT_MONTHS;
};

/**
 * Resolves matching partner plan ID from available partner plans based on partner_type and enrollment_type.
 */
export const resolvePartnerPlanId = (formData: any, partnerPlans: any[] = []): string | number => {
    if (formData.plan_id) return formData.plan_id;

    const matchedPlan = partnerPlans.find(
        p => p.partner_type === formData.partner_type &&
            (p.enrollment_type || '').toString().toLowerCase() === (formData.enrollment_type || '').toString().toLowerCase()
    );

    return matchedPlan?.id || '';
};

/**
 * Maps backend error object keys (e.g. `enrollment.plan_id`) to flat UI error field names.
 */
export const mapPartnerBackendErrors = (backendErrors: Record<string, any>): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    const enrollmentKeyMap: Record<string, string> = {
        'enrollment':                           'enrollment',
        'enrollment.plan_id':                   'plan_id',
        'enrollment.enrollment_type':           'enrollment_type',
        'enrollment.amount':                    'enrollment_amount',
        'enrollment.monthly_platform_fee':      'monthly_platform_fee',
        'enrollment.down_payment':              'installment_down_payment',
        'enrollment.months':                    'installment_months',
        'enrollment.monthly_amount':            'installment_monthly_amount',
        'enrollment.remaining_balance':         'installment_remaining_balance',
        // The create endpoint validates the zip as zip_code; the form field is postal_code.
        'zip_code':                             'postal_code',
    };

    Object.entries(backendErrors).forEach(([field, errorMsg]) => {
        const message = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
        const mappedKey = enrollmentKeyMap[field] ?? field;
        newErrors[mappedKey] = message;
    });

    return newErrors;
};

/**
 * Builds the FormData payload for create or update partner operations.
 */
/**
 * Optional fields an edit may clear (nullable in UpdatePartnerRequest). An
 * emptied one used to be left out of the payload, so the API kept the old
 * value (R2 BUG-060); on an edit they are sent empty instead.
 */
const CLEARABLE_ON_EDIT = [
    'contact_person', 'contact_person_phone_number', 'contact_person_email', 'contact_person_relation',
    'address_line_1', 'address_line_2', 'state', 'city', 'postal_code', 'tax_id', 'website',
];

export const buildPartnerFormDataPayload = (
    formData: Record<string, any>,
    id?: string | number,
    wasFreeTrial: boolean = false,
    partnerPlans: any[] = []
): FormData => {
    const formDataToSend = new FormData();
    const isInstallmentEnrollment = (formData.enrollment_type || '').toString().toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase();
    const isFreeTrial = formData.is_free_trail == 1 || formData.is_free_trail === true || formData.is_free_trail === 'true' || formData.is_free_trail === '1';
    const isConvertingFromFreeTrial = wasFreeTrial && !isFreeTrial;

    const enrollmentSubFields = [
        'plan_id',
        'enrollment_type',
        'enrollment_amount',
        'monthly_platform_fee',
        'recurring_amount',
        'installment_down_payment',
        'installment_months',
        'installment_monthly_amount',
        'installment_remaining_balance',
    ];

    const skipAlways = [
        'first_reg_amount', 'first_reg_amount_2', 'first_reg_payment', 'first_reg_payment_2',
        'installment_applied', 'subscriptions', 'enrollment_details',
        'payable_amount', 'total_subscription_amount', 'total_paid_amount',
        'subscription_start_date', 'subscription_end_date', 'expiry_date',
        'termination_date', 'subscription_status', 'is_partner_paying',
        'payable_amount_formatted', 'total_subscription_amount_formatted',
        'monthly_platform_fee_formatted', 'enrollment_amount_formatted',
        'installment_down_payment_formatted', 'installment_monthly_amount_formatted',
        'installment_remaining_balance_formatted',
        'agentEmail', 'agentPhone', 'company_logo',
        'other_city',
        'borrower_domain',
        // Read-only login state, shown with the email field — never sent back.
        'pending_email', 'login_user_id',
    ];

    // Append top-level (non-enrollment) fields
    Object.entries(formData).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (enrollmentSubFields.includes(key)) return;
        if (skipAlways.includes(key)) return;

        if (id) {
            const updateSkipFields = ['partner_type', 'invoice'];
            if (!wasFreeTrial) {
                updateSkipFields.push('is_free_trail', 'free_trail_end_date');
            }
            if (updateSkipFields.includes(key)) return;
        }

        if (key === 'partner_image') {
            if (value instanceof File) {
                formDataToSend.append('partner_image', value);
            } else if (typeof value === 'string' && value.trim() !== '' && !value.startsWith('http')) {
                formDataToSend.append('partner_image', value);
            }
        } else if (key === 'agent') {
            if (value !== '') {
                formDataToSend.append('assign_to', value as string);
                formDataToSend.append('assigned_user_id', value as string);
            }
        } else if (key === 'status') {
            formDataToSend.append('status', (value || '') as string);
        } else if (key === 'city') {
            if (value === 'Others' && formData.other_city) {
                formDataToSend.append('city', formData.other_city);
            } else if (value !== 'Others') {
                formDataToSend.append('city', value as string);
            }
        } else if (key === 'country_code') {
            if (value) formDataToSend.append('country_code', value as string);
        } else if (key === 'partner_domain') {
            const shouldSend = !id || formData.partner_type === PARTNER_TYPES.CERTIFIED;
            if (shouldSend && value && typeof value === 'string') {
                const cleanValue = value.trim();
                if (cleanValue !== '') {
                    const firstPart = cleanValue.split('.')[0];
                    formDataToSend.append('partner_domain', firstPart);
                }
            }
        } else if (key === 'is_free_trail') {
            formDataToSend.append('is_free_trail', isFreeTrial ? '1' : '0');
        } else if (key === 'free_trail_end_date') {
            formDataToSend.append('free_trail_end_date', isFreeTrial && value ? (value as string) : '');
        } else if (value !== '' && value !== null) {
            formDataToSend.append(key, value as string | Blob);
        } else if (id && value === '' && CLEARABLE_ON_EDIT.includes(key)) {
            formDataToSend.append(key, '');
        }
    });

    // Append enrollment sub-object
    const shouldSendEnrollment = !id || isConvertingFromFreeTrial;

    if (shouldSendEnrollment && !isFreeTrial) {
        const enrollmentAmount = formData.enrollment_amount;
        const monthlyFee = formData.monthly_platform_fee || formData.recurring_amount || '';
        const resolvedPlanId = resolvePartnerPlanId(formData, partnerPlans);

        formDataToSend.append('enrollment[plan_id]', String(resolvedPlanId));
        formDataToSend.append('enrollment[enrollment_type]', formData.enrollment_type || '');
        formDataToSend.append('enrollment[amount]', enrollmentAmount !== undefined && enrollmentAmount !== '' ? String(enrollmentAmount) : '');
        formDataToSend.append('enrollment[monthly_platform_fee]', String(monthlyFee));

        if (isInstallmentEnrollment) {
            const downPayment = Number(formData.installment_down_payment || 0);
            const months = Number(formData.installment_months || 12);
            const monthly = Number(formData.installment_monthly_amount || 0);
            const remaining = Math.max(0, Number(enrollmentAmount || 0) - downPayment);

            formDataToSend.append('enrollment[down_payment]', String(downPayment));
            formDataToSend.append('enrollment[months]', String(months));
            formDataToSend.append('enrollment[monthly_amount]', String(monthly));
            formDataToSend.append('enrollment[remaining_balance]', String(remaining));
        }
    }

    return formDataToSend;
};

/**
 * A partner's label in a filter dropdown: "Company (Full name)", whichever of
 * the two it has, or its number with neither.
 */
export const partnerOptionLabel = (partner: PartnerOption): string => {
    if (partner.full_name && partner.company_name) return `${partner.company_name} (${partner.full_name})`;
    return partner.company_name || partner.full_name || `Partner #${partner.id}`;
};
