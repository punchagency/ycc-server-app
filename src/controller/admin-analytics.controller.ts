import { AuthenticatedRequest } from "../middleware";
import { Response } from "express";
import { AdminAnalyticsService } from "../service/admin-analytics.service";
import catchError from "../utils/catchError";


export class AdminAnalyticsController {

    static async getUsersTotal(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'admin') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };
        try {
            const [error, result] = await catchError(AdminAnalyticsService.getUsersTotal());

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch users total', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Users total fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getTotalOrderOverTime(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'admin') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { startDate, endDate, interval } = req.query;
            const [error, result] = await catchError(
                AdminAnalyticsService.getTotalOrderOverTime(
                    startDate ? new Date(startDate as string) : undefined,
                    endDate ? new Date(endDate as string) : undefined,
                    (interval as 'day' | 'week' | 'month') || 'day'
                )
            );

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch orders over time', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Orders over time fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getTotalInvoicesByStatus(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'admin') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const [error, result] = await catchError(AdminAnalyticsService.getTotalInvoicesByStatus());

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch invoices by status', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Invoices by status fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getUserGrowthOverTime(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'admin') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { startDate, endDate, interval } = req.query;
            const [error, result] = await catchError(
                AdminAnalyticsService.getUserGrowthOverTime(
                    startDate ? new Date(startDate as string) : undefined,
                    endDate ? new Date(endDate as string) : undefined,
                    (interval as 'day' | 'week' | 'month') || 'day'
                )
            );

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch user growth', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'User growth fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getTopUsers(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'admin') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { startDate, endDate, limit } = req.query;
            const [error, result] = await catchError(
                AdminAnalyticsService.getTopUsers(
                    startDate ? new Date(startDate as string) : undefined,
                    endDate ? new Date(endDate as string) : undefined,
                    limit ? parseInt(limit as string) : 10
                )
            );

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch top users', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Top users fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getTopDistributors(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'admin') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { startDate, endDate, limit } = req.query;
            const [error, result] = await catchError(
                AdminAnalyticsService.getTopDistributors(
                    startDate ? new Date(startDate as string) : undefined,
                    endDate ? new Date(endDate as string) : undefined,
                    limit ? parseInt(limit as string) : 10
                )
            );

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch top distributors', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Top distributors fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getTopManufacturers(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'admin') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { startDate, endDate, limit } = req.query;
            const [error, result] = await catchError(
                AdminAnalyticsService.getTopManufacturers(
                    startDate ? new Date(startDate as string) : undefined,
                    endDate ? new Date(endDate as string) : undefined,
                    limit ? parseInt(limit as string) : 10
                )
            );

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch top manufacturers', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Top manufacturers fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
}
