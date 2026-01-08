import 'dotenv/config';

const FALLBACK_RATES: Record<string, number> = {
    USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.52, JPY: 149.50,
    CHF: 0.88, CNY: 7.24, INR: 83.12, MXN: 17.08, BRL: 4.97, ZAR: 18.65,
    AED: 3.67, SAR: 3.75, KRW: 1320.50, SGD: 1.34, HKD: 7.82, NOK: 10.87,
    SEK: 10.52, DKK: 6.87, PLN: 3.96, THB: 35.12, MYR: 4.72, IDR: 15678.50,
    PHP: 56.23, TRY: 32.15, RUB: 92.50, NZD: 1.67
};

interface RateCache {
    rates: Record<string, number>;
    timestamp: number;
}

export class CurrencyConverter {
    private static cache: RateCache | null = null;
    private static CACHE_DURATION = 3600000; // 1 hour
    private static API_KEY = process.env.EXCHANGE_RATE_API_KEY;
    private static API_URL = 'https://v6.exchangerate-api.com/v6';

    private static async fetchRates(): Promise<Record<string, number>> {
        if (!this.API_KEY) {
            return FALLBACK_RATES;
        }

        if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
            return this.cache.rates;
        }

        try {
            const response = await fetch(`${this.API_URL}/${this.API_KEY}/latest/USD`);
            const data: any = await response.json();
            
            if (data.result === 'success') {
                this.cache = {
                    rates: data.conversion_rates,
                    timestamp: Date.now()
                };
                return data.conversion_rates;
            }
        } catch (error) {
            console.error('Exchange rate API error:', error);
        }

        return this.cache?.rates || FALLBACK_RATES;
    }

    static async convertToUSD(amount: number, fromCurrency: string): Promise<number> {
        const currency = fromCurrency.toUpperCase();
        if (currency === 'USD') return amount;

        const rates = await this.fetchRates();
        const rate = rates[currency];
        
        if (!rate) return amount;
        
        return amount / rate;
    }

    static async convertFromUSD(amount: number, toCurrency: string): Promise<number> {
        const currency = toCurrency.toUpperCase();
        if (currency === 'USD') return amount;

        const rates = await this.fetchRates();
        const rate = rates[currency];
        
        if (!rate) return amount;
        
        return amount * rate;
    }
}
