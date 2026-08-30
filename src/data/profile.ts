export interface OptionType {
  label: string
  value: string
}

export const entityTypes: OptionType[] = [
  { label: 'Sole Proprietor', value: 'Sole Proprietor' },
  { label: 'Partnership', value: 'Partnership' },
  { label: 'C-Corporation', value: 'C-Corporation' },
  { label: 'S-Corporation', value: 'S-Corporation' },
  { label: 'Limited Liability Company (LLC)', value: 'Limited Liability Company (LLC)' },
  { label: 'Other', value: 'Other' }
]

export const industryTypes: OptionType[] = [
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
  { label: 'Other', value: 'Other' }
]


export const yearsInBusinessOptions: OptionType[] = [
  { label: 'Under 6 months', value: 'Under 6 months' },
  { label: '6-12 months', value: '6-12 months' },
  { label: '1-2 years', value: '1-2 years' },
  { label: '2-3 years', value: '2-3 years' },
  { label: '3+ years', value: '3+ years' }
]

export const fundingUrgencyOptions: OptionType[] = [
  { label: 'Immediate', value: 'Immediate' },
  { label: 'Within 30 days', value: 'Within 30 days' },
  { label: '1-3 months', value: '1-3 months' },
  { label: 'Flexible', value: 'Flexible' }
]

export const FUNDING_PURPOSE_OTHER = 'Other'

export const purposeOfFundingOptions: OptionType[] = [
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
  { label: 'Other', value: 'Other' }
]

export const personalCreditScoreOptions: OptionType[] = [
  { label: 'Poor (<580)', value: 'Poor (<580)' },
  { label: 'Fair (580-669)', value: 'Fair (580-669)' },
  { label: 'Good (670-739)', value: 'Good (670-739)' },
  { label: 'Very Good (740-799)', value: 'Very Good (740-799)' },
  { label: 'Excellent (800+)', value: 'Excellent (800+)' }
]

export const estimatedBusinessCreditScoreOptions: OptionType[] = [
  { label: 'No Business Credit', value: 'No Business Credit' },
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' }
]

export const citizenshipOptions: OptionType[] = [
  { label: 'US Citizen', value: 'US Citizen' },
  { label: 'Permanent Resident', value: 'Permanent Resident' },
  { label: 'Other', value: 'Other' }
]

export const selfReportedCreditScoreOptions: OptionType[] = [
  { label: 'Below 600', value: 'Below 600' },
  { label: '600-649', value: '600-649' },
  { label: '650-699', value: '650-699' },
  { label: '700-749', value: '700-749' },
  { label: '750+', value: '750+' },
]

export const selfReportedBusinessCreditScoreOptions: OptionType[] = [
  { label: 'Not established yet', value: 'Not established yet' },
  { label: 'Not sure', value: 'Not sure' },
  { label: '0-49', value: '0-49' },
  { label: '50-64', value: '50-64' },
  { label: '65-74', value: '65-74' },
  { label: '75-79', value: '75-79' },
  { label: '80-100', value: '80-100' },
]

export const fundingTypeOptions: OptionType[] = [
  { label: 'Term Loan', value: 'Term Loan' },
  { label: 'Line of Credit', value: 'Line of Credit' },
  { label: 'Equipment Financing', value: 'Equipment Financing' },
  { label: 'SBA Loan', value: 'SBA Loan' },
  { label: 'Merchant Cash Advance', value: 'Merchant Cash Advance' },
  { label: 'Hard Money / Bridge Loan', value: 'Hard Money / Bridge Loan' },
  { label: 'Commercial Real Estate Loan', value: 'Commercial Real Estate Loan' },
  { label: 'Construction Loan', value: 'Construction Loan' },
  { label: 'Asset-Based Lending (AR / Inventory)', value: 'Asset-Based Lending (AR / Inventory)' },
  { label: 'Invoice Factoring', value: 'Invoice Factoring' },
  { label: 'Revenue-Based Financing', value: 'Revenue-Based Financing' },
  { label: 'Unsecured Business Credit', value: 'Unsecured Business Credit' },
  { label: 'Business Acquisition Financing', value: 'Business Acquisition Financing' },
  { label: 'Refinance / Debt Consolidation', value: 'Refinance / Debt Consolidation' },
]

export const timeframeOptions: OptionType[] = [
  { label: 'Immediately', value: 'Immediately' },
  { label: '1-2 Weeks', value: '1-2 Weeks' },
  { label: '1 Month', value: '1 Month' },
  { label: 'Flexible', value: 'Flexible' },
]

export const collateralOptions: OptionType[] = [
  { label: 'None', value: 'None' },
  { label: 'Business Assets', value: 'Business Assets' },
  { label: 'Real Estate', value: 'Real Estate' },
  { label: 'Equipment', value: 'Equipment' },
  { label: 'Inventory', value: 'Inventory' },
]
