/**
 * How the Convert dialog shows the blank profile fields an embedded-form
 * application would fill on an existing client (BUG-064).
 */

/** Groups in the order shown. A field in no group goes under "Other". */
export const PROFILE_FILL_GROUPS = [
    {
        title: 'Personal',
        icon: 'ri-user-line',
        fields: ['first_name', 'middle_name', 'last_name', 'email', 'phone_number', 'date_of_birth', 'ssn'],
    },
    {
        title: 'Home address',
        icon: 'ri-home-4-line',
        fields: ['home_address', 'city', 'state', 'postal_code', 'country'],
        address: true,
    },
    {
        title: 'Business',
        icon: 'ri-building-line',
        fields: [
            'business_name', 'business_email', 'business_phone', 'business_ein', 'business_entity_type',
            'business_industry_type', 'business_start_date', 'number_of_employees',
        ],
    },
    {
        title: 'Business address',
        icon: 'ri-map-pin-line',
        fields: ['business_address', 'business_city', 'business_state', 'business_postal_code', 'business_country'],
        address: true,
    },
    {
        title: 'Revenue',
        icon: 'ri-money-dollar-circle-line',
        fields: ['currency', 'monthly_revenue', 'annual_revenue', 'fico_score'],
    },
] as const

export const PROFILE_FILL_OTHER_GROUP = { title: 'Other', icon: 'ri-more-line' } as const

/** Filled alongside a phone, but noise on their own. */
export const PROFILE_FILL_HIDDEN_FIELDS: readonly string[] = ['country_code', 'business_country_code']

export const PROFILE_FILL_DATE_FIELDS: readonly string[] = ['date_of_birth', 'business_start_date']
export const PROFILE_FILL_MONEY_FIELDS: readonly string[] = ['monthly_revenue', 'annual_revenue']

/** Readable labels; a field not listed keeps the API's label. */
export const PROFILE_FILL_LABELS: Record<string, string> = {
    first_name: 'First name',
    middle_name: 'Middle name',
    last_name: 'Last name',
    email: 'Email',
    phone_number: 'Phone',
    date_of_birth: 'Date of birth',
    ssn: 'SSN',
    home_address: 'Home address',
    business_name: 'Business name',
    business_email: 'Business email',
    business_phone: 'Business phone',
    business_ein: 'EIN',
    business_entity_type: 'Entity type',
    business_industry_type: 'Industry',
    business_start_date: 'Business start date',
    number_of_employees: 'Employees',
    business_address: 'Business address',
    currency: 'Currency',
    monthly_revenue: 'Monthly revenue',
    annual_revenue: 'Annual revenue',
    fico_score: 'FICO score',
}
