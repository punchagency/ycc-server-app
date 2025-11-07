import { Document, Schema, model } from "mongoose";


export interface ISystemLog extends Document {
    _id: Schema.Types.ObjectId;
    logLevel: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    source: string;
    stackTrace?: string;
    errorType?: string;
    errorDetails?: any;
    userId?: Schema.Types.ObjectId;
    ipAddress?: string;
    requestData?: any;
}

const SystemLogSchema = new Schema<ISystemLog>({
    logLevel: { type: String, required: true },
    message: { type: String, required: true },
    source: { type: String, required: true },
    stackTrace: { type: String },
    errorType: { type: String },
    errorDetails: { type: Schema.Types.Mixed },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String },
    requestData: { type: Schema.Types.Mixed }
}, { timestamps: true });

export default model<ISystemLog>('SystemLog', SystemLogSchema);