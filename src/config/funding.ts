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
    REJECTED: 'Rejected',
    CANCELED: 'Cancelled'
};

export const FUNDING_REVIEW_STATUS_COLORS: Record<string, string> = {
    [FUNDING_REVIEW_STATUS.PENDING]: '#F59E0B',    // Orange
    [FUNDING_REVIEW_STATUS.IN_PROGRESS]: '#3B82F6',// Blue
    [FUNDING_REVIEW_STATUS.ACCEPTED]: '#06B6D4',   // Teal/Cyan
    [FUNDING_REVIEW_STATUS.APPROVED]: '#10B981',   // Green
    [FUNDING_REVIEW_STATUS.REJECTED]: '#EF4444',   // Red
    [FUNDING_REVIEW_STATUS.CANCELED]: '#EF4444',   // Red
};

export const FUNDING_REVIEW_STATUS_OPTIONS = [
    { label: 'Pending', value: FUNDING_REVIEW_STATUS.PENDING },
    { label: 'Accepted', value: FUNDING_REVIEW_STATUS.ACCEPTED },
    { label: 'In Progress', value: FUNDING_REVIEW_STATUS.IN_PROGRESS },
    { label: 'Approved', value: FUNDING_REVIEW_STATUS.APPROVED },
    { label: 'Rejected', value: FUNDING_REVIEW_STATUS.REJECTED },
    { label: 'Cancelled', value: FUNDING_REVIEW_STATUS.CANCELED }
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
    { label: 'Accounts Receivable', value: 'Accounts Receivable' },
    { label: 'Business Acquisition', value: 'Business Acquisition' },
    { label: 'Business Expansion', value: 'Business Expansion' },
    { label: 'Business Line of Credit', value: 'Business Line of Credit' },
    { label: 'Commercial Real Estate Purchase', value: 'Commercial Real Estate Purchase' },
    { label: 'Commercial Real Estate Refinance', value: 'Commercial Real Estate Refinance' },
    { label: 'Debt Refinance / Consolidation', value: 'Debt Refinance / Consolidation' },
    { label: 'Equipment Lease', value: 'Equipment Lease' },
    { label: 'Equipment Purchase', value: 'Equipment Purchase' },
    { label: 'Franchise Purchase', value: 'Franchise Purchase' },
    { label: 'Furniture, Fixtures & Equipment (FF&E)', value: 'Furniture, Fixtures & Equipment (FF&E)' },
    { label: 'Ground-Up Construction', value: 'Ground-Up Construction' },
    { label: 'Inventory', value: 'Inventory' },
    { label: 'Land Purchase / Development', value: 'Land Purchase / Development' },
    { label: 'Marketing / Advertising', value: 'Marketing / Advertising' },
    { label: 'Owner Occupied Commercial Property', value: 'Owner Occupied Commercial Property' },
    { label: 'Partner Buyout', value: 'Partner Buyout' },
    { label: 'Payroll', value: 'Payroll' },
    { label: 'Professional Services', value: 'Professional Services' },
    { label: 'Renovation / Tenant Improvements', value: 'Renovation / Tenant Improvements' },
    { label: 'Startup Costs', value: 'Startup Costs' },
    { label: 'Technology / Software', value: 'Technology / Software' },
    { label: 'Transportation / Fleet', value: 'Transportation / Fleet' },
    { label: 'Working Capital', value: 'Working Capital' },
    { label: 'Other', value: 'Other' },
];

export const READINESS_FACTOR_STATUS_OPTIONS: SelectOption[] = [
    { label: 'Good', value: 'Good' },
    { label: 'Strong', value: 'Strong' },
    { label: 'Failed', value: 'Failed' }
];

export const READINESS_FACTORS_OPTIONS = [
    "Business Credit",
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
    { label: '36 months', value: 36 },
    { label: '48 months', value: 48 },
    { label: '60 months', value: 60 }
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
    if (status === FUNDING_REVIEW_STATUS.CANCELED) return 100;
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
        label: FUNDING_REVIEW_STATUS.PENDING,
        icon: 'ri-time-line',
    },
    {
        key: FUNDING_REVIEW_STATUS.ACCEPTED,
        label: FUNDING_REVIEW_STATUS.ACCEPTED,
        icon: 'ri-checkbox-circle-line',
    },
    {
        key: FUNDING_REVIEW_STATUS.IN_PROGRESS,
        label: FUNDING_REVIEW_STATUS.IN_PROGRESS,
        subtext: 'Under Review',
        icon: 'ri-user-3-fill',
    },
    {
        key: FUNDING_REVIEW_STATUS.APPROVED,
        label: FUNDING_REVIEW_STATUS.APPROVED,
        icon: 'ri-user-follow-line',
    },
    {
        key: FUNDING_REVIEW_STATUS.REJECTED,
        label: FUNDING_REVIEW_STATUS.REJECTED,
        icon: 'ri-user-unfollow-line',
    },
    {
        key: FUNDING_REVIEW_STATUS.CANCELED,
        label: FUNDING_REVIEW_STATUS.CANCELED,
        icon: 'ri-stop-circle-line',
    },
];

// When the Host should set each status. Only the Host reviews a funding
// request; the borrower sees the matching explanation in the borrower portal.
export const FUNDING_REVIEW_GUIDELINE_CARDS = [
    {
        label: FUNDING_REVIEW_STATUS.PENDING,
        desc: 'Your request is received and waiting for the Host to review.',
        color: '#f59e0b',
        icon: 'ri-time-line'
    },
    {
        label: FUNDING_REVIEW_STATUS.ACCEPTED,
        desc: 'All documents and information are checked and complete.',
        color: '#22c55e',
        icon: 'ri-check-line'
    },
    {
        label: FUNDING_REVIEW_STATUS.IN_PROGRESS,
        desc: 'Your request is under review. We may need more information or documents.',
        color: '#3b82f6',
        icon: 'ri-loader-2-line'
    },
    {
        label: FUNDING_REVIEW_STATUS.APPROVED,
        desc: 'Everything is complete and correct. You can start your funding application.',
        color: '#16a34a',
        icon: 'ri-shield-check-line'
    },
    {
        label: FUNDING_REVIEW_STATUS.REJECTED,
        desc: 'The request does not meet our requirements. You can check the reason and reapply if needed.',
        color: '#ef4444',
        icon: 'ri-close-line'
    },
    {
        label: FUNDING_REVIEW_STATUS.CANCELED,
        desc: 'You stopped the request before it was completed.',
        color: '#64748b',
        icon: 'ri-forbid-line'
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
    FAILED: 'failed',
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
    [FACTOR_STATUS_VALUES.FAILED]: { icon: 'ri-close-circle-fill', color: '#ef4444' },
    [FACTOR_STATUS_VALUES.RESTRICTED]: { icon: 'ri-close-circle-fill', color: '#ef4444' },
};

export const READINESS_BADGE_STYLES: Record<string, { icon: string; bg: string; color: string }> = {
    [FACTOR_STATUS_VALUES.GOOD]: { icon: 'ri-checkbox-circle-fill', bg: '#e8f9f0', color: '#1a7a4a' },
    [FACTOR_STATUS_VALUES.STRONG]: { icon: 'ri-checkbox-circle-fill', bg: '#dbeafe', color: '#1d4ed8' },
    [FACTOR_STATUS_VALUES.FAIR]: { icon: 'ri-error-warning-fill', bg: '#fef3c7', color: '#92400e' },
    [FACTOR_STATUS_VALUES.FAILED]: { icon: 'ri-close-circle-fill', bg: '#fee2e2', color: '#ef4444' },
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
