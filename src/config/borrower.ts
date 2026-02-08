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

export const FUNDING_TYPE_OPTIONS = [
  { label: 'Working Capital', value: 'Working Capital' },
  { label: 'Equipment', value: 'Equipment' },
  { label: 'Inventory', value: 'Inventory' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Expansion', value: 'Expansion' },
  { label: 'Other', value: 'Other' }
];


export const FUNDING_APPLICATION_STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Submitted (Received)', value: 'Submitted (Received)' },
  { label: 'Underwriting Review', value: 'Underwriting Review' },
  { label: 'Missing Documents (Action Required)', value: 'Missing Documents (Action Required)' },
  { label: 'In Verification', value: 'In Verification' },
  { label: 'Approved (Conditional)', value: 'Approved (Conditional)' },
  { label: 'Approved (Final)', value: 'Approved (Final)' },
  { label: 'Matched to Lender', value: 'Matched to Lender' },
  { label: 'Submitted to Lender', value: 'Submitted to Lender' },
  { label: 'Lender Reviewing', value: 'Lender Reviewing' },
  { label: 'Offer Issued', value: 'Offer Issued' },
  { label: 'Offer Accepted', value: 'Offer Accepted' },
  { label: 'Contracting / Docs Out', value: 'Contracting / Docs Out' },
  { label: 'Cleared to Fund', value: 'Cleared to Fund' },
  { label: 'Funded', value: 'Funded' },
  { label: 'Closed (Completed)', value: 'Closed (Completed)' }
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
  [FUNDING_APPLICATION_STATUS_OPTIONS[15].value]: 'bg-secondary-subtle text-secondary',
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
  { label: 'Accounting & Financial Services', value: 'Accounting & Financial Services' },
  { label: 'Automotive Services & Dealerships', value: 'Automotive Services & Dealerships' },
  { label: 'Beauty, Salon & Spa Services', value: 'Beauty, Salon & Spa Services' },
  { label: 'Cannabis / CBD Industry', value: 'Cannabis / CBD Industry' },
  { label: 'Childcare & Daycare', value: 'Childcare & Daycare' },
  { label: 'Cleaning & Janitorial Services', value: 'Cleaning & Janitorial Services' },
  { label: 'Construction & Contracting', value: 'Construction & Contracting' },
  { label: 'E-Commerce / Online Retail', value: 'E-Commerce / Online Retail' },
  { label: 'Education & Tutoring Services', value: 'Education & Tutoring Services' },
  { label: 'Fitness & Wellness (Gyms, Yoga, Etc.)', value: 'Fitness & Wellness (Gyms, Yoga, Etc.)' },
  { label: 'Franchise Businesses', value: 'Franchise Businesses' },
  { label: 'Government Contractor / Vendor', value: 'Government Contractor / Vendor' },
  { label: 'Healthcare & Medical Practices', value: 'Healthcare & Medical Practices' },
  { label: 'Home Services (Plumbing, HVAC, Landscaping, etc.)', value: 'Home Services (Plumbing, HVAC, Landscaping, etc.)' },
  { label: 'Hospitality (Hotels / Lodging)', value: 'Hospitality (Hotels / Lodging)' },
  { label: 'IT & Software Development', value: 'IT & Software Development' },
  { label: 'Legal & Professional Services', value: 'Legal & Professional Services' },
  { label: 'Manufacturing & Wholesale', value: 'Manufacturing & Wholesale' },
  { label: 'Marketing, Advertising & Media', value: 'Marketing, Advertising & Media' },
  { label: 'Non-Profit Organization', value: 'Non-Profit Organization' },
  { label: 'Real Estate & Property Management', value: 'Real Estate & Property Management' },
  { label: 'Restaurants, Bars & Catering', value: 'Restaurants, Bars & Catering' },
  { label: 'Retail (Brick & Mortar)', value: 'Retail (Brick & Mortar)' },
  { label: 'Transportation & Logistics', value: 'Transportation & Logistics' },
  { label: 'Other', value: 'Other' }
];

export const CURRENCY_OPTIONS = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'GBP', value: 'GBP' }
];
