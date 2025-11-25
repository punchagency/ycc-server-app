import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    businessId: Schema.Types.ObjectId;
    stripeProductId?: string
    stripePriceId?: string
    name: string;
    price: number;
    category: Schema.Types.ObjectId;
    sku?: string;
    quantity: number;
    minRestockLevel: number;
    description?: string;
    imageURLs?: string[];
    wareHouseAddress: {
        street?: string;
        zipcode?: string;
        city?: string;
        state: string;
        country: string;
    };
    hsCode: string;
    weight: number;
    length: number;
    width: number;
    height: number;
}

const productSchema = new Schema<IProduct>({
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    businessId: { type: Schema.Types.ObjectId, required: true, ref: 'Business' },
    stripeProductId: { type: String, required: false },
    stripePriceId: { type: String, required: false },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: Schema.Types.ObjectId, required: true, ref: 'Category' },
    sku: { type: String, required: false },
    quantity: { type: Number, required: true, default: 0 },
    minRestockLevel: { type: Number, required: true, default: 0 },
    description: { type: String, required: false },
    imageURLs: [{ type: String }],
    wareHouseAddress: { 
        street: { type: String, required: false },
        zipcode: { type: String, required: false },
        city: { type: String, required: false },
        state: { type: String, required: true },
        country: { type: String, required: true }
    },
    hsCode: { type: String, required: true },
    weight: { type: Number, required: true },
    length: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
}, {
    timestamps: true
});

export default model<IProduct>('Product', productSchema);
