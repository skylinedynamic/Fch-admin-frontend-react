import { countries } from '../data/countries'

/**
 * Get country code by country name
 * @param name Country name (e.g. "United States")
 * @returns Country code (e.g. "USA") or undefined
 */
export const getCountryCodeByName = (name: string): string | undefined => {
    return countries.find((country) => country.name === name)?.code
}

/**
 * Get country phone code by country name
 * @param name Country name (e.g. "United States")
 * @returns Phone code (e.g. "+1") or undefined
 */
export const getPhoneCodeByName = (name: string): string | undefined => {
    return countries.find((country) => country.name === name)?.phone_code
}

/**
 * Get country name by country code
 * @param code Country code (e.g. "USA")
 * @returns Country name (e.g. "United States") or undefined
 */
export const getCountryNameByCode = (code: string): string | undefined => {
    return countries.find((country) => country.code === code)?.name
}

/**
 * Get country name by phone code
 * @param phoneCode Phone code (e.g. "+1")
 * @returns Country name (e.g. "United States") or undefined
 * Note: Returns the first matching country if multiple share the same phone code
 */
export const getCountryNameByPhoneCode = (phoneCode: string): string | undefined => {
    return countries.find((country) => country.phone_code === phoneCode)?.name
}

/**
 * Get country code from display string (e.g. "USA (+1)" -> "USA")
 * @param display Display string
 * @returns Country code or undefined
 */
export const getCountryCodeFromDisplay = (display: string): string | undefined => {
    return display.split(' ')[0]
}

/**
 * Format country display string
 * @param code Country code (e.g. "USA")
 * @param phoneCode Phone code (e.g. "+1")
 * @returns Formatted string (e.g. "USA (+1)")
 */
export const formatCountryDisplay = (code: string, phoneCode: string): string => {
    return `${code} (${phoneCode})`
}

/**
 * Get default country (United States)
 * @returns Default Country object
 */
export const getDefaultCountry = () => {
    return countries.find((country) => country.code === 'USA') || countries[0]
}
