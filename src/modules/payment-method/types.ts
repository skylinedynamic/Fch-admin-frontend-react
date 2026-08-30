export interface PaymentProvider {
    id: number;
    name: string;
    logo: string | null;
    status: boolean;
    slug: string;
    created_at: string;
    updated_at: string;
}
