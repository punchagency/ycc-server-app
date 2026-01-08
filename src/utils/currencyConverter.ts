// Simple currency conversion rates (relative to USD)
// In production, consider using a real-time API like exchangerate-api.com
const EXCHANGE_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.52,
    JPY: 149.50,
    CHF: 0.88,
    CNY: 7.24,
    INR: 83.12,
    MXN: 17.08,
    BRL: 4.97,
    ZAR: 18.65,
    AED: 3.67,
    SAR: 3.75,
    KRW: 1320.50,
    SGD: 1.34,
    HKD: 7.82,
    NOK: 10.87,
    SEK: 10.52,
    DKK: 6.87,
    PLN: 3.96,
    THB: 35.12,
    MYR: 4.72,
    IDR: 15678.50,
    PHP: 56.23,
    TRY: 32.15,
    RUB: 92.50,
    NZD: 1.67
};

export class CurrencyConverter {
    static convertToUSD(amount: number, fromCurrency: string): number {
        const currency = fromCurrency.toUpperCase();
        const rate = EXCHANGE_RATES[currency];
        
        if (!rate) {
            return amount; // Fallback: assume USD if currency not found
        }
        
        return amount / rate;
    }

    static convertFromUSD(amount: number, toCurrency: string): number {
        const currency = toCurrency.toUpperCase();
        const rate = EXCHANGE_RATES[currency];
        
        if (!rate) {
            return amount; // Fallback: return as-is if currency not found
        }
        
        return amount * rate;
    }
}
