import { Schema, model, Document } from "mongoose";

export interface IQuote extends Document {
    _id: Schema.Types.ObjectId,
    bookingId: Schema.Types.ObjectId,
    services: {
        serviceId: Schema.Types.ObjectId,
        item: string,
        description?: string,
        quantity: number,
        unitPrice: number,
        discount?: number,
        tax?: number,
        totalPrice: number
    }[],
    status: 'pending' | 'quoted' | 'accepted' | 'declined' | 'deposit_paid' | "final_payment_due" | 'completed' | 'cancelled',
    stripeInvoiceId?: string,
    stripeInvoiceUrl?: string,
    stripePDFUrl?: string,
    paymentDueDate?: Date,
    validUntil?: Date,
    amount: number,
    platformFee: number,
    currency: string,
    quoteDate: Date,
    expiryDate?: Date,
    quoteAmount: number,
    requestDetails?: string,
    customerNotes?: string,
    businessNotes?: string,
    attachments: string[],
    createdBy: Schema.Types.ObjectId,
    updatedBy: Schema.Types.ObjectId
}



const quoteSchema = new Schema<IQuote>({
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    services: [{
        serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
        item: { type: String, required: true },
        description: { type: String },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        discount: { type: Number },
        tax: { type: Number },
        totalPrice: { type: Number, required: true }
    }],
    status: {
        type: String,
        enum: ['pending', 'quoted', 'accepted', 'declined', 'deposit_paid', "final_payment_due", 'completed', 'cancelled'],
        required: true
    },
    stripeInvoiceId: { type: String },
    stripeInvoiceUrl: { type: String },
    stripePDFUrl: { type: String },
    paymentDueDate: { type: Date },
    validUntil: { type: Date },
    amount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    currency: { type: String, required: true },
    quoteDate: { type: Date, required: true },
    expiryDate: { type: Date },
    quoteAmount: { type: Number, required: true },
    requestDetails: { type: String },
    customerNotes: { type: String },
    businessNotes: { type: String },
    attachments: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
    timestamps: true
});

quoteSchema.index({ bookingId: 1 });
export default model<IQuote>('Quote', quoteSchema);