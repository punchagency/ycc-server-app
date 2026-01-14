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


export interface IShipment extends Document {
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
        originalPrice: number;
        originalCurrency: string;
        convertedPrice: number;
        convertedCurrency: string;
        totalPriceOfItems: number;
    }[];
    customsInfo?: {
        customs_items: {
            description: string;
            quantity: number;
            weight: number;
            value: number;
            hs_tariff_number: string;
            origin_country: string;
        }[];
    };
    rates: {
        carrier: string;
        rate: number;
        currency: string;
        service: string;
        estimatedDays: number;
        guaranteedDeliveryDate: boolean;
        deliveryDate: Date;
        isSelected: boolean;
        id: string
    }[];
    carrierName: string;
    labelUrl?: string;
    publicUrl?: string;
    batchId: string;
    lastWebhookData: Schema.Types.Mixed;
    status: typeof SHIPMENT_STATUSES[number];
    shipmentCost?: number;
    shipmentCurrency?: string;
    isBusinessHandled: boolean;
    createdAt: Date;
    updatedAt: Date;
}


const ShipmentSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    trackingNumber: { type: String },
    fromAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true }
    },
    toAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true }
    },
    items: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
        discount: { type: Number },
        originalPrice: { type: Number, required: true },
        originalCurrency: { type: String, required: true },
        convertedPrice: { type: Number, required: true },
        convertedCurrency: { type: String, required: true },
        totalPriceOfItems: { type: Number, required: true }
    }],
    customsInfo: {
        customs_items: [{
            description: { type: String },
            quantity: { type: Number },
            weight: { type: Number },
            value: { type: Number },
            hs_tariff_number: { type: String },
            origin_country: { type: String }
        }]
    },
    rates: [{
        carrier: { type: String, required: true },
        rate: { type: Number, required: true },
        currency: { type: String, required: true, default: "usd" },
        service: { type: String, required: true },
        estimatedDays: { type: Number },
        guaranteedDeliveryDate: { type: Boolean },
        deliveryDate: { type: Date },
        isSelected: { type: Boolean, default: false },
        id: { type: String, required: true }
    }],
    carrierName: { type: String },
    labelUrl: { type: String },
    publicUrl: { type: String },
    batchId: { type: String },
    lastWebhookData: { type: Schema.Types.Mixed },
    status: { 
        type: String, 
        enum: SHIPMENT_STATUSES, 
        default: 'created' 
    },
    shipmentCost: { type: Number },
    shipmentCurrency: { type: String, default: 'usd' },
    isBusinessHandled: { type: Boolean, default: false }
}, {
    timestamps: true
});

ShipmentSchema.index({ orderId: 1 });
ShipmentSchema.index({ userId: 1 });
ShipmentSchema.index({ status: 1 });
ShipmentSchema.index({ trackingNumber: 1 });

export default model<IShipment>('Shipment', ShipmentSchema);