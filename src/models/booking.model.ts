import { Schema, model, Document } from "mongoose";

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'declined'] as const;
export interface IBooking extends Document {
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    businessId: Schema.Types.ObjectId;
    serviceId: Schema.Types.ObjectId;
    quoteId?: Schema.Types.ObjectId;
    quoteStatus?: 'not_required' | 'pending' | 'provided' | 'accepted' | 'rejected' | 'edit_requested' | 'edited' | 'partially_accepted';
    requiresQuote?: boolean;
    totalAmount?: number;
    platformFee?: number;
    serviceLocation: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
    bookingDate: Date;
    startTime: Date;
    customerEmail?: string;
    customerPhone?: string;
    status: typeof BOOKING_STATUSES[number];
    paymentStatus: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
    completedStatus?: 'pending' | 'request_completed' | 'completed' | 'rejected';
    completedRejectionReason?: string;
    attachments?: string[];
    confirmationToken?: string;
    confirmationExpires?: Date;
    isTokenUsed?: boolean;
    confirmedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    declinedAt?: Date;
    cancellationReason?: string;
    declineReason?: string;
    crewAcceptedQuoteAt?: Date;
    crewRejectedQuoteAt?: Date;
    stripeInvoiceId?: string;
    stripeInvoiceUrl?: string;
    paidAt?: Date;
    notes?: string;
    statusHistory?: {
        fromStatus: string;
        toStatus: string;
        changedBy?: string;
        userRole?: string;
        reason?: string;
        notes?: string;
        changedAt: Date;
    }[],
    createdAt: Date;
    updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
    quoteStatus: { type: String, enum: ['not_required', 'pending', 'provided', 'accepted', 'rejected', 'edit_requested', 'edited', 'partially_accepted'] },
    requiresQuote: { type: Boolean, default: false },
    totalAmount: { type: Number },
    platformFee: { type: Number },
    serviceLocation: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true }
    },
    bookingDate: { type: Date, required: true },
    startTime: { type: Date, required: true },
    customerEmail: { type: String },
    customerPhone: { type: String },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed', 'declined'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'], required: true },
    completedStatus: { type: String, enum: ['pending', 'request_completed', 'completed', 'rejected'], default: 'pending' },
    completedRejectionReason: { type: String },
    attachments: [{ type: String }],
    confirmationToken: { type: String },
    confirmationExpires: { type: Date },
    isTokenUsed: { type: Boolean },
    confirmedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    declinedAt: { type: Date },
    cancellationReason: { type: String },
    declineReason: { type: String },
    crewAcceptedQuoteAt: { type: Date },
    crewRejectedQuoteAt: { type: Date },
    stripeInvoiceId: { type: String },
    stripeInvoiceUrl: { type: String },
    paidAt: { type: Date },
    notes: { type: String },
    statusHistory: [{
        fromStatus: { type: String, required: true },
        toStatus: { type: String, required: true },
        changedBy: { type: String },
        userRole: { type: String },
        reason: { type: String },
        notes: { type: String },
        changedAt: { type: Date, required: true }
    }]
}, {
    timestamps: true
});

bookingSchema.index({ confirmationToken: 1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ businessId: 1, status: 1 });

export default model<IBooking>('Booking', bookingSchema);
