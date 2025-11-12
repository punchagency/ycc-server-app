import { BOOKING_STATUSES } from "../models/booking.model"


export interface ICreateBookingInput{
    serviceId: string,
    serviceLocation: {
        street: string,
        city: string,
        state: string,
        zip: string,
        country: string
    },
    dateTime: string,
    notes?: string,
    contact?: {
        email?: string,
        phone?: string
    }
}

export interface IUpdateBookingStatus {
    status: typeof BOOKING_STATUSES[number];
    reason?: string;
    notes?: string;
    requiresQuote?: boolean;
    quoteItems?: {
        name: string;
        price: number;
        quantity?: number;
    }[]
}

export interface IGetBookingsQueries {
    page?: number;
    limit?: number;
    status?: typeof BOOKING_STATUSES[number];
    paymentStatus?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
    startDate?: Date;
    endDate?: Date;
    sortBy?: 'dateTime' | 'createdAt' | 'bookingStatus' | 'paymentStatus' | 'vendorName';
    sortOrder?: 'asc' | 'desc';
}