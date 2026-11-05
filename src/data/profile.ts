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

/**
 * Purpose of Funds choices: the purposes from the API (GET /common/funding-purposes -
 * the backend's one list, the same the embed form shows), in their order.
 */
export const purposeOptionsFrom = (purposes: string[] | null | undefined): OptionType[] =>
  (purposes ?? []).map((name) => ({ label: name, value: name }))

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

/**
 * Preferred / Additional Funding Types: exactly the Active lender product
 * categories (Lenders > Product Categories, from GET /common/funding-types),
 * nothing else - the categories an application's lenders are matched on.
 */
export const fundingTypeOptionsFrom = (categories: string[] | null | undefined): OptionType[] =>
  (categories ?? []).map((name) => ({ label: name, value: name }))

/**
 * The saved types that are Active categories. Any other (an old name such as
 * "Line of Credit", an inactive category) is dropped, to be chosen again from
 * the list. Kept as they are while the categories are still loading.
 */
export const onlyFundingTypesIn = (categories: string[] | null | undefined, types: string[]): string[] =>
  categories ? types.filter((type) => categories.includes(type)) : types

/** The badge beside the preferred type in the Additional Funding Types list. */
export const ALREADY_PREFERRED_BADGE = 'Selected as Preferred'

/**
 * The Additional Funding Types choices on the funding application's Funding
 * Request step: the same list as Preferred Funding Type. The preferred one is
 * listed with an "Selected as Preferred" badge, but cannot be picked again (the
 * API refuses it too).
 */
export const additionalFundingTypeOptions = (
  options: OptionType[],
  preferred: string | null | undefined
): (OptionType & { disabled: boolean; badge?: string; badgeTitle?: string })[] =>
  options.map((o) =>
    preferred && o.value === preferred
      ? { ...o, disabled: true, badge: ALREADY_PREFERRED_BADGE, badgeTitle: 'Already selected as the Preferred Funding Type' }
      : { ...o, disabled: false }
  )

/** The chosen additional types, without one that has just become the preferred type. */
export const withoutPreferredFundingType = (
  chosen: string[] | null | undefined,
  preferred: string | null | undefined
): string[] => (chosen ?? []).filter((type) => type !== preferred)

/** Purpose of Funds is sent and stored as one string, the purposes joined by this. */
export const PURPOSE_SEPARATOR = ', '

const knownPurpose = (text: string, known: string[]): string | undefined =>
  known.find((purpose) => purpose.toLowerCase() === text.trim().toLowerCase())

/**
 * An older single free-text purpose (pre-qualification, embed form), read as
 * the list item it means - only when the list from the API has that item.
 */
const legacyPurpose = (text: string, known: string[]): string => {
  const lower = text.toLowerCase()
  const meant =
    lower.includes('equipment') ? 'Equipment Purchase'
    : lower.includes('inventory') ? 'Inventory'
    : lower.includes('payroll') ? 'Payroll'
    : lower.includes('real estate') || lower.includes('property') ? 'Commercial Real Estate Purchase'
    : lower.includes('line of credit') ? 'Business Line of Credit'
    : lower.includes('expansion') ? 'Business Expansion'
    : lower.includes('acquisition') ? 'Business Acquisition'
    : null
  return (meant && knownPurpose(meant, known)) || text
}

/**
 * The purposes in a saved purpose_of_funds string. A purpose's own comma
 * ("Furniture, Fixtures & Equipment (FF&E)") is kept by matching the known
 * purposes first, longest run of pieces first; anything else stays as written.
 */
export const splitPurposes = (raw: string | null | undefined, known: string[] = []): string[] => {
  const text = (raw ?? '').trim()
  if (!text) return []

  if (!text.includes(',')) {
    return [knownPurpose(text, known) ?? legacyPurpose(text, known)]
  }

  const pieces = text.split(',')
  const purposes: string[] = []
  for (let i = 0; i < pieces.length; ) {
    let taken = 1
    let purpose = pieces[i].trim()
    for (let j = pieces.length; j > i + 1; j--) {
      const match = knownPurpose(pieces.slice(i, j).join(','), known)
      if (match) {
        purpose = match
        taken = j - i
        break
      }
    }
    purpose = knownPurpose(purpose, known) ?? purpose
    if (purpose && !purposes.some((p) => p.toLowerCase() === purpose.toLowerCase())) {
      purposes.push(purpose)
    }
    i += taken
  }
  return purposes
}

/** The chosen purposes as the one purpose_of_funds string. */
export const joinPurposes = (purposes: string[]): string => purposes.join(PURPOSE_SEPARATOR)

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
