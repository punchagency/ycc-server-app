import { Schema, model, Document } from 'mongoose';


export interface ICategory extends Document {
    _id: Schema.Types.ObjectId;
    name: string;
    description?: string;
    imageURL?: string;
    type?: 'service' | 'product';
    isApproved?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const categorySchema = new Schema<ICategory>({
    name: { type: String, required: true },
    description: { type: String, required: false },
    imageURL: { type: String, required: false },
    type: { type: String, enum: ['service', 'product'], required: false },
    isApproved: { type: Boolean, required: false, default: false }
}, {
    timestamps: true
});

categorySchema.index({ name: 'text', description: 'text' });
categorySchema.index({ type: 1, isApproved: 1 });

export default model<ICategory>('Category', categorySchema);