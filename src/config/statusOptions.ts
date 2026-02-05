export interface StatusOption {
    label: string;
    value: string;
}

export const STATUS: StatusOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
];

export const PAYMENT_STATUS_OPTIONS: StatusOption[] = [
    { label: 'Draft', value: 'Draft' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Cancelled', value: 'Cancelled' }
];

export const COMMISSION_STATUS_OPTIONS: StatusOption[] = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Declined', value: 'Declined' }
];

// Status to CSS class mappings for badges
export const PAYMENT_STATUS_CLASS_MAP: { [key: string]: string } = {
    'draft': 'bg-secondary-subtle text-secondary',
    'pending': 'bg-warning-subtle text-warning',
    'paid': 'bg-success-subtle text-success',
    'cancelled': 'bg-danger-subtle text-danger'
};

export const COMMISSION_STATUS_CLASS_MAP: { [key: string]: string } = {
    'pending': 'bg-warning-subtle text-warning',
    'approved': 'bg-success-subtle text-success',
    'declined': 'bg-danger-subtle text-danger'
};
