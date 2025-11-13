import Notification, { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from '../models/notification.model';

export class NotificationService {
    
    static async getNotifications(userId: string, filters: { page?: number; limit?: number; type?: typeof NOTIFICATION_TYPES[number]; priority?: typeof NOTIFICATION_PRIORITY[number]; read?: boolean; sortBy?: string; orderBy?: string; }) {
        const { page = 1, limit = 20, type, priority, read, sortBy = 'createdAt', orderBy = 'desc' } = filters;
        
        const query: any = { reciepientId: userId };
        if (type) query.type = type;
        if (priority) query.priority = priority;
        if (read !== undefined) query.read = read;

        const skip = (page - 1) * limit;
        const sort: any = { [sortBy]: orderBy === 'asc' ? 1 : -1 };

        const [notifications, total] = await Promise.all([
            Notification.find(query).sort(sort).skip(skip).limit(limit).lean(),
            Notification.countDocuments(query)
        ]);

        return {
            notifications,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        };
    }

    static async markAsRead(notificationId: string, userId: string) {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, reciepientId: userId },
            { read: true },
            { new: true }
        );
        return notification;
    }

    static async markAllAsRead(userId: string) {
        await Notification.updateMany(
            { reciepientId: userId, read: false },
            { read: true }
        );
    }

    static async deleteNotification(notificationId: string, userId: string) {
        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            reciepientId: userId
        });
        return notification;
    }

    static async deleteMultipleNotifications(notificationIds: string[], userId: string) {
        await Notification.deleteMany({
            _id: { $in: notificationIds },
            reciepientId: userId
        });
    }
}