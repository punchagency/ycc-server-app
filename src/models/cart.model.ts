import { Schema, model, Document } from 'mongoose';

export interface ICart extends Document {
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    totalItems: number;
    totalPrice?: number;
    lastUpdated: Date;
    userCurrency: string;
    items: {
        productId: Schema.Types.ObjectId;
        quantity: number;
        originalPrice: number;
        originalCurrency: string;
        displayPrice: number;
        displayCurrency: string;
        businessId: Schema.Types.ObjectId;
        totalPriceOfItems?: number;
        lockedAt?: Date;
    }[]
}

const cartSchema = new Schema<ICart>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalItems: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    lastUpdated: { type: Date, required: true },
    userCurrency: { type: String, required: true, default: 'usd' },
    items: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        originalPrice: { type: Number, required: true },
        originalCurrency: { type: String, required: true },
        displayPrice: { type: Number, required: true },
        displayCurrency: { type: String, required: true },
        businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
        totalPriceOfItems: { type: Number, required: true },
        lockedAt: { type: Date }
    }]
}, {
    timestamps: true
});

export default model<ICart>('Cart', cartSchema);