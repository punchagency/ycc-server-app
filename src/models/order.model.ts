import { Schema, model, Document } from 'mongoose';

export const ORDER_STATUSES = ['pending', 'declined', 'confirmed', 'processing', 'out_for_delivery', 'shipped', 'delivered', 'cancelled'] as const;
export const ORDER_PAYMENT_STATUSES =['paid', 'pending', 'failed', 'cancelled'];
export interface IOrder extends Document {
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
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
        confirmationToken: string;
        confirmationExpires: Date;
    }[];
    userType: 'user' | 'distributor';
    status: typeof ORDER_STATUSES[number];
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
    paymentStatus: typeof ORDER_PAYMENT_STATUSES[number];
    stripeInvoiceUrl?: string | null;
    stripeInvoiceId?: string | null;
    enableShipping?: boolean;
    orderHistory: {
        fromStatus: 'pending' | 'declined' | 'confirmed' | 'processing' | 'out_for_delivery' | 'shipped' | 'delivered' | 'cancelled';
        toStatus: 'pending' | 'declined' | 'confirmed' | 'processing' | 'out_for_delivery' | 'shipped' | 'delivered' | 'cancelled';
        changedBy: string;
        userRole: string;
        reason?: string;
        notes?: string;
        changedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
        },
        confirmationToken: { type: String, required: true },
        confirmationExpires: { type: Date, required: true }
    }],
    userType: {
        type: String,
        enum: ['user', 'distributor'],
        required: true
    },
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
        required: false
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
        enum: ['paid', 'pending', 'failed', 'cancelled'],
        required: true
    },
    stripeInvoiceUrl: { type: String },
    stripeInvoiceId: { type: String },
    enableShipping: { type: Boolean, default: true },
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

OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ trackingNumber: 1 });

export default model<IOrder>('Order', OrderSchema);