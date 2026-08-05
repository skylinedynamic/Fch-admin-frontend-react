export const STATUS_ACTIVE = 'Active';
export const STATUS_EXPIRED = 'Expired';
export const STATUS_PENDING = 'Pending';
export const STATUS_ALL = 'All Statuses';

export const SUBSCRIPTION_STATUS_OPTIONS = [
    { label: STATUS_ACTIVE, value: STATUS_ACTIVE },
    { label: STATUS_EXPIRED, value: STATUS_EXPIRED },
    { label: STATUS_PENDING, value: STATUS_PENDING }
];

export const SUBSCRIPTION_STATUS_COLORS: { [key: string]: string } = {
    [STATUS_ACTIVE]: 'success',
    [STATUS_EXPIRED]: 'danger',
    [STATUS_PENDING]: 'warning'
};

export const ENROLLMENT_TYPE_ONE_TIME = 'One Time Payment';
export const ENROLLMENT_TYPE_INSTALLMENT = 'Installment';

export const ENROLLMENT_TYPE_OPTIONS = [
    { label: ENROLLMENT_TYPE_ONE_TIME, value: ENROLLMENT_TYPE_ONE_TIME },
    { label: ENROLLMENT_TYPE_INSTALLMENT, value: ENROLLMENT_TYPE_INSTALLMENT }
];

export const PLAN_GROUP_PARTNER_ENROLLMENT = 'partner_enrollment';
export const PLAN_GROUP_BORROWER_ENROLLMENT = 'borrower_enrollment';
export const PLAN_GROUP_BORROWER_FEE = 'borrower_fee';
export const PLAN_GROUP_USER_SEAT = 'user_seat';
export const PLAN_GROUP_UNASSIGNED = 'unassigned';

// Helper for identifying installment plans
export const checkIsInstallmentPlan = (plan: {
    is_installment?: boolean | number;
    enrollment_type_slug?: string | null;
    enrollment_type?: string | null;
}) => {
    if (!!plan.is_installment) return true;
    const target = ENROLLMENT_TYPE_INSTALLMENT.toLowerCase();
    const slug = (plan.enrollment_type_slug || '').toLowerCase();
    const name = (plan.enrollment_type || '').toLowerCase();
    return slug === target || name === target;
};
