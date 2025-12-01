import { Schema, model, Document } from 'mongoose';

export const SHIPMENT_STATUSES = [
    'created',
    'rates_fetched',
    'rate_selected',
    'label_purchased',
    'shipped',
    'delivered',
    'failed',
    'returned_to_supplier', // Updated to match tracking system
] as const;


export interface IShippment extends Document {
    _id: Schema.Types.ObjectId;
    orderId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    trackingNumber: string;
    fromAddress: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    },
    toAddress: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    },
    items: {
        productId: Schema.Types.ObjectId;
        quantity: number;
        businessId: Schema.Types.ObjectId;
        discount?: number;
        pricePerItem: number;
        totalPriceOfItems: number;
    }[];
    rates: {
        carrier: string;
        rate: number;
        service: string;
        estimatedDays: number;
        guaranteedDeliveryDate: boolean;
        deliveryDate: Date;
        isSelected: boolean;
        id: string
    }[];
    carrierName: string;
    labelUrl: string;
    batchId: string;
    lastWebhookData: Schema.Types.Mixed;
    status: typeof SHIPMENT_STATUSES[number];
    createdAt: Date;
    updatedAt: Date;
}


const ShippmentSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    trackingNumber: { type: String, required: true },
    carrier: { type: String, required: true },
    status: { type: String, enum: ['pending', 'in_transit', 'delivered', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

ShippmentSchema.index({ orderId: 1 });
ShippmentSchema.index({ status: 1 });

export default model<IShippment>('Shippment', ShippmentSchema);