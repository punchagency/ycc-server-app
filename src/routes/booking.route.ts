import { Router } from 'express';
import { BookingController } from '../controller/booking.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { fileUploadService, UPLOAD_CONFIGS } from '../integration/fileUpload';

const router = Router();

router.post(
    '/',
    authenticateToken,
    fileUploadService.createUploadMiddleware(UPLOAD_CONFIGS.BOOKING_FILES),
    BookingController.createBooking
);

router.get('/', authenticateToken, BookingController.getBookings);
router.get('/:id', authenticateToken, BookingController.getBookingById);
router.patch('/:id/confirm', authenticateToken, BookingController.confirmBooking);
router.patch('/:id/status', authenticateToken, BookingController.updateBookingStatus);

export default router;
