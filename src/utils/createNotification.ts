import NotificationModel, { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../models/notification.model";
import { Schema } from "mongoose";

const createNotification = async ({
    recipientId,
    type,
    priority = 'medium',
    title,
    message,
    data,
    complaintId
}: {
    recipientId: Schema.Types.ObjectId | string,
    type: typeof NOTIFICATION_TYPES[number],
    priority?: typeof NOTIFICATION_PRIORITY[number],
    title: string,
    message: string,
    data?: Record<string, any>,
    complaintId?: Schema.Types.ObjectId | string
}) => {
    const notification = await NotificationModel.create({
        reciepientId: recipientId,
        type,
        priority,
        title,
        message,
        data: data || {},
        complaintId
    });

    return notification;
};

export default createNotification;