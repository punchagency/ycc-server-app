import { Schema, model, Document } from "mongoose";

export const NOTIFICATION_TYPES = [
    'order',
    'booking',
    'booking-approved',
    'booking-disputed',
    'inventory',
    'system',
    'complaint-filed',
    'complaint-updated',
    'complaint-resolved',
    'flagged-order',
    'reorder-notification',
] as const;

export const NOTIFICATION_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const;
export interface INotification extends Document {
    _id: Schema.Types.ObjectId;
    reciepientId: Schema.Types.ObjectId;
    type: typeof NOTIFICATION_TYPES[number];
    priority: typeof NOTIFICATION_PRIORITY[number];
    title: string;
    message: string;
    data: Record<string, any>;
    read: boolean;
    complaintId?: Schema.Types.ObjectId;
}

const notificationSchema = new Schema<INotification>({
    reciepientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    priority: { type: String, enum: NOTIFICATION_PRIORITY, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: false },
    read: { type: Boolean, default: false },
    complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: false },
}, {
    timestamps: true
});

export default model<INotification>('Notification', notificationSchema);