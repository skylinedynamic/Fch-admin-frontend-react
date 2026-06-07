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
];

export const READINESS_FACTOR_STATUS_OPTIONS: SelectOption[] = [
    { label: 'Good', value: 'Good' },
    { label: 'Strong', value: 'Strong' },
    { label: 'Missing', value: 'Missing' }
];
