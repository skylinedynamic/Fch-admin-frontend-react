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
] as const;

export const ACTIVITY_EDIT_ERROR_FIELDS = [
    'reference',
    'activity_date',
    'subject',
    'description',
    'remind_at',
] as const;

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
