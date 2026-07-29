/**
 * Retrieves description for payment providers.
 *
 * @param name Payment provider name
 * @param fallback Optional custom fallback text if provider name is unknown
 */
export const getProviderDesc = (name: string, fallback?: string): string => {
    switch (name?.toLowerCase()) {
        case 'stripe':
            return 'Processes credit cards, digital wallets, Apple Pay, and Google Pay transactions.';
        case 'square':
            return 'Accepts digital terminal configurations, point-of-sale card payments, and online checkout integrations.';
        case 'ecrypt':
            return 'Manages high-volume ACH transfers, direct bank routing, and secure electronic check processing.';
        case 'authorize.net':
        case 'authorizenet':
        case 'authorize':
            return 'Provides secure card processing, merchant accounts, and advanced fraud detection suites.';
        case 'cash payment':
        case 'cash':
            return 'Allows manual recording and tracking of physical cash transactions processed offline.';
        case 'bank transfer':
        case 'bank':
            return 'Supports manual confirmation of direct wire transfers, ACH deposits, or routing payments.';
        default:
            return fallback || 'Configure merchant options and status parameters for checkout integrations.';
    }
};
