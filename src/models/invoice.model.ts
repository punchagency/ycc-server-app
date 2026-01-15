import { Schema, model, Document } from "mongoose";

interface IInvoice extends Document {
    _id: Schema.Types.ObjectId;
    stripeInvoiceId: string;
    userId: Schema.Types.ObjectId;
    orderId?: Schema.Types.ObjectId;
    bookingId?: Schema.Types.ObjectId;
    businessIds: Schema.Types.ObjectId[];
    originalAmount?: number;
    originalCurrency?: string;
    convertedAmount?: number;
    convertedCurrency?: string;
    conversionRate?: number;
    conversionTimestamp?: Date;
    amount: number;
    platformFee: number;
    distributorAmount: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
    invoiceDate: Date;
    dueDate: Date;
    paymentDate?: Date;
    stripeInvoiceUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>({
    stripeInvoiceId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    businessIds: [{ type: Schema.Types.ObjectId, ref: 'Business', required: true }],
    originalAmount: { type: Number, required: false },
    originalCurrency: { type: String, required: false },
    convertedAmount: { type: Number, required: false },
    convertedCurrency: { type: String, required: false },
    conversionRate: { type: Number, required: false },
    conversionTimestamp: { type: Date, required: false },
    amount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    distributorAmount: { type: Number, required: true },
    currency: { type: String, required: true, default: "usd" },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'], required: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    paymentDate: { type: Date },
    stripeInvoiceUrl: { type: String }
}, {
    timestamps: true
});

invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ userId: 1 });
invoiceSchema.index({ orderId: 1 });
invoiceSchema.index({ bookingId: 1 });
invoiceSchema.index({ stripeInvoiceId: 1 });

export default model<IInvoice>('Invoice', invoiceSchema);