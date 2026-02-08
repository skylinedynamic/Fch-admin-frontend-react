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
