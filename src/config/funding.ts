export const FUNDING_ICON_MAP: Record<string, string> = {
    'credit-card': 'bank-card',
    'shopping-cart': 'shopping-cart-2',
    'star': 'star',
    'refresh-cw': 'refresh',
    'landmark': 'bank',
    'camera': 'camera',
    'trending-up': 'line-chart',
    'settings': 'settings-3',
    'file-text': 'file-text',
    'briefcase': 'briefcase',
    'truck': 'truck',
    'building': 'building-4',
    'link': 'links',
    'tool': 'tools',
    'hard-hat': 'user-settings',
    'dollar-sign': 'money-dollar-circle',
    'percent': 'percent',
    'home': 'home-4',
    'bar-chart': 'bar-chart-2',
    'pie-chart': 'pie-chart',
    'shield': 'shield-check',
    'check-circle': 'checkbox-circle',
    'users': 'team',
    'user': 'user-3',
    'globe': 'global',
    'map-pin': 'map-pin',
    'clock': 'time',
    'calendar': 'calendar-event',
    'phone': 'phone',
    'mail': 'mail',
    'award': 'award',
    'layers': 'stack',
    'package': 'archive',
    'box': 'inbox',
    'leaf': 'plant',
    'anchor': 'anchor',
    'cpu': 'cpu',
    'zap': 'flashlight',
    'cloud': 'cloud',
    'database': 'database-2',
};

export const FUNDING_COLOR_MAP: Record<string, string> = {
    'green': 'success',
    'blue': 'primary',
    'purple': 'secondary',
    'orange': 'warning',
    'red': 'danger',
    'teal': 'info',
};

export interface SelectOption {
    label: string;
    value: string | null;
}

export const FUNDING_STATUS_OPTIONS: SelectOption[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' }
];

export const FUNDING_REVIEW_STATUS = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    APPROVED: 'Approved',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected'
};

export const FUNDING_REVIEW_STATUS_OPTIONS = [
    { label: 'Pending', value: FUNDING_REVIEW_STATUS.PENDING },
    { label: 'In Progress', value: FUNDING_REVIEW_STATUS.IN_PROGRESS },
    { label: 'Accepted', value: FUNDING_REVIEW_STATUS.ACCEPTED },
    { label: 'Approved', value: FUNDING_REVIEW_STATUS.APPROVED },
    { label: 'Rejected', value: FUNDING_REVIEW_STATUS.REJECTED }
];

export const FUNDING_CATEGORY_OPTIONS: SelectOption[] = [
    { label: 'Credit Cards', value: 'Credit Cards' },
    { label: 'Working Capital', value: 'Working Capital' },
    { label: 'Equipment', value: 'Equipment' },
    { label: 'Real Estate', value: 'Real Estate' },
    { label: 'SBA Loans', value: 'SBA Loans' },
    { label: 'Lines of Credit', value: 'Lines of Credit' },
    { label: 'Term Loans', value: 'Term Loans' },
    { label: 'Invoice Financing', value: 'Invoice Financing' }
];

export const USES_OPTIONS: SelectOption[] = [
    { label: 'Working Capital', value: 'Working Capital' },
    { label: 'Inventory', value: 'Inventory' },
    { label: 'Payroll', value: 'Payroll' },
    { label: 'Expansion', value: 'Expansion' },
    { label: 'Equipment', value: 'Equipment' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Refinance Debt', value: 'Refinance Debt' },
    { label: 'New Construction', value: 'New Construction' },
    { label: 'Ground-Up Development', value: 'Ground-Up Development' },
    { label: 'Land Development', value: 'Land Development' },
    { label: 'Renovation', value: 'Renovation' },
    { label: 'Commercial Property', value: 'Commercial Property' },
];

export const READINESS_FACTOR_STATUS_OPTIONS: SelectOption[] = [
    { label: 'Good', value: 'Good' },
    { label: 'Strong', value: 'Strong' },
    { label: 'Missing', value: 'Missing' }
];

export const READINESS_FACTORS_OPTIONS = [
    "Business Credit",
    "Revenue",
    "Time in Business",
    "Banking Activity",
    "Minimum Monthly Deposits",
    "Monthly Deposit Count",
    "Minimum Average Daily Balance",
    "Max NSF / Negative Days",
];

export const TIB_OPTIONS = [
    { label: '1 month', value: 1 },
    { label: '3 months', value: 3 },
    { label: '6 months', value: 6 },
    { label: '12 months', value: 12 },
    { label: '24 months', value: 24 },
    { label: '36 months', value: 36 }
];

export const RESTRICTED_INDUSTRIES_OPTIONS = [
    { label: 'Adult Entertainment', value: 'Adult Entertainment' },
    { label: 'Cannabis / THC / CBD', value: 'Cannabis / THC / CBD' },
    { label: 'Firearm / Ammo / Weapon Sales', value: 'Firearm / Ammo / Weapon Sales' },
    { label: 'Furniture Stores', value: 'Furniture Stores' },
    { label: 'Gambling / Lotteries', value: 'Gambling / Lotteries' },
    { label: 'Gas Stations', value: 'Gas Stations' },
    { label: 'General Contractors', value: 'General Contractors' },
    { label: 'Gyms / Personal Trainers', value: 'Gyms / Personal Trainers' },
    { label: 'Home-Based Businesses', value: 'Home-Based Businesses' },
    { label: 'Insurance', value: 'Insurance' },
    { label: 'Investment Opportunities', value: 'Investment Opportunities' },
    { label: 'Jewelry Stores', value: 'Jewelry Stores' },
    { label: 'Marketing / Advertising Agencies', value: 'Marketing / Advertising Agencies' },
    { label: 'Mobile Food Services', value: 'Mobile Food Services' },
    { label: 'Money Service Businesses', value: 'Money Service Businesses' },
    { label: 'Online Auctions', value: 'Online Auctions' },
    { label: 'Real Estate Brokers', value: 'Real Estate Brokers' },
    { label: 'Staffing Agencies', value: 'Staffing Agencies' },
    { label: 'Telemarketing / Lead Generation', value: 'Telemarketing / Lead Generation' },
    { label: 'Trucking', value: 'Trucking' },
];
