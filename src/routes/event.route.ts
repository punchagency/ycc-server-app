import { Router } from 'express';
import { EventController } from '../controller/event.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticateToken, EventController.createEvent);
router.get('/', authenticateToken, EventController.getEvents);
router.get('/:eventId', authenticateToken, EventController.getEventById);
router.put('/:eventId', authenticateToken, EventController.updateEvent);
router.delete('/:eventId', authenticateToken, EventController.deleteEvent);
router.post('/:eventId/guests', authenticateToken, EventController.addEventGuests);
router.delete('/:eventId/guests', authenticateToken, EventController.removeEventGuests);

export default router;
