export const APPLICATION_STATUS = {
  PENDING: 'Pending',
  INTAKE_RECEIVED: 'Intake Received',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  FAILED: 'Failed'
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
  [APPLICATION_STATUS_OPTIONS[4].value]: 'bg-danger-subtle text-danger',
  [APPLICATION_STATUS.FAILED]: 'bg-danger-subtle text-danger'
};

// Pre-qualification adds Failed: the automated review called the borrower's
// information incorrect, or could not be produced.
export const PRE_QUALIFICATION_STATUS_OPTIONS = [
  ...APPLICATION_STATUS_OPTIONS,
  { label: APPLICATION_STATUS.FAILED, value: APPLICATION_STATUS.FAILED }
];

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
  DRAFT: 'Draft',
  PENDING: 'Submitted – Pending Review',
  SUBMITTED: 'Submitted (Received)',
  MISSING_DOCUMENTS: 'Missing Documents (Action Required)',
  PENDING_CLARIFICATION: 'Pending Clarification',
  ON_HOLD: 'On Hold',
  IN_VERIFICATION: 'In Verification',
  UNDERWRITING_REVIEW: 'Underwriting Review',
  READY_FOR_SUBMISSION: 'Ready for Submission',
  MATCHED_TO_LENDER: 'Matched to Lender',
  SUBMITTED_TO_LENDER: 'Submitted to Lender',
  LENDER_REVIEWING: 'Lender Reviewing',
  APPROVED_CONDITIONAL: 'Approved (Conditional)',
  APPROVED_FINAL: 'Approved (Final)',
  OFFER_ISSUED: 'Offer Issued',
  OFFER_ACCEPTED: 'Offer Accepted',
  CONTRACTING_DOCS_OUT: 'Contracting / Docs Out',
  CLEARED_TO_FUND: 'Cleared to Fund',
  FUNDED: 'Funded',
  CLOSED: 'Closed (Completed)',
  DENIED: 'Denied',
  WITHDRAWN: 'Withdrawn',
  OFFER_DECLINED_BY_BORROWER: 'Offer Declined by Borrower',
  CLOSED_NO_RESPONSE: 'Closed - No Response',
  CLOSED_INCOMPLETE_APPLICATION: 'Closed - Incomplete Application',
  CLOSED_ERROR: 'Closed - Error'
};

// The Funding Application status dropdown, in its display order (SCRUM-331).
export const FUNDING_APPLICATION_STATUS_OPTIONS = [
  { label: 'Draft', value: FUNDING_APPLICATION_STATUS.DRAFT },
  { label: 'Submitted – Pending Review', value: FUNDING_APPLICATION_STATUS.PENDING },
  { label: 'Submitted (Received)', value: FUNDING_APPLICATION_STATUS.SUBMITTED },
  { label: 'Missing Documents (Action Required)', value: FUNDING_APPLICATION_STATUS.MISSING_DOCUMENTS },
  { label: 'Pending Clarification', value: FUNDING_APPLICATION_STATUS.PENDING_CLARIFICATION },
  { label: 'On Hold', value: FUNDING_APPLICATION_STATUS.ON_HOLD },
  { label: 'In Verification', value: FUNDING_APPLICATION_STATUS.IN_VERIFICATION },
  { label: 'Underwriting Review', value: FUNDING_APPLICATION_STATUS.UNDERWRITING_REVIEW },
  { label: 'Ready for Submission', value: FUNDING_APPLICATION_STATUS.READY_FOR_SUBMISSION },
  { label: 'Matched to Lender', value: FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER },
  { label: 'Submitted to Lender', value: FUNDING_APPLICATION_STATUS.SUBMITTED_TO_LENDER },
  { label: 'Lender Reviewing', value: FUNDING_APPLICATION_STATUS.LENDER_REVIEWING },
  { label: 'Approved (Conditional)', value: FUNDING_APPLICATION_STATUS.APPROVED_CONDITIONAL },
  { label: 'Approved (Final)', value: FUNDING_APPLICATION_STATUS.APPROVED_FINAL },
  { label: 'Offer Issued', value: FUNDING_APPLICATION_STATUS.OFFER_ISSUED },
  { label: 'Offer Accepted', value: FUNDING_APPLICATION_STATUS.OFFER_ACCEPTED },
  { label: 'Contracting / Docs Out', value: FUNDING_APPLICATION_STATUS.CONTRACTING_DOCS_OUT },
  { label: 'Cleared to Fund', value: FUNDING_APPLICATION_STATUS.CLEARED_TO_FUND },
  { label: 'Funded', value: FUNDING_APPLICATION_STATUS.FUNDED },
  { label: 'Closed (Completed)', value: FUNDING_APPLICATION_STATUS.CLOSED },
  { label: 'Denied', value: FUNDING_APPLICATION_STATUS.DENIED },
  { label: 'Withdrawn', value: FUNDING_APPLICATION_STATUS.WITHDRAWN },
  { label: 'Offer Declined by Borrower', value: FUNDING_APPLICATION_STATUS.OFFER_DECLINED_BY_BORROWER },
  { label: 'Closed - No Response', value: FUNDING_APPLICATION_STATUS.CLOSED_NO_RESPONSE },
  { label: 'Closed - Incomplete Application', value: FUNDING_APPLICATION_STATUS.CLOSED_INCOMPLETE_APPLICATION },
  { label: 'Closed - Error', value: FUNDING_APPLICATION_STATUS.CLOSED_ERROR }
];

// Badge per status, keyed by the status itself so reordering the dropdown cannot shift it.
export const FUNDING_APPLICATION_STATUS_CLASS_MAP: Record<string, string> = {
  [FUNDING_APPLICATION_STATUS.DRAFT]: 'bg-secondary-subtle text-secondary',
  [FUNDING_APPLICATION_STATUS.PENDING]: 'bg-warning-subtle text-warning',
  [FUNDING_APPLICATION_STATUS.SUBMITTED]: 'bg-info-subtle text-info',
  [FUNDING_APPLICATION_STATUS.MISSING_DOCUMENTS]: 'bg-danger-subtle text-danger',
  [FUNDING_APPLICATION_STATUS.PENDING_CLARIFICATION]: 'bg-warning-subtle text-warning',
  [FUNDING_APPLICATION_STATUS.ON_HOLD]: 'bg-secondary-subtle text-secondary',
  [FUNDING_APPLICATION_STATUS.IN_VERIFICATION]: 'bg-info-subtle text-info',
  [FUNDING_APPLICATION_STATUS.UNDERWRITING_REVIEW]: 'bg-primary-subtle text-primary',
  [FUNDING_APPLICATION_STATUS.READY_FOR_SUBMISSION]: 'bg-info-subtle text-info',
  [FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER]: 'bg-primary-subtle text-primary',
  [FUNDING_APPLICATION_STATUS.SUBMITTED_TO_LENDER]: 'bg-info-subtle text-info',
  [FUNDING_APPLICATION_STATUS.LENDER_REVIEWING]: 'bg-primary-subtle text-primary',
  [FUNDING_APPLICATION_STATUS.APPROVED_CONDITIONAL]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS.APPROVED_FINAL]: 'bg-success text-white',
  [FUNDING_APPLICATION_STATUS.OFFER_ISSUED]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS.OFFER_ACCEPTED]: 'bg-success text-white',
  [FUNDING_APPLICATION_STATUS.CONTRACTING_DOCS_OUT]: 'bg-warning-subtle text-warning',
  [FUNDING_APPLICATION_STATUS.CLEARED_TO_FUND]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS.FUNDED]: 'bg-success text-white',
  [FUNDING_APPLICATION_STATUS.CLOSED]: 'bg-success-subtle text-success',
  [FUNDING_APPLICATION_STATUS.DENIED]: 'bg-danger-subtle text-danger',
  [FUNDING_APPLICATION_STATUS.WITHDRAWN]: 'bg-secondary-subtle text-secondary',
  [FUNDING_APPLICATION_STATUS.OFFER_DECLINED_BY_BORROWER]: 'bg-secondary-subtle text-secondary',
  [FUNDING_APPLICATION_STATUS.CLOSED_NO_RESPONSE]: 'bg-secondary-subtle text-secondary',
  [FUNDING_APPLICATION_STATUS.CLOSED_INCOMPLETE_APPLICATION]: 'bg-secondary-subtle text-secondary',
  [FUNDING_APPLICATION_STATUS.CLOSED_ERROR]: 'bg-danger-subtle text-danger',
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
