export interface ConfigOption {
    label: string;
    value: string;
}

export const CATEGORY_OPTIONS: ConfigOption[] = [
    { label: 'Shipping & Packaging', value: 'Shipping & Packaging' },
    { label: 'Other', value: 'Other' }
];

export const STATUS_OPTIONS: ConfigOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
];

export const REPORT_TO_OPTIONS: ConfigOption[] = [
    { label: 'D&B', value: 'D&B' },
    { label: 'Experian', value: 'Experian' },
    { label: 'Equifax', value: 'Equifax' }
];


// Verification Status Options
export const VERIFICATION_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'verified',
    REJECTED: 'rejected'
};

// Tier Status Options
export const TIER_STATUS_OPTIONS = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
];
