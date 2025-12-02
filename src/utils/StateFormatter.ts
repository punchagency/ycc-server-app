import { logWarning } from "./SystemLogs";

const US_STATE_CODES: Record<string, string> = {
    // Standard states
    'alabama': 'AL',
    'alaska': 'AK',
    'arizona': 'AZ',
    'arkansas': 'AR',
    'california': 'CA',
    'colorado': 'CO',
    'connecticut': 'CT',
    'delaware': 'DE',
    'florida': 'FL',
    'georgia': 'GA',
    'hawaii': 'HI',
    'idaho': 'ID',
    'illinois': 'IL',
    'indiana': 'IN',
    'iowa': 'IA',
    'kansas': 'KS',
    'kentucky': 'KY',
    'louisiana': 'LA',
    'maine': 'ME',
    'maryland': 'MD',
    'massachusetts': 'MA',
    'michigan': 'MI',
    'minnesota': 'MN',
    'mississippi': 'MS',
    'missouri': 'MO',
    'montana': 'MT',
    'nebraska': 'NE',
    'nevada': 'NV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'north carolina': 'NC',
    'north dakota': 'ND',
    'ohio': 'OH',
    'oklahoma': 'OK',
    'oregon': 'OR',
    'pennsylvania': 'PA',
    'rhode island': 'RI',
    'south carolina': 'SC',
    'south dakota': 'SD',
    'tennessee': 'TN',
    'texas': 'TX',
    'utah': 'UT',
    'vermont': 'VT',
    'virginia': 'VA',
    'washington': 'WA',
    'west virginia': 'WV',
    'wisconsin': 'WI',
    'wyoming': 'WY',

    // US Territories
    'district of columbia': 'DC',
    'puerto rico': 'PR',
    'guam': 'GU',
    'american samoa': 'AS',
    'us virgin islands': 'VI',
    'u.s. virgin islands': 'VI',
    'northern mariana islands': 'MP',

    // Armed Forces
    'armed forces americas': 'AA',
    'armed forces europe': 'AE',
    'armed forces pacific': 'AP',
};

const CODE_TO_STATE: { [key: string]: string } = Object.entries(US_STATE_CODES).reduce((acc: { [key: string]: string }, [name, code]) => {
    acc[code] = name;
    return acc;
}, {});

export function formatStateCode(state: string) {
    if (!state || typeof state !== 'string') {
        return state;
    }

    const trimmedState = state.trim();

    if (trimmedState.length === 2) {
        const upperCode = trimmedState.toUpperCase();
        if (CODE_TO_STATE[upperCode]) {
            return upperCode;
        }
        return upperCode;
    }

    const stateLower = trimmedState.toLowerCase();
    const stateCode = US_STATE_CODES[stateLower];

    if (stateCode) {
        return stateCode;
    }

    logWarning({message: `State code not found for: "${state}". Using original value.`, source: "utils/fn.formatStateCode"});
    return trimmedState;
}

export function formatAddressState(address: Record<string, string>) {
    if (!address || typeof address !== 'object') {
        return address;
    }

    return {
        ...address,
        state: address.state ? formatStateCode(address.state) : address.state,
    };
}

export function isValidStateCode(code: string) {
    if (!code || typeof code !== 'string') {
        return false;
    }
    return CODE_TO_STATE.hasOwnProperty(code.toUpperCase());
}

const COUNTRY_CODES: Record<string, string> = {
    'united states': 'US',
    'united states of america': 'US',
    'usa': 'US',
    'canada': 'CA',
    'mexico': 'MX',
    'united kingdom': 'GB',
    'great britain': 'GB',
    'uk': 'GB',
};

export function formatCountryCode(country: string) {
    if (!country || typeof country !== 'string') {
        return country;
    }

    const trimmedCountry = country.trim();

    if (trimmedCountry.length === 2) {
        return trimmedCountry.toUpperCase();
    }

    const countryLower = trimmedCountry.toLowerCase();
    const countryCode = COUNTRY_CODES[countryLower];

    if (countryCode) {
        return countryCode;
    }

    logWarning({message: `Country code not found for: "${country}". Using original value.`, source: "utils/fn.formatCountryCode"});
    return trimmedCountry;
}

