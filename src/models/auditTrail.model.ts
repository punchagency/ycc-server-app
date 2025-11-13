import { Schema, model, Document } from "mongoose";
import { ROLES } from "./user.model";

export interface IAuditLog extends Document {
    _id: Schema.Types.ObjectId | string;
    userId?: Schema.Types.ObjectId | string;
    email?: string;
    name?: string;
    action: string;
    actionType?: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'payment' | 'admin_action' | 'other' | null;
    entityType: typeof ROLES[number];
    entityId?: Schema.Types.ObjectId | string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    additionalContext?: any;
}

const AuditLogSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    email: { type: String },
    name: { type: String },
    action: { type: String, required: true },
    actionType: {
        type: String,
        enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'payment', 'admin_action', 'other'],
        required: true
    },
    entityType: {
        type: String,
        enum: ['admin', 'user', 'distributor', 'manufacturer'],
        required: true
    },
    entityId: { type: Schema.Types.ObjectId },
    oldValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    sessionId: { type: String },
    additionalContext: { type: Schema.Types.Mixed }
}, {
    timestamps: true
});

export default model<IAuditLog>('AuditLog', AuditLogSchema);