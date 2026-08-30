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

export const CREDIT_CATEGORY_OPTIONS: ConfigOption[] = [
    { label: 'Revolving', value: 'Revolving' },
    { label: 'Corporate', value: 'Corporate' },
    { label: 'Charge', value: 'Charge' },
    { label: 'Vendor / Net Accounts', value: 'Vendor / Net Accounts' },
    { label: 'Fleet / Fuel', value: 'Fleet / Fuel' },
    { label: 'Retail / Store Credit', value: 'Retail / Store Credit' },
    { label: 'Auto / Tire', value: 'Auto / Tire' }
];

export const STATUS_ACTIVE = 'Active';
export const STATUS_INACTIVE = 'Inactive';

export const STATUS_OPTIONS: ConfigOption[] = [
    { label: STATUS_ACTIVE, value: STATUS_ACTIVE },
    { label: STATUS_INACTIVE, value: STATUS_INACTIVE }
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

export const YES_NO_OPTIONS: ConfigOption[] = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No', value: 'No' }
];

export const STATUS_CLASS_MAP: { [key: string]: string } = {
    'Active': 'bg-success-subtle text-success',
    'Inactive': 'bg-danger-subtle text-danger'
};