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
  ON_HOLD: 'On Hold',
  DRAFT: 'Draft',
  PENDING: 'Submitted – Pending Review',
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
  { label: 'On Hold', value: FUNDING_APPLICATION_STATUS.ON_HOLD },
  { label: 'Draft', value: FUNDING_APPLICATION_STATUS.DRAFT },
  { label: 'Submitted – Pending Review', value: FUNDING_APPLICATION_STATUS.PENDING },
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
  [FUNDING_APPLICATION_STATUS_OPTIONS[0].value]: 'bg-secondary-subtle text-secondary',
  [FUNDING_APPLICATION_STATUS_OPTIONS[1].value]: 'bg-secondary-subtle text-secondary',
  [FUNDING_APPLICATION_STATUS_OPTIONS[2].value]: 'bg-warning-subtle text-warning',
  [FUNDING_APPLICATION_STATUS_OPTIONS[3].value]: 'bg-info-subtle text-info',
  [FUNDING_APPLICATION_STATUS_OPTIONS[4].value]: 'bg-primary-subtle text-primary',
  [FUNDING_APPLICATION_STATUS_OPTIONS[5].value]: 'bg-danger-subtle text-danger',
  [FUNDING_APPLICATION_STATUS_OPTIONS[6].value]: 'bg-info-subtle text-info',
  [FUNDING_APPLICATION_STATUS_OPTIONS[7].value]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS_OPTIONS[8].value]: 'bg-success text-white',
  [FUNDING_APPLICATION_STATUS_OPTIONS[9].value]: 'bg-primary-subtle text-primary',
  [FUNDING_APPLICATION_STATUS_OPTIONS[10].value]: 'bg-info-subtle text-info',
  [FUNDING_APPLICATION_STATUS_OPTIONS[11].value]: 'bg-primary-subtle text-primary',
  [FUNDING_APPLICATION_STATUS_OPTIONS[12].value]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS_OPTIONS[13].value]: 'bg-success text-white',
  [FUNDING_APPLICATION_STATUS_OPTIONS[14].value]: 'bg-warning-subtle text-warning',
  [FUNDING_APPLICATION_STATUS_OPTIONS[15].value]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS_OPTIONS[16].value]: 'bg-success text-white',
  [FUNDING_APPLICATION_STATUS_OPTIONS[17].value]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS_OPTIONS[18].value]: 'bg-danger-subtle text-danger',
};

export const entityTypes = [
  { label: 'Sole Proprietor', value: 'Sole Proprietor' },
  { label: 'Partnership', value: 'Partnership' },
  { label: 'C-Corporation', value: 'C-Corporation' },
  { label: 'S-Corporation', value: 'S-Corporation' },
  { label: 'Limited Liability Company (LLC)', value: 'Limited Liability Company (LLC)' },
  { label: 'Other', value: 'Other' },
];

export const industryTypes = [
  { label: 'Advertising, Marketing & Media', value: 'Advertising, Marketing & Media' },
  { label: 'Agriculture, Farming & Ranching', value: 'Agriculture, Farming & Ranching' },
  { label: 'Automotive (Sales, Repair, Transport)', value: 'Automotive (Sales, Repair, Transport)' },
  { label: 'Construction & Contracting', value: 'Construction & Contracting' },
  { label: 'Consulting & Professional Services', value: 'Consulting & Professional Services' },
  { label: 'E-Commerce & Online Businesses', value: 'E-Commerce & Online Businesses' },
  { label: 'Education & Training', value: 'Education & Training' },
  { label: 'Entertainment & Events', value: 'Entertainment & Events' },
  { label: 'Financial Services (Non-Lending)', value: 'Financial Services (Non-Lending)' },
  { label: 'Food Service & Restaurants', value: 'Food Service & Restaurants' },
  { label: 'Healthcare & Medical Services', value: 'Healthcare & Medical Services' },
  { label: 'Home Services (Cleaning, Landscaping, Repair)', value: 'Home Services (Cleaning, Landscaping, Repair)' },
  { label: 'Hospitality (Hotels, Short-Term Rentals)', value: 'Hospitality (Hotels, Short-Term Rentals)' },
  { label: 'Information Technology & Software', value: 'Information Technology & Software' },
  { label: 'Manufacturing', value: 'Manufacturing' },
  { label: 'Non-Profit Organization', value: 'Non-Profit Organization' },
  { label: 'Personal Services (Beauty, Fitness, Wellness)', value: 'Personal Services (Beauty, Fitness, Wellness)' },
  { label: 'Real Estate (Non-Lending)', value: 'Real Estate (Non-Lending)' },
  { label: 'Retail (Brick & Mortar)', value: 'Retail (Brick & Mortar)' },
  { label: 'Transportation & Logistics', value: 'Transportation & Logistics' },
  { label: 'Wholesale & Distribution', value: 'Wholesale & Distribution' },
  { label: 'Other', value: 'Other' },
];

export const CURRENCY_OPTIONS = [
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
  { label: 'GBP', value: 'GBP' }
];

/**
 * The borrower's plan filter on the Clients list; the partner-side equivalent is
 * TRIAL_FILTER_OPTIONS in partnerStatus.ts, which product words as "Trial".
 *
 * Still the raw is_free_trail boolean rather than a named status vocabulary: the
 * Clients list has no Expired option yet, so there is nothing for a status to
 * disambiguate. Worth the same treatment as TRIAL_STATUS if one is added.
 */
export const FREE_PLAN_FILTER_OPTIONS = [
  { label: 'All Plans', value: '' },
  { label: 'Free Plan', value: '1' },
  { label: 'Regular Plan', value: '0' }
];
