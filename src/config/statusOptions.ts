export interface StatusOption {
    label: string;
    value: string;
}

export const STATUS_ACTIVE = 'Active';
export const STATUS_INACTIVE = 'Inactive';
export const STATUS_SUSPENDED = 'Suspended';

export const STATUS: StatusOption[] = [
    { label: STATUS_ACTIVE, value: STATUS_ACTIVE },
    { label: STATUS_INACTIVE, value: STATUS_INACTIVE },
    { label: STATUS_SUSPENDED, value: STATUS_SUSPENDED },
];

export const USER_STATUS: StatusOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
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

export const BORROWER_STATUS_CLASS_MAP: { [key: string]: string } = {
    'Active': 'bg-success-subtle text-success',
    'Inactive': 'bg-secondary-subtle text-secondary',
    'Suspended': 'bg-warning-subtle text-warning',
    'OnBoarding': 'bg-info-subtle text-info',
};


export const BORROWER_STATUS: StatusOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Suspended', value: 'Suspended' },
    { label: 'OnBoarding', value: 'OnBoarding' },
];
