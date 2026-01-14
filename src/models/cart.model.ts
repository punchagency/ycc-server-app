import { Schema, model, Document } from 'mongoose';

export interface ICart extends Document {
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    totalItems: number;
    totalPrice?: number;
    lastUpdated: Date;
    items: {
        productId: Schema.Types.ObjectId;
        quantity: number;
        pricePerItem?: number;
        currency?: string;
        businessId: Schema.Types.ObjectId;
        totalPriceOfItems?: number;
    }[]
}

const cartSchema = new Schema<ICart>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalItems: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    lastUpdated: { type: Date, required: true },
    items: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        pricePerItem: { type: Number, required: false },
        currency: { type: String, required: false, default: 'usd' },
        businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
        totalPriceOfItems: { type: Number, required: false }
    }]
}, {
    timestamps: true
});

export default model<ICart>('Cart', cartSchema);