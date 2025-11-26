import { Schema, model, Document } from "mongoose";

export const DOCUMENT_CATEGORIES = [
    'invoice',
    'contract',
    'receipt',
    'license',
    'certification',
    'tax_document',
    'insurance',
    'legal',
    'financial',
    'identity',
    'Identification',
    'Employment',
    'Certificates $ Licenses',
    'Medical',
    'Yacht',
    'Insurance',
    'other'
] as const;

export interface IDocument extends Document {
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    businessId?: Schema.Types.ObjectId;
    category: typeof DOCUMENT_CATEGORIES[number];
    filename: string;
    originalName: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: Date;
    mimetype: string;
    createdAt: Date;
    updatedAt: Date;
}

const documentSchema = new Schema<IDocument>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business' },
    category: { type: String, required: true, enum: DOCUMENT_CATEGORIES },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
    mimetype: { type: String, required: true },
}, {
    timestamps: true
});

documentSchema.index({ userId: 1, category: 1 });
documentSchema.index({ businessId: 1, category: 1 });

export default model<IDocument>('Document', documentSchema);