export const APPLICATION_STATUS = {
  PENDING: 'Pending',
  INTAKE_RECEIVED: 'Intake Received',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  DECLINED: 'Declined'
};

export const APPLICATION_STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Intake Received', value: 'Intake Received' },
  { label: 'In Review', value: 'In Review' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Declined', value: 'Declined' }
];

export const APPLICATION_STATUS_CLASS_MAP: Record<string, string> = {
  [APPLICATION_STATUS_OPTIONS[0].value]: 'bg-warning-subtle text-warning',
  [APPLICATION_STATUS_OPTIONS[1].value]: 'bg-info-subtle text-info',
  [APPLICATION_STATUS_OPTIONS[2].value]: 'bg-primary-subtle text-primary',
  [APPLICATION_STATUS_OPTIONS[3].value]: 'bg-success-subtle text-success',
  [APPLICATION_STATUS_OPTIONS[4].value]: 'bg-danger-subtle text-danger'
};

export const CHANGE_REQUEST_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
} as const;

export const CHANGE_REQUEST_STATUS_OPTIONS = [
  { label: 'Pending', value: CHANGE_REQUEST_STATUS.PENDING },
  { label: 'Approved', value: CHANGE_REQUEST_STATUS.APPROVED },
  { label: 'Rejected', value: CHANGE_REQUEST_STATUS.REJECTED }
];

export const CHANGE_REQUEST_STATUS_CLASS_MAP: Record<string, string> = {
  [CHANGE_REQUEST_STATUS.PENDING]: 'bg-warning-subtle text-warning',
  [CHANGE_REQUEST_STATUS.APPROVED]: 'bg-success-subtle text-success',
  [CHANGE_REQUEST_STATUS.REJECTED]: 'bg-danger-subtle text-danger'
};

export const FUNDING_TYPE_OPTIONS = [
  { label: 'Working Capital', value: 'Working Capital' },
  { label: 'Equipment', value: 'Equipment' },
  { label: 'Inventory', value: 'Inventory' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Expansion', value: 'Expansion' },
  { label: 'Other', value: 'Other' }
];


export const FUNDING_APPLICATION_STATUS = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted (Received)',
  UNDERWRITING_REVIEW: 'Underwriting Review',
  MISSING_DOCUMENTS: 'Missing Documents (Action Required)',
  IN_VERIFICATION: 'In Verification',
  APPROVED_CONDITIONAL: 'Approved (Conditional)',
  APPROVED_FINAL: 'Approved (Final)',
  MATCHED_TO_LENDER: 'Matched to Lender',
  SUBMITTED_TO_LENDER: 'Submitted to Lender',
  LENDER_REVIEWING: 'Lender Reviewing',
  OFFER_ISSUED: 'Offer Issued',
  OFFER_ACCEPTED: 'Offer Accepted',
  CONTRACTING_DOCS_OUT: 'Contracting / Docs Out',
  CLEARED_TO_FUND: 'Cleared to Fund',
  FUNDED: 'Funded',
  CLOSED: 'Closed (Completed)',
  DENIED: 'Denied'
};

export const FUNDING_APPLICATION_STATUS_OPTIONS = [
  { label: 'Pending', value: FUNDING_APPLICATION_STATUS.PENDING },
  { label: 'Submitted (Received)', value: FUNDING_APPLICATION_STATUS.SUBMITTED },
  { label: 'Underwriting Review', value: FUNDING_APPLICATION_STATUS.UNDERWRITING_REVIEW },
  { label: 'Missing Documents (Action Required)', value: FUNDING_APPLICATION_STATUS.MISSING_DOCUMENTS },
  { label: 'In Verification', value: FUNDING_APPLICATION_STATUS.IN_VERIFICATION },
  { label: 'Approved (Conditional)', value: FUNDING_APPLICATION_STATUS.APPROVED_CONDITIONAL },
  { label: 'Approved (Final)', value: FUNDING_APPLICATION_STATUS.APPROVED_FINAL },
  { label: 'Matched to Lender', value: FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER },
  { label: 'Submitted to Lender', value: FUNDING_APPLICATION_STATUS.SUBMITTED_TO_LENDER },
  { label: 'Lender Reviewing', value: FUNDING_APPLICATION_STATUS.LENDER_REVIEWING },
  { label: 'Offer Issued', value: FUNDING_APPLICATION_STATUS.OFFER_ISSUED },
  { label: 'Offer Accepted', value: FUNDING_APPLICATION_STATUS.OFFER_ACCEPTED },
  { label: 'Contracting / Docs Out', value: FUNDING_APPLICATION_STATUS.CONTRACTING_DOCS_OUT },
  { label: 'Cleared to Fund', value: FUNDING_APPLICATION_STATUS.CLEARED_TO_FUND },
  { label: 'Funded', value: FUNDING_APPLICATION_STATUS.FUNDED },
  { label: 'Closed (Completed)', value: FUNDING_APPLICATION_STATUS.CLOSED },
  { label: 'Denied', value: FUNDING_APPLICATION_STATUS.DENIED }
];

export const FUNDING_APPLICATION_STATUS_CLASS_MAP: Record<string, string> = {
  [FUNDING_APPLICATION_STATUS_OPTIONS[0].value]: 'bg-warning-subtle text-warning',
  [FUNDING_APPLICATION_STATUS_OPTIONS[1].value]: 'bg-info-subtle text-info',
  [FUNDING_APPLICATION_STATUS_OPTIONS[2].value]: 'bg-primary-subtle text-primary',
  [FUNDING_APPLICATION_STATUS_OPTIONS[3].value]: 'bg-danger-subtle text-danger',
  [FUNDING_APPLICATION_STATUS_OPTIONS[4].value]: 'bg-info-subtle text-info',
  [FUNDING_APPLICATION_STATUS_OPTIONS[5].value]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS_OPTIONS[6].value]: 'bg-success text-white',
  [FUNDING_APPLICATION_STATUS_OPTIONS[7].value]: 'bg-primary-subtle text-primary',
  [FUNDING_APPLICATION_STATUS_OPTIONS[8].value]: 'bg-info-subtle text-info',
  [FUNDING_APPLICATION_STATUS_OPTIONS[9].value]: 'bg-primary-subtle text-primary',
  [FUNDING_APPLICATION_STATUS_OPTIONS[10].value]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS_OPTIONS[11].value]: 'bg-success text-white',
  [FUNDING_APPLICATION_STATUS_OPTIONS[12].value]: 'bg-warning-subtle text-warning',
  [FUNDING_APPLICATION_STATUS_OPTIONS[13].value]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS_OPTIONS[14].value]: 'bg-success text-white',
  [FUNDING_APPLICATION_STATUS_OPTIONS[15].value]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS_OPTIONS[16].value]: 'bg-danger-subtle text-danger',
};

export const entityTypes = [
  { label: 'LLC', value: 'LLC' },
  { label: 'S-Corporation', value: 'S-Corporation' },
  { label: 'Corporation', value: 'Corporation' },
  { label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
  { label: 'Partnership', value: 'Partnership' },
  { label: 'PLLC', value: 'PLLC' },
  { label: 'Public Corporation', value: 'Public Corporation' },
  { label: 'Other', value: 'Other' }
];

export const industryTypes = [
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
  { label: 'Others', value: 'Others' },
];

export const CURRENCY_OPTIONS = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'GBP', value: 'GBP' }
];
