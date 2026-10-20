export interface Lead {
  id: number;
  lead_id: string;
  tasks_no: string;
  opportunity: string;
  probability: string;
  lead_type: string;
  status: string;
  salesperson_id?: number | string;
  salesperson_name?: string;
  company_name: string;
  domain: string;
  lead_source: string;
  employees: string;
  contact_person: string;
  contact_name?: string;
  phone_number: string;
  email: string;
  legal_business_name: string;
  business_ein: string;
  state_file_number: string;
  duns_number: string;
  business_address: string;
  country: string;
  state: string;
  city: string;
  zip_code: string;
  business_phone: string;
  entity_type: string;
  industry_type: string;
  business_start_date: string;
  ssn_last_4: string;
  requirement_details: string;
  partner_id?: number | string;
  partner?: {
    id: number;
    full_name: string;
    company_name?: string | null;
  };
  convert_to?: string | null;
  /** Set only for the host converting another partner's borrower lead. */
  convert_as_options?: LeadConvertAsOption[];
  partner_manager: string;
  created_at?: string;
  updated_at?: string;
}

/** Whose borrower the host files another partner's lead under (fch-api Lead::CONVERT_AS). */
export const LEAD_CONVERT_AS = {
  HOST: 'host',
  LEAD_PARTNER: 'lead_partner',
} as const;

export type LeadConvertAs = typeof LEAD_CONVERT_AS[keyof typeof LEAD_CONVERT_AS];

export interface LeadConvertAsOption {
  value: LeadConvertAs;
  company_name: string | null;
}
