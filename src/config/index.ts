/**
 * Centralized Configuration Index
 * 
 * This file exports all configuration options used throughout the application.
 * Import from this file for better maintainability and consistency.
 * 
 * Usage:
 * import { PARTNER_TYPE_OPTIONS, GENDER_OPTIONS, STATUS } from '@/config';
 */

// Partner related configurations
export { PARTNER_TYPE_OPTIONS, type PartnerTypeOption } from './partnerTypeOptions';

// User/Employee related configurations
export { GENDER_OPTIONS, type GenderOption } from './genderOptions';
export { MARITAL_STATUS_OPTIONS, type MaritalStatusOption } from './maritalStatusOptions';
export { bloodGroups, type BloodGroupOption } from './bloodGroups';
export { relationOptions, type RelationOption } from './relations';

// General configurations
export { PARTNER_STATUS, type PartnerStatusOption } from './partnerStatus';

// Location configurations
export { locationData, type LocationData, type Country, type StatesMap, type StateOrProvince } from './locations';
export { BILLING_OPTIONS } from './billingOptions';

// Appointment related configurations
export { APPOINTMENT_TYPE_OPTIONS } from './appointmentTypeOptions';
export { TIMEZONE_OPTIONS } from './timezoneOptions';
