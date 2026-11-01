import { DEFAULT_REMINDER_RECIPIENT, DEFAULT_TASK_PRIORITY, DEFAULT_TASK_STATUS } from '../../config/activityTask';
import type { ActivityTask } from './types';

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
    'assign_task',
    'assigned_to',
    'task_due_date',
    'task_priority',
    'task_status',
    'reminder_recipient',
] as const;

export const ACTIVITY_EDIT_ERROR_FIELDS = [
    'reference',
    'activity_date',
    'subject',
    'description',
    'remind_at',
    'visibility',
    'assign_task',
    'assigned_to',
    'task_due_date',
    'task_priority',
    'task_status',
    'reminder_recipient',
] as const;

// "Want to Assign": only a Task activity can be handed to a staff member, with
// its own due date, priority and status (values in config/activityTask.ts).
export const ACTIVITY_TASK_REFERENCE = 'Task';
export { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '../../config/activityTask';

export const DEFAULT_TASK_ASSIGNMENT = {
    assign_task: false,
    assigned_to: '',
    task_due_date: '',
    task_priority: DEFAULT_TASK_PRIORITY,
    task_status: DEFAULT_TASK_STATUS,
};

export interface TaskAssignmentForm {
    reference?: string;
    assign_task?: boolean;
    assigned_to?: string | number;
    task_due_date?: string;
    task_priority?: string;
    task_status?: string;
}

// The edit form's "Want to Assign" values for an activity's saved task.
export const taskAssignmentFromActivity = (task?: ActivityTask | null) => (
    task
        ? {
            assign_task: true,
            assigned_to: task.assigned_to != null ? String(task.assigned_to) : '',
            task_due_date: task.due_date ?? '',
            task_priority: task.priority ?? DEFAULT_TASK_PRIORITY,
            task_status: task.status ?? DEFAULT_TASK_STATUS,
        }
        : DEFAULT_TASK_ASSIGNMENT
);

// The edit request's task fields: always says whether the task is assigned,
// so turning "Want to Assign" off (or leaving Task) un-assigns it.
export const buildTaskEditFields = (form: TaskAssignmentForm): Record<string, string> => ({
    assign_task: '0',
    ...buildTaskAssignmentFields(form),
});

// The create request's task fields — none at all unless a Task is being assigned.
export const buildTaskAssignmentFields = (form: TaskAssignmentForm): Record<string, string> => {
    if (!form.assign_task || form.reference !== ACTIVITY_TASK_REFERENCE) {
        return {};
    }

    return {
        assign_task: '1',
        assigned_to: String(form.assigned_to ?? ''),
        task_due_date: form.task_due_date ?? '',
        task_priority: form.task_priority ?? '',
        task_status: form.task_status ?? '',
    };
};

// "Who gets the reminder": asked only when an assigned Task sets a reminder.
export interface ReminderRecipientForm extends TaskAssignmentForm {
    remind_me?: boolean;
    reminder_recipient?: string;
}

export const asksReminderRecipient = (form: ReminderRecipientForm): boolean =>
    !!form.remind_me && !!form.assign_task && form.reference === ACTIVITY_TASK_REFERENCE;

export const buildReminderRecipientField = (form: ReminderRecipientForm): Record<string, string> =>
    asksReminderRecipient(form)
        ? { reminder_recipient: form.reminder_recipient || DEFAULT_REMINDER_RECIPIENT }
        : {};

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
// can't show inline, so no validation error is ever silent. Null when every
// error is already shown inline — a toast would only repeat it.
export const getActivityValidationToast = (
    errors: ActivityFieldErrors,
    shownFields: readonly string[]
): string | null => {
    const unshown = Object.keys(errors).find((field) => !shownFields.includes(field));
    return unshown ? errors[unshown][0] : null;
};

// The form's errors after a validation failure: each field's own message, plus
// any message with no field to sit under as `form` (shown above the form) -
// validation is never toasted.
export const withFormLevelError = (
    errors: ActivityFieldErrors,
    shownFields: readonly string[]
): ActivityFieldErrors => {
    const unshown = getActivityValidationToast(errors, shownFields);
    return unshown ? { ...errors, form: [unshown] } : errors;
};
