import { Schema, model, Document } from 'mongoose';

export interface IService extends Document {
    _id: Schema.Types.ObjectId;
    name: string;
    description?: string;
    imageURLs?: string[];
    price: number;
    businessId: Schema.Types.ObjectId;
    categoryId: Schema.Types.ObjectId;
    isQuotable?: boolean;
}

const serviceSchema = new Schema<IService>({
    name: { type: String, required: true },
    description: { type: String, required: false },
    imageURLs: [{ type: String, required: false }],
    price: { type: Number, required: true },
    businessId: { type: Schema.Types.ObjectId, required: true, ref: 'Business' },
    categoryId: { type: Schema.Types.ObjectId, required: true, ref: 'Category' },
    isQuotable: { type: Boolean, required: false, default: false }
}, {
    timestamps: true
});

serviceSchema.index({ name: 'text', description: 'text' });
serviceSchema.index({ businessId: 1 });

export default model<IService>('Service', serviceSchema);