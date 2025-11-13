import { AuthenticatedRequest } from "../middleware";
import { Response } from "express";
import { NotificationService } from "../service/notification.service";
import Validate from "../utils/Validate";
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from "../models/notification.model";

export class NotificationController {
    static async getNotifications(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'UNAUTHORIZED' });
                return;
            }

            const { page, limit, type, priority, read, sortBy, orderBy } = req.query;

            if (type && !Validate.oneOf({ allowedValues: NOTIFICATION_TYPES as any, value: type })) {
                res.status(400).json({ success: false, message: 'Invalid notification type', code: 'VALIDATION_ERROR' });
                return;
            }

            if (priority && !Validate.oneOf({ allowedValues: NOTIFICATION_PRIORITY as any, value: priority })) {
                res.status(400).json({ success: false, message: 'Invalid priority', code: 'VALIDATION_ERROR' });
                return;
            }

            const result = await NotificationService.getNotifications(req.user._id, {
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                type: type as any,
                priority: priority as any,
                read: read === 'true' ? true : read === 'false' ? false : undefined,
                sortBy: sortBy as string,
                orderBy: orderBy as string
            });

            res.status(200).json({
                success: true,
                message: 'Notifications fetched successfully',
                data: result.notifications,
                pagination: result.pagination
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
        }
    }

    static async markAsRead(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'UNAUTHORIZED' });
                return;
            }

            const { id } = req.params;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid notification ID', code: 'VALIDATION_ERROR' });
                return;
            }

            const notification = await NotificationService.markAsRead(id, req.user._id);

            if (!notification) {
                res.status(404).json({ success: false, message: 'Notification not found', code: 'NOT_FOUND' });
                return;
            }

            res.status(200).json({ success: true, message: 'Notification marked as read' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
        }
    }

    static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'UNAUTHORIZED' });
                return;
            }

            await NotificationService.markAllAsRead(req.user._id);

            res.status(200).json({ success: true, message: 'All notifications marked as read' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
        }
    }

    static async deleteNotification(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'UNAUTHORIZED' });
                return;
            }

            const { id } = req.params;

            if (!Validate.mongoId(id)) {
                res.status(400).json({ success: false, message: 'Invalid notification ID', code: 'VALIDATION_ERROR' });
                return;
            }

            const notification = await NotificationService.deleteNotification(id, req.user._id);

            if (!notification) {
                res.status(404).json({ success: false, message: 'Notification not found', code: 'NOT_FOUND' });
                return;
            }

            res.status(200).json({ success: true, message: 'Notification deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete notification' });
        }
    }

    static async deleteMultipleNotifications(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required', code: 'UNAUTHORIZED' });
                return;
            }

            const { notificationIds } = req.body;

            if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
                res.status(400).json({ success: false, message: 'Notification IDs array is required', code: 'VALIDATION_ERROR' });
                return;
            }

            for (const id of notificationIds) {
                if (!Validate.mongoId(id)) {
                    res.status(400).json({ success: false, message: 'Invalid notification ID in array', code: 'VALIDATION_ERROR' });
                    return;
                }
            }

            await NotificationService.deleteMultipleNotifications(notificationIds, req.user._id);

            res.status(200).json({ success: true, message: 'Notifications deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete notifications' });
        }
    }
}