import { Router } from "express";
import { InvoiceController } from "../controller/invoice.controller";
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, InvoiceController.getInvoices);
router.get('/finance-analytics', authenticateToken, InvoiceController.fetchFinanceAnalytics);

export default router;