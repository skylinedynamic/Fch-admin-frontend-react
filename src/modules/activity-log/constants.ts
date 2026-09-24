// The activity's summary becomes the reminder's title too. The API's
// Store/UpdateActivityLogRequest enforce the same limit.
export const ACTIVITY_SUMMARY_MAX_LENGTH = 200;

// Fields each activity form shows its own validation message under. An error
// for any other field has nowhere to appear on the form, so it is toasted.
export const ACTIVITY_CREATE_ERROR_FIELDS = [
    'log_type',
    'reference',
    'activity_date',
    'subject',
    'description',
    'attachments',
    'remind_at',
    'visibility',
] as const;

export const ACTIVITY_EDIT_ERROR_FIELDS = [
    'reference',
    'activity_date',
    'subject',
    'description',
    'remind_at',
    'visibility',
] as const;

// The 4-level visibility model. Host users get all 4; Partner users get
// "Private (Only Me)", "Internal" (team scoped), and "Everyone (Including Borrower)".
export const VISIBILITY_OPTIONS_HOST = [
    { value: 'private', label: 'Private (Only Me)' },
    { value: 'internal', label: 'Internal' },
    { value: 'partner', label: 'Partner' },
    { value: 'everyone', label: 'Everyone (Including Borrower)' },
] as const;

export const VISIBILITY_OPTIONS_PARTNER = [
    { value: 'private', label: 'Private (Only Me)' },
    { value: 'partner', label: 'Internal' },
    { value: 'everyone', label: 'Everyone (Including Borrower)' },
] as const;

export const getVisibilityOptions = (isHost?: boolean) => (isHost ? VISIBILITY_OPTIONS_HOST : VISIBILITY_OPTIONS_PARTNER);

// Timeline badge styling per visibility level, keyed by shared source of truth.
export const VISIBILITY_BADGE_STYLES: Record<string, { label: string; className: string; icon: string }> = {
    private: { label: 'Private', className: 'bg-secondary-subtle text-secondary', icon: 'ri-lock-2-line' },
    internal: { label: 'Internal', className: 'bg-danger-subtle text-danger', icon: 'ri-shield-user-line' },
    partner: { label: 'Internal', className: 'bg-warning-subtle text-warning', icon: 'ri-team-line' },
    everyone: { label: 'Everyone', className: 'bg-info-subtle text-info', icon: 'ri-global-line' },
};

export type ActivityFieldErrors = Record<string, string[]>;

// The API sends each field's errors as a string or an array of strings.
export const normalizeActivityFieldErrors = (errors: Record<string, string | string[]>): ActivityFieldErrors =>
    Object.fromEntries(
        Object.entries(errors).map(([field, error]) => [field, Array.isArray(error) ? error : [error]])
    );

// What to toast after a validation failure: the first error of a field the form
// can't show inline, otherwise a pointer to the highlighted fields — so no
// validation error is ever silent.
export const getActivityValidationToast = (
    errors: ActivityFieldErrors,
    shownFields: readonly string[]
): string => {
    const unshown = Object.keys(errors).find((field) => !shownFields.includes(field));
    return unshown ? errors[unshown][0] : 'Please fix the highlighted fields.';
};
