export interface StatusOption {
    label: string;
    value: string;
}

export const STATUS: StatusOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
];

export const PAYMENT_STATUS_OPTIONS: StatusOption[] = [
    { label: 'Paid', value: 'Paid' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Unpaid', value: 'Unpaid' }
];

export const COMMISSION_STATUS_OPTIONS: StatusOption[] = [
    { label: 'Draft', value: 'Draft' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Declined', value: 'Declined' }
];

// Status to CSS class mappings for badges
export const PAYMENT_STATUS_CLASS_MAP: { [key: string]: string } = {
    'Pending': 'bg-warning-subtle text-warning',
    'Paid': 'bg-success-subtle text-success',
    'Unpaid': 'bg-danger-subtle text-danger'
};

export const COMMISSION_STATUS_CLASS_MAP: { [key: string]: string } = {
    'Draft': 'bg-warning-subtle text-warning',
    'Pending': 'bg-warning-subtle text-warning',
    'Approved': 'bg-success-subtle text-success',
    'Declined': 'bg-danger-subtle text-danger'
};
