export interface DashboardCounts {
    total_partners: number;
    total_clients: number;
    total_leads: number;
    total_commission: number;
}

export interface LatestFundingApplication {
    id: number;
    browser: string | null;
    partner: string | null;
    requested_amount: string | null;
    entity_type: string;
    industry_type: string;
    status: string;
    status_class: string;
    purpose_of_funds: string | null;
    total_funded_amount: string | null;
    currency: string;
    currency_symbol: string;
    conversion_rate: string;
    formatted_created_at: string;
}

export interface LatestPreQualification {
    id: number;
    browser: string | null;
    partner: string | null;
    purpose_of_funding: string | null;
    industry_type: string;
    business_structure: string;
    funding_requested_amount: string | null;
    status: string;
    status_class: string;
    formatted_created_at: string;
}

export interface UpcomingMeeting {
    id: number;
    subject: string;
    status: string;
    appointment_date: string;
    meeting_type: string;
    formatted_appointment_date: string;
}

export interface LatestLead {
    id: number;
    lead_id: string;
    contact_person: string;
    company_name: string;
    email: string;
    phone_number: string;
    lead_type: string;
    status: string;
    formatted_created_at: string;
}

export interface DashboardData {
    counts: DashboardCounts;
    upcoming_meetings: UpcomingMeeting[];
    latest_funding_applications: LatestFundingApplication[];
    latest_pre_qualifications: LatestPreQualification[];
    latest_leads: LatestLead[];
}

export interface DashboardResponse {
    status: boolean;
    message: string;
    data: DashboardData;
}
