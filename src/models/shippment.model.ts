import { Schema, model, Document } from 'mongoose';

export interface IShippment extends Document {
    _id: Schema.Types.ObjectId;
    orderId: Schema.Types.ObjectId;
    trackingNumber: string;
    carrier: string;
    status: 'pending' | 'in_transit' | 'delivered' | 'failed';
    createdAt: Date;
    updatedAt: Date;
}