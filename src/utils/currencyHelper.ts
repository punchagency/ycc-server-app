import { CurrencyConverter } from './currencyConverter';

export interface PriceConversion {
    originalPrice: number;
    originalCurrency: string;
    convertedPrice: number;
    convertedCurrency: string;
    conversionRate: number;
    conversionTimestamp: Date;
}

export class CurrencyHelper {
    static async convertPrice(
        amount: number,
        fromCurrency: string,
        toCurrency: string
    ): Promise<PriceConversion> {
        const from = fromCurrency.toUpperCase();
        const to = toCurrency.toUpperCase();

        if (from === to) {
            return {
                originalPrice: amount,
                originalCurrency: from,
                convertedPrice: amount,
                convertedCurrency: to,
                conversionRate: 1,
                conversionTimestamp: new Date()
            };
        }

        const amountInUSD = await CurrencyConverter.convertToUSD(amount, from);
        const convertedAmount = await CurrencyConverter.convertFromUSD(amountInUSD, to);
        const conversionRate = convertedAmount / amount;

        return {
            originalPrice: amount,
            originalCurrency: from,
            convertedPrice: convertedAmount,
            convertedCurrency: to,
            conversionRate,
            conversionTimestamp: new Date()
        };
    }

    static async convertPriceToUserCurrency(
        amount: number,
        originalCurrency: string,
        userCurrency: string
    ): Promise<number> {
        const from = originalCurrency.toUpperCase();
        const to = userCurrency.toUpperCase();

        if (from === to) return amount;

        const amountInUSD = await CurrencyConverter.convertToUSD(amount, from);
        return await CurrencyConverter.convertFromUSD(amountInUSD, to);
    }

    static async convertToDistributorCurrency(
        amount: number,
        fromCurrency: string,
        distributorCurrency: string,
        storedConversionRate?: number
    ): Promise<number> {
        if (storedConversionRate) {
            return amount / storedConversionRate;
        }

        const from = fromCurrency.toUpperCase();
        const to = distributorCurrency.toUpperCase();

        if (from === to) return amount;

        const amountInUSD = await CurrencyConverter.convertToUSD(amount, from);
        return await CurrencyConverter.convertFromUSD(amountInUSD, to);
    }

    static async convertProductsForDisplay(products: any[], userCurrency: string): Promise<any[]> {
        return Promise.all(products.map(async (product) => {
            const productObj = product.toObject ? product.toObject() : product;
            const displayPrice = await this.convertPriceToUserCurrency(
                productObj.price || 0,
                productObj.currency || 'usd',
                userCurrency
            );
            return {
                ...productObj,
                displayPrice,
                displayCurrency: userCurrency.toUpperCase(),
                originalPrice: productObj.price,
                originalCurrency: productObj.currency
            };
        }));
    }

    static async convertServicesForDisplay(services: any[], userCurrency: string): Promise<any[]> {
        return Promise.all(services.map(async (service) => {
            const serviceObj = service.toObject ? service.toObject() : service;
            const displayPrice = await this.convertPriceToUserCurrency(
                serviceObj.price || 0,
                serviceObj.currency || 'usd',
                userCurrency
            );
            return {
                ...serviceObj,
                displayPrice,
                displayCurrency: userCurrency.toUpperCase(),
                originalPrice: serviceObj.price,
                originalCurrency: serviceObj.currency
            };
        }));
    }
}
