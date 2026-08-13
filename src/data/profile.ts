export interface OptionType {
  label: string
  value: string
}

export const entityTypes: OptionType[] = [
  { label: 'LLC', value: 'LLC' },
  { label: 'S-Corporation', value: 'S-Corporation' },
  { label: 'Corporation', value: 'Corporation' },
  { label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
  { label: 'Partnership', value: 'Partnership' },
  { label: 'PLLC', value: 'PLLC' },
  { label: 'Public Corporation', value: 'Public Corporation' },
  { label: 'Other', value: 'Other' }
]

export const industryTypes: OptionType[] = [
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
