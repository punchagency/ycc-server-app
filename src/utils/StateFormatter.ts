import { logWarning } from "./SystemLogs";

interface Address {
    street?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    [key: string]: any;
}

export class AddressFormatter {
    private static readonly US_STATE_CODES: Record<string, string> = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
        'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
        'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
        'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
        'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
        'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
        'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
        'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
        'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
        'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
        'wisconsin': 'WI', 'wyoming': 'WY',
        'district of columbia': 'DC', 'puerto rico': 'PR', 'guam': 'GU',
        'american samoa': 'AS', 'us virgin islands': 'VI', 'u.s. virgin islands': 'VI',
        'northern mariana islands': 'MP',
        'armed forces americas': 'AA', 'armed forces europe': 'AE', 'armed forces pacific': 'AP',
    };

    private static readonly COUNTRY_CODES: Record<string, string> = {
        'united states': 'US', 'united states of america': 'US', 'usa': 'US',
        'canada': 'CA', 'mexico': 'MX',
        'united kingdom': 'GB', 'great britain': 'GB', 'uk': 'GB',
    };

    private static readonly CODE_TO_STATE: Record<string, string> = 
        Object.entries(AddressFormatter.US_STATE_CODES).reduce((acc, [name, code]) => {
            acc[code] = name;
            return acc;
        }, {} as Record<string, string>);

    static formatStateCode(state: string): string {
        if (!state || typeof state !== 'string') return state;

        const trimmed = state.trim();
        if (trimmed.length === 2) return trimmed.toUpperCase();

        const code = this.US_STATE_CODES[trimmed.toLowerCase()];
        if (code) return code;

        logWarning({message: `State code not found: "${state}"`, source: "AddressFormatter.formatStateCode"});
        return trimmed;
    }

    static formatCountryCode(country: string): string {
        if (!country || typeof country !== 'string') return country;

        const trimmed = country.trim();
        if (trimmed.length === 2) return trimmed.toUpperCase();

        const code = this.COUNTRY_CODES[trimmed.toLowerCase()];
        if (code) return code;

        logWarning({message: `Country code not found: "${country}"`, source: "AddressFormatter.formatCountryCode"});
        return trimmed;
    }

    static formatAddress(address: Address): Address {
        if (!address || typeof address !== 'object') return address;

        return {
            ...address,
            state: address.state ? this.formatStateCode(address.state) : address.state,
            country: address.country ? this.formatCountryCode(address.country) : address.country,
        };
    }

    static isValidStateCode(code: string): boolean {
        if (!code || typeof code !== 'string') return false;
        return this.CODE_TO_STATE.hasOwnProperty(code.toUpperCase());
    }

    static isValidCountryCode(code: string): boolean {
        if (!code || typeof code !== 'string') return false;
        return code.length === 2 && /^[A-Z]{2}$/.test(code.toUpperCase());
    }
}

