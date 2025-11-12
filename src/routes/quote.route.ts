import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { QuoteController } from '../controller/quote.controller';

const router = Router();

router.post('/:id/approve', authenticateToken, QuoteController.approveQuoteAndPay);
router.post('/:id/decline', authenticateToken, QuoteController.declineQuote);

export default router;