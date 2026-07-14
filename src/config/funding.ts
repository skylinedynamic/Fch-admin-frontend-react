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

export const FUNDING_REVIEW_STATUS_COLORS: Record<string, string> = {
    [FUNDING_REVIEW_STATUS.PENDING]: '#F59E0B',    // Orange
    [FUNDING_REVIEW_STATUS.IN_PROGRESS]: '#3B82F6',// Blue
    [FUNDING_REVIEW_STATUS.ACCEPTED]: '#06B6D4',   // Teal/Cyan
    [FUNDING_REVIEW_STATUS.APPROVED]: '#10B981',   // Green
    [FUNDING_REVIEW_STATUS.REJECTED]: '#EF4444',   // Red
};

export const FUNDING_REVIEW_STATUS_OPTIONS = [
    { label: 'Pending', value: FUNDING_REVIEW_STATUS.PENDING },
    { label: 'Accepted', value: FUNDING_REVIEW_STATUS.ACCEPTED },
    { label: 'In Progress', value: FUNDING_REVIEW_STATUS.IN_PROGRESS },
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
    "Personal Credit",
    "Revenue",
    "Time in Business",
    "Banking Activity",
    "Minimum Monthly Deposits",
    "Monthly Deposit Count",
    "Minimum Average Daily Balance",
    "Max NSF",
    "Negative Days",
];

export const DEFAULT_READINESS_FACTORS = [
    "Personal Credit",
    "Revenue",
    "Time in Business",
    "Banking Activity",
    "Minimum Monthly Deposits"
];

export const TIB_OPTIONS = [
    { label: '0 Month', value: 0 },
    { label: '1 month', value: 1 },
    { label: '3 months', value: 3 },
    { label: '6 months', value: 6 },
    { label: '12 months', value: 12 },
    { label: '24 months', value: 24 },
    { label: '36 months', value: 36 }
];

export const INDUSTRIES_OPTIONS = [
    { label: 'Accountant', value: 'Accountant' },
    { label: 'Acute Care Facility', value: 'Acute Care Facility' },
    { label: 'Aerospace', value: 'Aerospace' },
    { label: 'Assisted Living Facility', value: 'Assisted Living Facility' },
    { label: 'Alternative Energy Production', value: 'Alternative Energy Production' },
    { label: 'Architect', value: 'Architect' },
    { label: 'Architectural Services', value: 'Architectural Services' },
    { label: 'Auditory Center', value: 'Auditory Center' },
    { label: 'Automotive Parts Store', value: 'Automotive Parts Store' },
    { label: 'Automotive Repair', value: 'Automotive Repair' },
    { label: 'Automotive Services', value: 'Automotive Services' },
    { label: 'Bakery', value: 'Bakery' },
    { label: 'Bar/Tavern', value: 'Bar/Tavern' },
    { label: 'Barber Shop', value: 'Barber Shop' },
    { label: 'Beauty Salon', value: 'Beauty Salon' },
    { label: 'Bed & Breakfast', value: 'Bed & Breakfast' },
    { label: 'Bicycle Shop', value: 'Bicycle Shop' },
    { label: 'Book Store', value: 'Book Store' },
    { label: 'Bottling & Distribution', value: 'Bottling & Distribution' },
    { label: 'Bowling Alley', value: 'Bowling Alley' },
    { label: 'Brewery', value: 'Brewery' },
    { label: 'Cafe in Fitness Center', value: 'Cafe in Fitness Center' },
    { label: 'Cancer Radiology Center', value: 'Cancer Radiology Center' },
    { label: 'Cancer Treatment Facility', value: 'Cancer Treatment Facility' },
    { label: 'Candy Store', value: 'Candy Store' },
    { label: 'Car Wash', value: 'Car Wash' },
    { label: 'Caterer', value: 'Caterer' },
    { label: 'Cheese Store', value: 'Cheese Store' },
    { label: 'Chemical & Related Manufacturing', value: 'Chemical & Related Manufacturing' },
    { label: 'Chiropractor', value: 'Chiropractor' },
    { label: 'Cigar Store', value: 'Cigar Store' },
    { label: 'Clinic', value: 'Clinic' },
    { label: 'Coffee Shop', value: 'Coffee Shop' },
    { label: 'Coin-Operated Laundries', value: 'Coin-Operated Laundries' },
    { label: 'Commercial Inspection Services', value: 'Commercial Inspection Services' },
    { label: 'Commercial Janitorial Services', value: 'Commercial Janitorial Services' },
    { label: 'Commercial Landscaping Services', value: 'Commercial Landscaping Services' },
    { label: 'Communication Company', value: 'Communication Company' },
    { label: 'Computer Software', value: 'Computer Software' },
    { label: 'Cosmetic/Plastic Surgery', value: 'Cosmetic/Plastic Surgery' },
    { label: 'Defense Contractor', value: 'Defense Contractor' },
    { label: 'Defense Electronics', value: 'Defense Electronics' },
    { label: 'Dentist', value: 'Dentist' },
    { label: 'Diagnostic Imaging Center', value: 'Diagnostic Imaging Center' },
    { label: 'Diners', value: 'Diners' },
    { label: 'Distillery', value: 'Distillery' },
    { label: 'Doctor', value: 'Doctor' },
    { label: 'Drug Manufacturing', value: 'Drug Manufacturing' },
    { label: 'Dry Cleaner', value: 'Dry Cleaner' },
    { label: 'E-Commerce', value: 'E-Commerce' },
    { label: 'Electrical Contractors', value: 'Electrical Contractors' },
    { label: 'Electronic Store', value: 'Electronic Store' },
    { label: 'Electronics Manufacturing', value: 'Electronics Manufacturing' },
    { label: 'Engineer', value: 'Engineer' },
    { label: 'Endodontist', value: 'Endodontist' },
    { label: 'Florist', value: 'Florist' },
    { label: 'Food Gift Basket Store', value: 'Food Gift Basket Store' },
    { label: 'Food Manufacturing', value: 'Food Manufacturing' },
    { label: 'Food Processing & Sales', value: 'Food Processing & Sales' },
    { label: 'Funeral Homes', value: 'Funeral Homes' },
    { label: 'Gift Store', value: 'Gift Store' },
    { label: 'Gourmet Food Store', value: 'Gourmet Food Store' },
    { label: 'Gourmet Popcorn Store', value: 'Gourmet Popcorn Store' },
    { label: 'Grocery Store', value: 'Grocery Store' },
    { label: 'Ham Store', value: 'Ham Store' },
    { label: 'Hardware Store', value: 'Hardware Store' },
    { label: 'Healthcare Professional', value: 'Healthcare Professional' },
    { label: 'Home Healthcare', value: 'Home Healthcare' },
    { label: 'Hospital', value: 'Hospital' },
    { label: 'Hotel', value: 'Hotel' },
    { label: 'HVAC Contractors', value: 'HVAC Contractors' },
    { label: 'Ice Cream/Yogurt Store', value: 'Ice Cream/Yogurt Store' },
    { label: 'IT Hardware Sales', value: 'IT Hardware Sales' },
    { label: 'IT Services', value: 'IT Services' },
    { label: 'Legal Services', value: 'Legal Services' },
    { label: 'Liquor Store', value: 'Liquor Store' },
    { label: 'Locksmith & Security', value: 'Locksmith & Security' },
    { label: 'Mail & Package Store', value: 'Mail & Package Store' },
    { label: 'Mall Food Outlet', value: 'Mall Food Outlet' },
    { label: 'Manufacturing', value: 'Manufacturing' },
    { label: 'Meat processing & products', value: 'Meat processing & products' },
    { label: 'Medical Equipment', value: 'Medical Equipment' },
    { label: 'Medical Services', value: 'Medical Services' },
    { label: 'Medical Spa', value: 'Medical Spa' },
    { label: 'Medical Supplies', value: 'Medical Supplies' },
    { label: 'Motel', value: 'Motel' },
    { label: 'Nail Salon', value: 'Nail Salon' },
    { label: 'Nightclub', value: 'Nightclub' },
    { label: 'Nursing Home', value: 'Nursing Home' },
    { label: 'Nutritional & Dietary Supplies', value: 'Nutritional & Dietary Supplies' },
    { label: 'Optical/Vision Store', value: 'Optical/Vision Store' },
    { label: 'Orthodontist', value: 'Orthodontist' },
    { label: 'Periodontist', value: 'Periodontist' },
    { label: 'Pet Store', value: 'Pet Store' },
    { label: 'Pharmaceuticals & Health Products', value: 'Pharmaceuticals & Health Products' },
    { label: 'Pharmacy', value: 'Pharmacy' },
    { label: 'Photo Studio', value: 'Photo Studio' },
    { label: 'Physical Rehabilitation', value: 'Physical Rehabilitation' },
    { label: 'Plumbing Contractors', value: 'Plumbing Contractors' },
    { label: 'Prepackaged Meals', value: 'Prepackaged Meals' },
    { label: 'Printing & Publishing', value: 'Printing & Publishing' },
    { label: 'Professional Sports Equipment', value: 'Professional Sports Equipment' },
    { label: 'Quick Copy/Printing', value: 'Quick Copy/Printing' },
    { label: 'Radio Station/Services', value: 'Radio Station/Services' },
    { label: 'Restaurant', value: 'Restaurant' },
    { label: 'Retail Store – Other', value: 'Retail Store – Other' },
    { label: 'Smoothie Shop', value: 'Smoothie Shop' },
    { label: 'Spa', value: 'Spa' },
    { label: 'Sporting Goods Store', value: 'Sporting Goods Store' },
    { label: 'Steel Fabricator', value: 'Steel Fabricator' },
    { label: 'Steel Production', value: 'Steel Production' },
    { label: 'Trash Collection & Waste Management', value: 'Trash Collection & Waste Management' },
    { label: 'Urgent Care Facility', value: 'Urgent Care Facility' },
    { label: 'Veterinarian', value: 'Veterinarian' },
    { label: 'Wholesale', value: 'Wholesale' },
    { label: 'Winery', value: 'Winery' },
];

export const getFundingReviewProgress = (status: string) => {
    if (status === 'SUBMITTED') return 10;
    if (status === FUNDING_REVIEW_STATUS.PENDING) return 20;
    if (status === FUNDING_REVIEW_STATUS.ACCEPTED) return 40;
    if (status === FUNDING_REVIEW_STATUS.IN_PROGRESS) return 70;
    if (status === FUNDING_REVIEW_STATUS.APPROVED) return 100;
    if (status === FUNDING_REVIEW_STATUS.REJECTED) return 100;
    return 0;
};

export const FUNDING_REVIEW_TIMELINE_STEPS = [
    {
        key: 'SUBMITTED',
        label: 'Submitted',
        icon: 'ri-file-list-3-line',
    },
    {
        key: FUNDING_REVIEW_STATUS.PENDING,
        label: 'Pending',
        icon: 'ri-time-line',
    },
    {
        key: FUNDING_REVIEW_STATUS.ACCEPTED,
        label: 'Accepted',
        icon: 'ri-checkbox-circle-line',
    },
    {
        key: FUNDING_REVIEW_STATUS.IN_PROGRESS,
        label: 'In Progress',
        subtext: 'Under Review',
        icon: 'ri-user-3-fill',
    },
    {
        key: FUNDING_REVIEW_STATUS.APPROVED,
        label: 'Approved',
        icon: 'ri-user-follow-line',
    },
    {
        key: FUNDING_REVIEW_STATUS.REJECTED,
        label: 'Rejected',
        icon: 'ri-user-unfollow-line',
    },
];

export const FUNDING_REVIEW_GUIDELINE_CARDS = [
    {
        label: 'Pending',
        desc: 'Request submitted and waiting for review.',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        iconBg: '#16a34a',
        icon: 'ri-time-line'
    },
    {
        label: 'Accepted',
        desc: 'Review completed successfully.',
        bg: '#fefce8',
        border: '#fef08a',
        iconBg: '#eab308',
        icon: 'ri-check-line'
    },
    {
        label: 'In Progress',
        desc: 'Admin/Partner can reviewing the request.',
        bg: '#eff6ff',
        border: '#bfdbfe',
        iconBg: '#3b82f6',
        icon: 'ri-shield-user-fill'
    },
    {
        label: 'Approved',
        desc: 'Borrower can start funding application.',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        iconBg: '#16a34a',
        icon: 'ri-check-line'
    },
    {
        label: 'Rejected',
        desc: 'Request declined missing information.',
        bg: '#fef2f2',
        border: '#fecaca',
        iconBg: '#ef4444',
        icon: 'ri-close-line'
    }
];

export const QUALIFY_REASONS_MAP: Record<string, string> = {
    'Business Credit': 'Business profile meets our lending standards',
    'Revenue': 'Revenue exceeds minimum threshold',
    'Time in Business': 'Time in business exceeds requirement',
    'Banking Activity': 'Banking activity shows consistent deposits',
    'Documents': 'Required documents have been provided',
    'Minimum Monthly Deposits': 'Deposit volume meets minimum requirements',
    'Monthly Deposit Count': 'Deposit frequency meets minimum requirements',
    'Minimum Average Daily Balance': 'Average daily balance meets minimum requirements',
    'Max NSF / Negative Days': 'Banking history meets minimum NSF/negative day requirements'
};

export const FACTOR_STATUS_VALUES = {
    GOOD: 'good',
    STRONG: 'strong',
    ELIGIBLE: 'eligible',
    MISSING: 'missing',
    RESTRICTED: 'restricted',
    FAIR: 'fair',
    WEAK: 'weak',
};

export const READINESS_FACTOR_LABELS = {
    RESTRICTED_STATE: 'Restricted State',
    STATE_ELIGIBILITY: 'State Eligibility',
    RESTRICTED_INDUSTRY: 'Restricted Industry',
    INDUSTRY_ELIGIBILITY: 'Industry Eligibility',
};

export const BADGE_LABELS = {
    RESTRICTED: 'Restricted',
    ELIGIBLE: 'Eligible',
};

export const FACTOR_ICON_STYLES: Record<string, { icon: string, color: string }> = {
    [FACTOR_STATUS_VALUES.GOOD]: { icon: 'ri-checkbox-circle-fill', color: '#10b981' },
    [FACTOR_STATUS_VALUES.ELIGIBLE]: { icon: 'ri-checkbox-circle-fill', color: '#10b981' },
    [FACTOR_STATUS_VALUES.STRONG]: { icon: 'ri-star-fill', color: '#3b82f6' },
    [FACTOR_STATUS_VALUES.MISSING]: { icon: 'ri-close-circle-fill', color: '#ef4444' },
    [FACTOR_STATUS_VALUES.RESTRICTED]: { icon: 'ri-close-circle-fill', color: '#ef4444' },
};

export const READINESS_BADGE_STYLES: Record<string, { icon: string; bg: string; color: string }> = {
    [FACTOR_STATUS_VALUES.GOOD]: { icon: 'ri-checkbox-circle-fill', bg: '#e8f9f0', color: '#1a7a4a' },
    [FACTOR_STATUS_VALUES.STRONG]: { icon: 'ri-checkbox-circle-fill', bg: '#dbeafe', color: '#1d4ed8' },
    [FACTOR_STATUS_VALUES.FAIR]: { icon: 'ri-error-warning-fill', bg: '#fef3c7', color: '#92400e' },
    [FACTOR_STATUS_VALUES.MISSING]: { icon: 'ri-information-fill', bg: '#fff3cd', color: '#92400e' },
    [FACTOR_STATUS_VALUES.WEAK]: { icon: 'ri-close-circle-fill', bg: '#fee2e2', color: '#991b1b' },
    [FACTOR_STATUS_VALUES.RESTRICTED]: { icon: 'ri-close-circle-fill', bg: '#fee2e2', color: '#ef4444' },
    [FACTOR_STATUS_VALUES.ELIGIBLE]: { icon: 'ri-checkbox-circle-fill', bg: '#e8f9f0', color: '#10b981' },
};

export const META_ITEM_LABELS = {
    RECOMMENDED_RANGE: 'Recommended Range',
    TERM: 'Term',
    SPEED_TO_FUNDS: 'Speed to Funds',
    USES: 'Uses',
};
