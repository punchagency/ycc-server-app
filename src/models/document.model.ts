import { Schema, model, Document } from "mongoose";

export interface IDocument extends Document {
    _id: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    businessId?: Schema.Types.ObjectId;
    category: string;
    filename: string;
    originalName: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: Date;
    size: number;
    mimetype: string;
    createdAt: Date;
    updatedAt: Date;
}

const documentSchema = new Schema<IDocument>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business' },
    category: { type: String, required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadedAt: { type: Date, required: true },
    size: { type: Number, required: true },
    mimetype: { type: String, required: true },
}, {
    timestamps: true
});

export default model<IDocument>('Document', documentSchema);