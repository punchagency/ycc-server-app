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

// Quote management routes
router.post('/:id/quotes', authenticateToken, BookingController.addQuotes);
router.put('/:id/accept-quote', authenticateToken, BookingController.acceptQuote);
router.put('/:id/reject-quote', authenticateToken, BookingController.rejectQuote);

// Job completion confirmation
router.put('/:id/confirm-completion', authenticateToken, BookingController.confirmCompletion);

// Granular quote item management
// Individual item actions (crew)
router.put('/:id/quote-items/:itemId/accept', authenticateToken, BookingController.acceptQuoteItem);
router.put('/:id/quote-items/:itemId/reject', authenticateToken, BookingController.rejectQuoteItem);
router.put('/:id/quote-items/:itemId/request-edit', authenticateToken, BookingController.requestQuoteItemEdit);

// Bulk actions (crew)
router.put('/:id/quotes/accept-all', authenticateToken, BookingController.acceptAllQuoteItems);
router.put('/:id/quotes/reject-all', authenticateToken, BookingController.rejectAllQuoteItems);

// Update quote item (distributor)
router.patch('/:id/quote-items/:itemId', authenticateToken, BookingController.updateQuoteItem);

// Delete quote item (distributor)
router.delete('/:id/quote-items/:itemId', authenticateToken, BookingController.deleteQuoteItem);

// Payment routes
router.post('/:id/payment', authenticateToken, BookingController.createPayment);
router.post('/:id/balance-payment', authenticateToken, BookingController.createBalancePayment);

// Completed status management
router.patch('/:id/completed-status', authenticateToken, BookingController.updateCompletedStatus);

export default router;
