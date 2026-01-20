export interface PreQualificationApplication {
    id: number;
    full_name: string;
    funding_type: string | null;
    business_name: string;
    industry: string;
    date: string;
    requested_amount: string | null;
    status: string;
}
