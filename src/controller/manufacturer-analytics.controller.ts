import { AuthenticatedRequest } from "../middleware";
import { Response } from "express";
import { ManufacturerAnalyticsService } from "../service/manufacturer-analytics.service";
import catchError from "../utils/catchError";

export class ManufacturerAnalyticsController {

    static async productCount(req: AuthenticatedRequest, res: Response) {
        const userId = req.user?._id;
        if(!req.user) return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' })
        const { timeRange, startDate, endDate } = req.query;

        const [error, count] = await catchError(
            ManufacturerAnalyticsService.productCount(userId!, { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any })
        );

        if (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch product count', code: 'SERVER_ERROR' });
        }

        return res.status(200).json({ success: true, message: 'Product count fetched successfully', data: { count } });
    }

    static async activeOrderCount(req: AuthenticatedRequest, res: Response) {
        const userId = req.user?._id;
        if(!req.user) return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' })
        const { timeRange, startDate, endDate } = req.query;

        const [error, count] = await catchError(
            ManufacturerAnalyticsService.activeOrderCount(userId!, { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any })
        );

        if (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch active order count', code: 'SERVER_ERROR' });
        }

        return res.status(200).json({ success: true, message: 'Active order count fetched successfully', data: { count } });
    }

    static async lowStockCount(req: AuthenticatedRequest, res: Response) {
        const userId = req.user?._id;
        if(!req.user) return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' })

        const [error, count] = await catchError(
            ManufacturerAnalyticsService.lowStockCount(userId!)
        );

        if (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch low stock count', code: 'SERVER_ERROR' });
        }

        return res.status(200).json({ success: true, message: 'Low stock count fetched successfully', data: { count } });
    }

    static async totalRevenue(req: AuthenticatedRequest, res: Response) {
        const userId = req.user?._id;
        if(!req.user) return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' })
        const { timeRange, startDate, endDate } = req.query;

        const [error, revenue] = await catchError(
            ManufacturerAnalyticsService.totalRevenue(userId!, { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any })
        );

        if (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch total revenue', code: 'SERVER_ERROR' });
        }

        return res.status(200).json({ success: true, message: 'Total revenue fetched successfully', data: { revenue } });
    }

    static async popularProducts(req: AuthenticatedRequest, res: Response) {
        const userId = req.user?._id;
        if(!req.user) return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' })
        const { timeRange, startDate, endDate, limit } = req.query;

        const [error, products] = await catchError(
            ManufacturerAnalyticsService.popularProducts(userId!, { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any }, limit ? parseInt(limit as string) : 10)
        );

        if (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch popular products', code: 'SERVER_ERROR' });
        }

        return res.status(200).json({ success: true, message: 'Popular products fetched successfully', data: { products } });
    }

    static async topDistributors(req: AuthenticatedRequest, res: Response) {
        const userId = req.user?._id;
        if(!req.user) return res.status(401).json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' })
        const { timeRange, startDate, endDate, limit } = req.query;

        const [error, distributors] = await catchError(
            ManufacturerAnalyticsService.topDistributors(userId!, { timeRange: timeRange as any, startDate: startDate as any, endDate: endDate as any }, limit ? parseInt(limit as string) : 10)
        );

        if (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch top distributors', code: 'SERVER_ERROR' });
        }

        return res.status(200).json({ success: true, message: 'Top distributors fetched successfully', data: { distributors } });
    }
}