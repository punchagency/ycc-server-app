import { Schema, model, Document } from "mongoose";

interface IInvoice extends Document {
    _id: Schema.Types.ObjectId;
    stripeInvoiceId: string;
    userId: Schema.Types.ObjectId;
    orderId?: Schema.Types.ObjectId;
    bookingId?: Schema.Types.ObjectId;
    businessIds: Schema.Types.ObjectId[];
    amount: number;
    platformFee: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
    invoiceDate: Date;
    dueDate: Date;
    paymentDate?: Date;
    stripeInvoiceUrl?: string;
}

const invoiceSchema = new Schema<IInvoice>({
    stripeInvoiceId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    businessIds: [{ type: Schema.Types.ObjectId, ref: 'Business', required: true }],
    amount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'], required: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    paymentDate: { type: Date },
    stripeInvoiceUrl: { type: String }
}, {
    timestamps: true
});

export default model<IInvoice>('Invoice', invoiceSchema);