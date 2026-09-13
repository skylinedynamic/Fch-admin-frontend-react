/**
 * Phone dialling configuration.
 *
 * The country/state/city tree that used to live here now comes from the API —
 * see src/modules/location. This file keeps only the phone prefixes, which are
 * presentation config rather than location data and have no server counterpart.
 */

export const COUNTRY_PHONE_CONFIG = {
    USA: { label: 'USA', prefix: '+1' },
    'United States': { label: 'USA', prefix: '+1' },
    Canada: { label: 'CAN', prefix: '+1' }
};

export const getCountryPhoneInfo = (countryName: string | undefined | null) => {
    if (!countryName) return null;
    return COUNTRY_PHONE_CONFIG[countryName as keyof typeof COUNTRY_PHONE_CONFIG] || null;
};
