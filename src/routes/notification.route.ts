import { Router } from "express";
import { NotificationController } from "../controller/notification.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.get('/', authenticateToken, NotificationController.getNotifications);
router.patch('/:id/read', authenticateToken, NotificationController.markAsRead);
router.patch('/read-all', authenticateToken, NotificationController.markAllAsRead);
router.delete('/:id', authenticateToken, NotificationController.deleteNotification);
router.delete('/', authenticateToken, NotificationController.deleteMultipleNotifications);

export default router;