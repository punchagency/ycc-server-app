import { Response } from 'express';
import { InvoiceService } from '../service/invoice.service';
import catchError from '../utils/catchError';
import { logError } from '../utils/SystemLogs';
import { AuthenticatedRequest } from '../middleware';

export class InvoiceController {
    static async getInvoices(req: AuthenticatedRequest, res: Response) {
        if(!req.user){
            return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
        }
        const userId = req.user?._id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        const filters = {
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            businessId: req.query.businessId,
            minAmount: req.query.minAmount,
            maxAmount: req.query.maxAmount,
            page: req.query.page || 1,
            limit: req.query.limit || 10,
            sortBy: req.query.sortBy || 'newest'
        };

        const [error, result] = await catchError(InvoiceService.getInvoices(userId, userRole, filters));

        if (error) {
            await logError({
                message: 'Failed to fetch invoices',
                source: 'InvoiceController.getInvoices',
                additionalData: { userId, error: error.message }
            });
            return res.status(500).json({ success: false, message: 'Failed to fetch invoices', code: 'FETCH_ERROR' });
        }

        return res.status(200).json({
            success: true,
            message: 'Invoices fetched successfully',
            data: result?.invoices,
            pagination: result?.pagination
        });
    }

    static async fetchFinanceAnalytics(req: AuthenticatedRequest, res: Response) {
        if(!req.user){
            return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
        }
        const userId = req.user?._id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        const filters = {
            period: req.query.period,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const [error, analytics] = await catchError(InvoiceService.fetchFinanceAnalytics(userId, userRole, filters));

        if (error) {
            await logError({
                message: 'Failed to fetch finance analytics',
                source: 'InvoiceController.fetchFinanceAnalytics',
                additionalData: { userId, error: error.message }
            });
            return res.status(500).json({ success: false, message: 'Failed to fetch analytics', code: 'ANALYTICS_ERROR' });
        }

        return res.status(200).json({
            success: true,
            message: 'Finance analytics fetched successfully',
            data: analytics
        });
    }
}