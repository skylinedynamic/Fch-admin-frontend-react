export interface ConfigOption {
    label: string;
    value: string;
}

export const CATEGORY_OPTIONS: ConfigOption[] = [
    { label: 'Shipping & Packaging', value: 'Shipping & Packaging' },
    { label: 'Warehouse, Safety & Shipping', value: 'Warehouse, Safety & Shipping' },
    { label: 'Safety & Compliance Supplies', value: 'Safety & Compliance Supplies' },
    { label: 'Office Supplies', value: 'Office Supplies' },
    { label: 'Industrial / MRO', value: 'Industrial / MRO' },
    { label: 'MSC Industrial Supply', value: 'MSC Industrial Supply' },
    { label: 'Crown Office Supplies', value: 'Crown Office Supplies' },
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

export const VENDOR_STATUS_OPTIONS = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive'
};