import { ENTITY_TYPE_BORROWER, ENTITY_TYPE_PARTNER } from './appConfig';
 
export const LEAD_TYPES = {
    BORROWER: ENTITY_TYPE_BORROWER,
    PARTNER: ENTITY_TYPE_PARTNER,
};

export const LEAD_STATUS_TYPES = {
    NEW_LEAD: 'New Lead',
    CONTACT_INITIATED: 'Contact Initiated',
    LEAD_IDENTIFIED: 'Lead Identified',
    MEETING_ARRANGED: 'Meeting Arranged',
    APPLICATION_ALLOWED: 'Application Allowed',
    FOLLOW_UP: 'Follow Up',
    NEGOTIATION: 'Negotiation',
    LEAD_COMPLETED: 'Lead Completed',
    LEAD_DECLINED: 'Lead Declined',
    PROCASTINATION: 'Procrastination',
};

export const LEAD_PROBABILITY_OPTIONS = [
    { label: '0%', value: '0%' },
    { label: '10%', value: '10%' },
    { label: '20%', value: '20%' },
    { label: '30%', value: '30%' },
    { label: '40%', value: '40%' },
    { label: '50%', value: '50%' },
    { label: '60%', value: '60%' },
    { label: '70%', value: '70%' },
    { label: '80%', value: '80%' },
    { label: '90%', value: '90%' },
    { label: '100%', value: '100%' },
];

export const LEAD_TYPE_OPTIONS = [
    { label: LEAD_TYPES.BORROWER, value: LEAD_TYPES.BORROWER },
    { label: LEAD_TYPES.PARTNER, value: LEAD_TYPES.PARTNER },
];

export const LEAD_STATUS_OPTIONS = [
    { label: LEAD_STATUS_TYPES.NEW_LEAD, value: LEAD_STATUS_TYPES.NEW_LEAD },
    { label: LEAD_STATUS_TYPES.CONTACT_INITIATED, value: LEAD_STATUS_TYPES.CONTACT_INITIATED },
    { label: LEAD_STATUS_TYPES.LEAD_IDENTIFIED, value: LEAD_STATUS_TYPES.LEAD_IDENTIFIED },
    { label: LEAD_STATUS_TYPES.MEETING_ARRANGED, value: LEAD_STATUS_TYPES.MEETING_ARRANGED },
    { label: LEAD_STATUS_TYPES.APPLICATION_ALLOWED, value: LEAD_STATUS_TYPES.APPLICATION_ALLOWED },
    { label: LEAD_STATUS_TYPES.FOLLOW_UP, value: LEAD_STATUS_TYPES.FOLLOW_UP },
    { label: LEAD_STATUS_TYPES.NEGOTIATION, value: LEAD_STATUS_TYPES.NEGOTIATION },
    { label: LEAD_STATUS_TYPES.LEAD_COMPLETED, value: LEAD_STATUS_TYPES.LEAD_COMPLETED },
    { label: LEAD_STATUS_TYPES.LEAD_DECLINED, value: LEAD_STATUS_TYPES.LEAD_DECLINED },
    { label: LEAD_STATUS_TYPES.PROCASTINATION, value: LEAD_STATUS_TYPES.PROCASTINATION },
];

export const LEAD_SOURCE_OPTIONS = [
    { label: 'Referral Partner', value: 'Referral Partner' },
    { label: 'Client Referral', value: 'Client Referral' },
    { label: 'Personal Network (Friends/Family)', value: 'Personal Network (Friends/Family)' },
    { label: 'Social Media', value: 'Social Media' },
    { label: 'Website', value: 'Website' },
    { label: 'Networking Event', value: 'Networking Event' },
    { label: 'Cold Outreach', value: 'Cold Outreach' },
    { label: 'Professional Referral (CPA/Realtor/LO/etc.)', value: 'Professional Referral (CPA/Realtor/LO/etc.)' },
    { label: 'Other', value: 'Other' },
];

export const LEAD_ENTITY_TYPE_OPTIONS = [
    { label: 'Sole Proprietor', value: 'Sole Proprietor' },
    { label: 'Partnership', value: 'Partnership' },
    { label: 'C-Corporation', value: 'C-Corporation' },
    { label: 'S-Corporation', value: 'S-Corporation' },
    { label: 'Limited Liability Company (LLC)', value: 'Limited Liability Company (LLC)' },
    { label: 'Other', value: 'Other' },
];

export const LEAD_INDUSTRY_TYPE_OPTIONS = [
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
