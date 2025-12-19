import { AuthenticatedRequest } from "../middleware";
import { Response } from "express";
import { DistributorAnalyticsService } from "../service/distributor-analytics.service";
import catchError from "../utils/catchError";


export class DistributorAnalyticsController {

    static async getTotalProducts(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'distributor') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { timeRange, startDate, endDate } = req.query;
            const [error, result] = await catchError(DistributorAnalyticsService.getTotalProducts(req.user?.businessId ||"", { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any }));

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch total products', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Total products fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getTotalServices(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'distributor') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { timeRange, startDate, endDate } = req.query;
            const [error, result] = await catchError(DistributorAnalyticsService.getTotalServices(req.user?.businessId ||"", { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any }));

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch total services', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Total services fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getLowStockItemsNumber(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'distributor') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const [error, result] = await catchError(DistributorAnalyticsService.getLowStockItemsNumber(req.user?.businessId ||""));

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch low stock items', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Low stock items fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getCustomerRating(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'distributor') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const [error, result] = await catchError(DistributorAnalyticsService.getCustomerRating(req.user._id.toString()));

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch customer rating', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Customer rating fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getActiveOrdersNumber(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'distributor') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { timeRange, startDate, endDate } = req.query;
            const [error, result] = await catchError(DistributorAnalyticsService.getActiveOrdersNumber(req.user?.businessId ||"", { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any }));

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch active orders', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Active orders fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getTotalBookings(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'distributor') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { timeRange, startDate, endDate } = req.query;
            const [error, result] = await catchError(DistributorAnalyticsService.getTotalBookings(req.user?.businessId ||"", { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any }));

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch total bookings', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Total bookings fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getPopularServicesNumber(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'distributor') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { timeRange, startDate, endDate, limit } = req.query;
            const [error, result] = await catchError(DistributorAnalyticsService.getPopularServicesNumber(req.user?.businessId ||"", { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any }, limit ? parseInt(limit as string) : 10));

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch popular services', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Popular services fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getPopularProductsNumber(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'distributor') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { timeRange, startDate, endDate, limit } = req.query;
            const [error, result] = await catchError(DistributorAnalyticsService.getPopularProductsNumber(req.user?.businessId ||"", { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any }, limit ? parseInt(limit as string) : 10));

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch popular products', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Popular products fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
    static async getTotalRevenue(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        };

        if (req.user.role !== 'distributor') {
            res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' });
            return;
        };

        try {
            const { timeRange, startDate, endDate } = req.query;
            const [error, result] = await catchError(DistributorAnalyticsService.getTotalRevenue(req.user?.businessId ||"", { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any }));

            if (error) {
                res.status(400).json({ success: false, message: error.message || 'Failed to fetch total revenue', code: 'FETCH_FAILED' });
                return;
            };

            res.status(200).json({ success: true, message: 'Total revenue fetched successfully', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
        }
    }
}