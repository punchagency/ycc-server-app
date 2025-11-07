import { Schema, model, Document } from 'mongoose';


interface IOrder extends Document {
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    businessId: Schema.Types.ObjectId;
    items: {
        productId: Schema.Types.ObjectId;
        quantity: number;
        businessId: Schema.Types.ObjectId;
        discount?: number;
        pricePerItem: number;
        totalPriceOfItems: number;
        fromAddress: {
            street: string;
            city: string;
            state: string;
            zip: string;
            country: string;
        };
        status: 'pending' | 'declined' | 'confirmed' | 'processing' | 'out_for_delivery' | 'shipped' | 'delivered' | 'cancelled';
    }[];
    status: 'pending' | 'declined' | 'confirmed' | 'processing' | 'out_for_delivery' | 'shipped' | 'delivered' | 'cancelled';
    deliveryAddress: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
    shippingMethod: 'standard' | 'express' | 'overnight';
    shippingCost?: number;
    tax?: number;
    total: number;
    trackingNumber?: string;
    notes?: string;
    totalAmount: number;
    platformFee: number;
    invoiceId?: Schema.Types.ObjectId;
    paymentStatus: 'paid' | 'pending' | 'failed';
    stripeInvoiceUrl?: string;
    stripeInvoiceId?: string;
    orderHistory: {
        fromStatus: 'pending' | 'declined' | 'confirmed' | 'processing' | 'out_for_delivery' | 'shipped' | 'delivered' | 'cancelled';
        toStatus: 'pending' | 'declined' | 'confirmed' | 'processing' | 'out_for_delivery' | 'shipped' | 'delivered' | 'cancelled';
        changedBy: string;
        userRole: string;
        reason?: string;
        notes?: string;
        changedAt: Date;
    }[];
}

const OrderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    items: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
        discount: { type: Number },
        pricePerItem: { type: Number, required: true },
        totalPriceOfItems: { type: Number, required: true },
        fromAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            zip: { type: String, required: true },
            country: { type: String, required: true }
        },
        status: {
            type: String,
            enum: ['pending', 'declined', 'confirmed', 'processing', 'out_for_delivery', 'shipped', 'delivered', 'cancelled'],
            required: true
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'declined', 'confirmed', 'processing', 'out_for_delivery', 'shipped', 'delivered', 'cancelled'],
        required: true
    },
    deliveryAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true }
    },
    shippingMethod: {
        type: String,
        enum: ['standard', 'express', 'overnight'],
        required: true
    },
    shippingCost: { type: Number },
    tax: { type: Number },
    total: { type: Number, required: true },
    trackingNumber: { type: String },
    notes: { type: String },
    totalAmount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    invoiceId: { type: Schema.Types.ObjectId },
    paymentStatus: {
        type: String,
        enum: ['paid', 'pending', 'failed'],
        required: true
    },
    stripeInvoiceUrl: { type: String },
    stripeInvoiceId: { type: String },
    orderHistory: [{
        fromStatus: {
            type: String,
            enum: ['pending', 'declined', 'confirmed', 'processing', 'out_for_delivery', 'shipped', 'delivered', 'cancelled'],
            required: true
        },
        toStatus: {
            type: String,
            enum: ['pending', 'declined', 'confirmed', 'processing', 'out_for_delivery', 'shipped', 'delivered', 'cancelled'],
            required: true
        },
        changedBy: { type: String, required: true },
        userRole: { type: String, required: true },
        reason: { type: String },
        notes: { type: String },
        changedAt: { type: Date, required: true }
    }]
}, {
    timestamps: true
});

export default model<IOrder>('Order', OrderSchema);