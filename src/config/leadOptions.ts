export const LEAD_TYPES = {
    BORROWER: 'Borrower',
    PARTNER: 'Partner',
};

export const LEAD_STATUS_TYPES = {
    NEW_LEAD: 'New Lead',
    CONTACT_INITIATED: 'Contact Initiated',
    LEAD_IDENTIFIED: 'Lead Identified',
    MEETING_ARRANGED: 'Meeting Arranged',
    APPLICATION_ALLOWED: 'Application Allowed',
    FOLLOW_UP: 'Follow Up',
    NEGOTIATION: 'Negotiation',
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
];

export const LEAD_SOURCE_OPTIONS = [
    { label: 'Facebook', value: 'Facebook' },
    { label: 'Instagram', value: 'Instagram' },
    { label: 'LinkedIn', value: 'LinkedIn' },
    { label: 'Google', value: 'Google' },
    { label: 'Website', value: 'Website' },
    { label: 'Referral', value: 'Referral' },
    { label: 'Other', value: 'Other' },
];

export const LEAD_ENTITY_TYPE_OPTIONS = [
    { label: 'LLC', value: 'LLC' },
    { label: 'Corporation', value: 'Corporation' },
    { label: 'Partnership', value: 'Partnership' },
    { label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
];

export const LEAD_INDUSTRY_TYPE_OPTIONS = [
    { label: 'Finance', value: 'Finance' },
    { label: 'Tech', value: 'Tech' },
    { label: 'Healthcare', value: 'Healthcare' },
    { label: 'Education', value: 'Education' },
    { label: 'Real Estate', value: 'Real Estate' },
];
