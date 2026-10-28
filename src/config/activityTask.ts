/**
 * A Task activity assigned to a staff member ("Want to Assign" in the
 * activity log's New Activity modal). Values mirror ActivityLog::TASK_* in
 * fch-api — change both together.
 */

/** The theme colours an option can be shown in. */
export type ThemeTone = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';

export const TASK_PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
} as const;

export type TaskPriority = typeof TASK_PRIORITY[keyof typeof TASK_PRIORITY];

export const TASK_PRIORITY_OPTIONS = [
    { value: TASK_PRIORITY.LOW, label: 'Low' },
    { value: TASK_PRIORITY.MEDIUM, label: 'Medium' },
    { value: TASK_PRIORITY.HIGH, label: 'High' },
] as const;

export const DEFAULT_TASK_PRIORITY: TaskPriority = TASK_PRIORITY.MEDIUM;

/** Colour of each priority's dot. */
export const TASK_PRIORITY_TONES: Record<TaskPriority, ThemeTone> = {
    [TASK_PRIORITY.LOW]: 'success',
    [TASK_PRIORITY.MEDIUM]: 'warning',
    [TASK_PRIORITY.HIGH]: 'danger',
};

export const TASK_STATUS = {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    COMPLETE: 'complete',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

export const TASK_STATUS_OPTIONS = [
    { value: TASK_STATUS.OPEN, label: 'Open' },
    { value: TASK_STATUS.IN_PROGRESS, label: 'In Progress' },
    { value: TASK_STATUS.COMPLETE, label: 'Complete' },
] as const;

export const DEFAULT_TASK_STATUS: TaskStatus = TASK_STATUS.OPEN;

/** Icon and colour of each status. */
export const TASK_STATUS_VISUALS: Record<TaskStatus, { icon: string; tone: ThemeTone }> = {
    [TASK_STATUS.OPEN]: { icon: 'ri-checkbox-blank-circle-line', tone: 'info' },
    [TASK_STATUS.IN_PROGRESS]: { icon: 'ri-loader-4-line', tone: 'warning' },
    [TASK_STATUS.COMPLETE]: { icon: 'ri-checkbox-circle-line', tone: 'success' },
};

/**
 * The staff member already responsible for the record, shown above
 * "Assigned To": the partner's Agent, the client's Assign to, the lead's
 * Lead Owner, or — for a funding application / request — its borrower's
 * Assign to. Keyed by the activity log's entity type.
 */
export const TASK_OWNER_LABELS: Record<string, string> = {
    Partner: 'Partner Agent',
    Client: 'Client Assigned To',
    Borrower: 'Client Assigned To',
    Lead: 'Lead Owner',
    'Funding Application': 'Borrower Assign to',
    'Funding Request': 'Borrower Assign to',
};

/** Shown on the card when the record has nobody in that role. */
export const TASK_OWNER_UNASSIGNED_TEXT = 'No one has been assigned yet';

/** The responsible staff member a page hands the activity modal. */
export interface TaskOwnerRef {
    id: number | string;
    /** Shown when the person is not in the loaded staff list. */
    name?: string | null;
}
