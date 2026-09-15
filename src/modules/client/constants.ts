import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTableFilterMeta } from 'primereact/datatable';
import type { Client, DropdownOption } from './types';

export const DEFAULT_CLIENT_FILTERS: DataTableFilterMeta = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    business_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    phone_number: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    assign_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    partner_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    current_tier_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
};

export const DEFAULT_CLIENT_STATE: Client = {
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone_number: '',
    country_code: '+1',
    email: '',
    business_website: '',
    
    // Business Info
    business_name: '',
    business_ein: '',
    business_state_file_number: '',
    business_duns_number: '',
    business_address: '',
    business_country: 'United States',
    business_country_code: '',
    business_state: '',
    business_city: '',
    business_other_city: '',
    business_postal_code: '',
    business_phone: '',
    business_entity_type: '',
    business_industry_type: '',
    business_start_date: '',
    business_last_4_ssn: '',

    // Home Address (Primary Address)
    home_address: '',
    country: 'United States',
    state: '',
    city: '',
    other_city: '',
    postal_code: '',

    is_free_trail: false,
    free_trail_end_date: '',

    enrollment_type: '',
    plan_id: '',
    status: 'OnBoarding',
    notes: '',
    fico_score: '',
    paydex_score: '',
    bank_accounts: [],
};

export const DATE_PICKER_OPTIONS = {
    dateFormat: "Y-m-d"
};

export const ENROLLMENT_TABS: Record<string, string> = {
    PERSONAL: 'personalDetails',
    FINANCIALS: 'businessFinancials',
    CHECKLIST: 'documentChecklist',
    DOCUMENTS: 'documents',
    TASK_LIST: 'taskList',
    AGREEMENT: 'agreement',
    CREDIT_PROFILE: 'creditProfile',
    CAPITAL_ACCESS: 'capitalAccess',
    // The funding catalog a client can apply from.
    FUNDING_REQUESTS: 'fundingRequests',
    // What the client has actually raised and submitted. Kept separate from the
    // catalog above: one is what they could ask for, these are what they did.
    FUNDING_REQUEST_LIST: 'fundingRequestList',
    FUNDING_APPLICATIONS: 'fundingApplications'
};

// Re-exporting from config for easier module-level access if needed
import { entityTypes, industryTypes, CURRENCY_OPTIONS as CURRENCY_OPTS } from '../../config/borrower';

export { entityTypes, industryTypes };
export const CURRENCY_OPTIONS: DropdownOption[] = CURRENCY_OPTS;
