import { Types } from "mongoose";
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

const Validate = {
    email: (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    emailStrict: (email: string): boolean => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email),
    URL: (url: string): boolean => /^(ftp|http|https):\/\/[^ "]+$/.test(url),
    URLStrict: (url: string): boolean => {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    },
    phone: (phone: string, country?: string): boolean => {
        if(!country) country = 'US';
        try {
            return isValidPhoneNumber(phone, country as any);
        } catch {
            return false;
        }
    },
    phoneInternational: (phone: string): boolean => /^\+?[1-9]\d{1,14}$/.test(phone),
    phoneNigerian: (phone: string): boolean => /^(\+234|234|0)[789][01]\d{8}$/.test(phone),
    formatPhone: (phone: string, country?: string): string | null => {
        if(!country) country = 'US';
        try {
            const phoneNumber = parsePhoneNumber(phone, country as any);
            return phoneNumber.formatInternational();
        } catch {
            return null;
        }
    },
    integer: (value: any): boolean => Number.isInteger(value),
    positiveInteger: (value: any): boolean => Number.isInteger(value) && value >= 0,
    negativeInteger: (value: any): boolean => Number.isInteger(value) && value < 0,
    float: (value: any): boolean => typeof value === 'number' && !Number.isNaN(value) && !Number.isInteger(value),
    numberInRange: (value: number, min: number, max: number): boolean => 
        typeof value === 'number' && !Number.isNaN(value) && value >= min && value <= max,
    string: (value: any): boolean => typeof value === 'string' && value.trim() !== '',
    stringLength: (value: string, min: number, max: number): boolean => 
        typeof value === 'string' && value.length >= min && value.length <= max,
    stringPattern: (value: string, pattern: RegExp): boolean => pattern.test(value),
    array: (value: any): boolean => Array.isArray(value) && value.length > 0,
    arrayLength: (value: any, min: number, max: number): boolean => 
        Array.isArray(value) && value.length >= min && value.length <= max,
    arrayOf: (value: any, typeValidator: (item: any) => boolean): boolean => 
        Array.isArray(value) && value.length > 0 && value.every(item => typeValidator(item)),
    object: (value: any): boolean => typeof value === 'object' && value !== null && Object.keys(value).length > 0,
    objectWithKeys: (value: any, requiredKeys: string[]): boolean => 
        typeof value === 'object' && 
        value !== null && 
        requiredKeys.every(key => Object.prototype.hasOwnProperty.call(value, key)),
    ISODateTime: (dateString: string): boolean => !isNaN(Date.parse(dateString)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(dateString),
    ISODate: (dateString: string): boolean => !isNaN(Date.parse(dateString)) && new Date(dateString).toISOString().split('.')[0] === dateString,
    date: (dateString: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !isNaN(new Date(dateString).getTime()),
    time: (time: string): boolean => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time),
    timeWithSeconds: (time: string): boolean => /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(time),
    datetime: (dateString: string): boolean => !isNaN(Date.parse(dateString)) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString),
    futureDatetime: (dateString: string): boolean => {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && date > new Date();
    },
    pastDatetime: (dateString: string): boolean => {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && date < new Date();
    },
    dateInRange: (dateString: string, startDate: Date, endDate: Date): boolean => {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && date >= startDate && date <= endDate;
    },
    boolean: (value: any): boolean => typeof value === 'boolean',
    oneOf: ({value, allowedValues}:{value: any, allowedValues: any[]}): boolean => 
        allowedValues.includes(value),
    creditCard: (cardNumber: string): boolean => {
        const sanitized = cardNumber.replace(/\D/g, '');
        if (!/^\d{13,19}$/.test(sanitized)) return false;
        
        let sum = 0;
        let shouldDouble = false;
        
        for (let i = sanitized.length - 1; i >= 0; i--) {
            let digit = parseInt(sanitized.charAt(i));
            
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        
        return (sum % 10) === 0;
    },
    uuid: (value: string): boolean => 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
    ipAddress: (value: string): boolean => {
        const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        const ipv4Match = value.match(ipv4Pattern);
        if (ipv4Match) {
            return ipv4Match.slice(1).every(octet => parseInt(octet) <= 255);
        }
        
        const ipv6Pattern = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
        return ipv6Pattern.test(value);
    },
    password: (password: string): boolean => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{7,}$/.test(password),
    passwordStrength: (password: string, level: 'weak' | 'medium' | 'strong' | 'very-strong'): boolean => {
        const weak = /^.{6,}$/;
        const medium = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{10,}$/;
        const veryStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*[^a-zA-Z0-9\s]).{12,}$/;
        
        switch (level) {
            case 'weak': return weak.test(password);
            case 'medium': return medium.test(password);
            case 'strong': return strong.test(password);
            case 'very-strong': return veryStrong.test(password);
            default: return false;
        }
    },
    json: (value: string): boolean => {
        try {
            JSON.parse(value);
            return true;
        } catch (e) {
            return false;
        }
    },
    base64: (value: string): boolean => /^[A-Za-z0-9+/=]+$/.test(value),
    hex: (value: string): boolean => /^[0-9a-f]+$/i.test(value),
    alpha: (value: string): boolean => /^[a-zA-Z]+$/.test(value),
    alphanumeric: (value: string): boolean => /^[a-zA-Z0-9]+$/.test(value),
    nigerianPostalCode: (value: string): boolean => /^\d{6}$/.test(value),

    formatCurrency: (amount: number, currency: string = 'NGN'): string => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency
        }).format(amount);
    },
    uniqueArray: (arr: any[]): boolean => {
        return arr.length === new Set(arr).size;
    },
    isEmpty: (value: any): boolean => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },
    isNotEmpty: (value: any): boolean => !Validate.isEmpty(value),
    fileSize: (size: number, maxSize: number): boolean => size <= maxSize,
    fileType: (mimeType: string, allowedTypes: string[]): boolean => 
        allowedTypes.includes(mimeType),
    bvn: (value: string): boolean => /^\d{11}$/.test(value),
    nin: (value: string): boolean => /^\d{11}$/.test(value),
    mongoId: (value: string): boolean => Boolean(new Types.ObjectId(value)),
};

export default Validate;