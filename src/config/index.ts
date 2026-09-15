/**
 * Centralized Configuration Index
 * 
 * This file exports all configuration options used throughout the application.
 * Import from this file for better maintainability and consistency.
 * 
 * Usage:
 * import { PARTNER_TYPE_OPTIONS, GENDER_OPTIONS, STATUS } from '@/config'; // Or relative path
 */

// Partner related configurations
export { PARTNER_TYPES, SUBSCRIPTION_PARTNER_TYPES } from './partnerTypeOptions';

// User/Employee related configurations
export { GENDER_OPTIONS, type GenderOption } from './genderOptions';
export { MARITAL_STATUS_OPTIONS, type MaritalStatusOption } from './maritalStatusOptions';
export { relationOptions, type RelationOption } from './relations';

// General configurations
export { PARTNER_STATUS, type PartnerStatusOption } from './partnerStatus';
export { STATUS, type StatusOption } from './statusOptions';

// Location configurations
// Location data is fetched from the API and lives in the location module;
// re-exported here so existing `from '../../config'` imports keep working.
export { locationData, loadLocations, type LocationData, type Country, type StatesMap, type StateOrProvince } from '../modules/location';
export { COUNTRY_PHONE_CONFIG, getCountryPhoneInfo } from './locations';
export { BILLING_OPTIONS } from './billingOptions';

// Appointment related configurations
export { APPOINTMENT_TYPE_OPTIONS, TIME_SLOTS } from './appointmentTypeOptions';
export { TIMEZONE_OPTIONS } from './timezoneOptions';

// Credit Builder related configurations
export { CATEGORY_OPTIONS, STATUS_OPTIONS, REPORT_TO_OPTIONS,VENDOR_STATUS_OPTIONS, type ConfigOption } from './creditBuilder';

// Capital Access options
export { ACCESS_TIME, ACCESS_TIME_OPTIONS, DAY_OPTIONS, DAY_TIME_OPTIONS, type AccessTimeOption, type DayOption } from './capitalAccessOptions';

// App configuration
export { APP_CONFIG } from './appConfig';

// Score Calculation labels
export { STATIC_TIER_LABELS, SCORE_CATEGORIES, SCORE_MODELS, SCORE_FACTORS, type ScoreTierLabel } from './capitalAccessOptions';
// Payment descriptions
export { getProviderDesc } from './paymentDesc';

// OpenAI configuration options
export { DEFAULT_FALLBACK_MODELS, DEFAULT_EFFORT_OPTIONS } from './openaiConfig';
