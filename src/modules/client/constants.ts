import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTableFilterMeta } from 'primereact/datatable';
import type { Client, DropdownOption } from './types';

export const DEFAULT_CLIENT_FILTERS: DataTableFilterMeta = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
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
    phone_number: '',
    country_code: '+1',
    email: '',
    business_website: '',
    business_name: '',
    business_ein: '',
    state_file_number: '',
    duns_number: '',
    business_address: '',
    country: 'United States',
    city: '',
    other_city: '',
    state: '',
    business_postal_code: '',
    business_phone: '',
    business_entity_type: '',
    business_industry_type: '',
    business_start_date: '',
    last_4_ssn: '',
    enrollment_type: '',
    plan_id: '',
    notes: '',
};

export const DATE_PICKER_OPTIONS = {
    dateFormat: "Y-m-d"
};

export const ENROLLMENT_TABS: Record<string, string> = {
    PERSONAL: 'personalDetails',
    FINANCIALS: 'businessFinancials',
    CHECKLIST: 'documentChecklist',
    DOCUMENTS: 'documents'
};

// Re-exporting from config for easier module-level access if needed
import { entityTypes, industryTypes, CURRENCY_OPTIONS as CURRENCY_OPTS } from '../../config/borrower';

export { entityTypes, industryTypes };
export const CURRENCY_OPTIONS: DropdownOption[] = CURRENCY_OPTS;
