export const APP_CONFIG = {
  name: 'Four Corner Funding',
  shortName: 'FCH',
};

export const MODULE_BRANDING = 'branding';
export const MODULE_MICROBILT = 'microbilt';
export const MODULE_WEBSITE = 'website';
export const MODULE_AGREEMENT = 'agreement';
export const MODULE_CREDIT_PROFILE = 'credit_profile';
export const MODULE_OPENAI = 'openai';

/**
 * What the settings API returns in place of a stored secret (reCAPTCHA secret,
 * MicroBilt client secret, Credit Profile OpenAI key). The form never fills it
 * into an input: a blank secret on save keeps the stored one.
 */
export const SETTINGS_SECRET_MASK = '••••••••';
export const SAVED_SECRET_PLACEHOLDER = 'Saved - leave blank to keep';

export const ENTITY_TYPE_LEAD = 'Lead';
export const ENTITY_TYPE_PARTNER = 'Partner';
export const ENTITY_TYPE_BORROWER = 'Borrower';
export const ENTITY_TYPE_EMPLOYEE = 'Employee';
export const ENTITY_TYPE_USER = '';
export const ENTITY_TYPE_USER_MODEL = 'User';
export const ENTITY_TYPE_FUNDING_REQUEST = 'Funding Request';
export const ENTITY_TYPE_FUNDING_APPLICATION = 'Funding Application';

export const TYPE_EMAIL = 'email';
export const TYPE_ACTIVITY = 'activity';

export const TARGET_RECIPIENT_HOST = 'host';
export const TARGET_RECIPIENT_BORROWER = 'borrower';

export const OTHERS = 'Others';

// New Log Types
export const LOG_TYPE_EMAIL_UPDATE = 'email_update';
export const LOG_TYPE_PARTNER_CREATE = 'partner_create';
export const LOG_TYPE_PARTNER_UPDATE = 'partner_update';
export const LOG_TYPE_PARTNER_CONTACT_UPDATE = 'partner_contact_update';
export const LOG_TYPE_PARTNER_DELETE = 'partner_delete';
export const LOG_TYPE_EMAIL_SENT = 'email_sent';
export const LOG_TYPE_ACTIVITY = 'activity';
export const LOG_TYPE_BORROWER_CREATE = 'borrower_create';
export const LOG_TYPE_BORROWER_UPDATE = 'borrower_update';
export const LOG_TYPE_BORROWER_CONTACT_UPDATE = 'borrower_contact_update';
export const LOG_TYPE_LEAD_CREATE = 'lead_create';
export const LOG_TYPE_LEAD_UPDATE = 'lead_update';
export const LOG_TYPE_LEAD_DETAILS_UPDATE = 'lead_details_update';
export const LOG_TYPE_LEAD_CONTACT_UPDATE = 'lead_contact_update';
export const LOG_TYPE_FUNDING_REQUEST_CREATE = 'funding_request_create';
export const LOG_TYPE_FUNDING_REQUEST_STATUS_UPDATE = 'funding_request_status_update';
export const LOG_TYPE_FUNDING_APPLICATION_STATUS_UPDATE = 'funding_application_status_update';
export const LOG_TYPE_BATCH_PROCESS = 'batch_process';
export const LOG_TYPE_INVOICE_CREATE = 'invoice_create';
export const LOG_TYPE_USER_CREATE = 'user_create';
export const LOG_TYPE_USER_UPDATE = 'user_update';
export const LOG_TYPE_APPOINTMENT_CREATE = 'appointment_create';
export const LOG_TYPE_APPOINTMENT_UPDATE = 'appointment_update';
export const LOG_TYPE_APPOINTMENT_DELETE = 'appointment_delete';
export const LOG_TYPE_ROLE_CREATE = 'role_create';
export const LOG_TYPE_ROLE_UPDATE = 'role_update';
export const LOG_TYPE_PERMISSION_UPDATE = 'permission_update';
export const LOG_TYPE_EMPLOYEE_CREATE = 'employee_create';
export const LOG_TYPE_EMPLOYEE_UPDATE = 'employee_update';
export const LOG_TYPE_EMPLOYEE_DELETE = 'employee_delete';
export const LOG_TYPE_PARTNER_PAYMENT = 'partner_payment';
export const LOG_TYPE_BORROWER_PAYMENT = 'borrower_payment';
export const LOG_TYPE_BUSINESS_UPDATE = 'business_update';
export const LOG_TYPE_DOCUMENT_UPLOAD = 'document_upload';
export const LOG_TYPE_CHECKLIST_UPDATE = 'checklist_update';
export const LOG_TYPE_TASK_VERIFICATION = 'task_verification';

export const PASSWORD_GENERATE_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
export const PASSWORD_GENERATE_LENGTH = 14;

export const FUTURE_ACTIVITY_REFERENCES = ['Task', 'Meeting'];

export const REMINDER_PRESETS = [
    { value: '5_minutes', label: '5 Minutes Before' },
    { value: '10_minutes', label: '10 Minutes Before' },
    { value: '15_minutes', label: '15 Minutes Before' },
    { value: '30_minutes', label: '30 Minutes Before' },
    { value: '1_hour', label: '1 Hour Before' },
    { value: '1_day', label: '1 Day Before' },
    { value: '2_days', label: '2 Days Before' },
    { value: '3_days', label: '3 Days Before' },
    { value: '1_week', label: '1 Week Before' },
    { value: '2_weeks', label: '2 Weeks Before' },
    { value: '3_weeks', label: '3 Weeks Before' },
    { value: '1_month', label: '1 Month Before' },
    { value: 'custom_time_before', label: 'Custom Time Before' }
];

export const getReminderMsToSubtract = (preset: string, value: string, unit: string): number => {
    let ms = 0;
    if (preset === 'custom_time_before') {
        const val = parseInt(value);
        if (!isNaN(val)) {
            if (unit === 'Minutes') ms = val * 60000;
            if (unit === 'Hours') ms = val * 3600000;
            if (unit === 'Days') ms = val * 86400000;
            if (unit === 'Weeks') ms = val * 604800000;
            if (unit === 'Months') ms = val * 30 * 86400000;
        }
    } else {
        switch (preset) {
            case '5_minutes': ms = 5 * 60000; break;
            case '10_minutes': ms = 10 * 60000; break;
            case '15_minutes': ms = 15 * 60000; break;
            case '30_minutes': ms = 30 * 60000; break;
            case '1_hour': ms = 60 * 60000; break;
            case '1_day': ms = 24 * 3600000; break;
            case '2_days': ms = 48 * 3600000; break;
            case '3_days': ms = 72 * 3600000; break;
            case '1_week': ms = 7 * 24 * 3600000; break;
            case '2_weeks': ms = 14 * 24 * 3600000; break;
            case '3_weeks': ms = 21 * 24 * 3600000; break;
            case '1_month': ms = 30 * 24 * 3600000; break;
        }
    }
    return ms;
};