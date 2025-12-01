import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { AdminReportService } from "../service/admin-report.service";
import catchError from "../utils/catchError";

export class AdminReportController {
    private service: AdminReportService;

    constructor() {
        this.service = new AdminReportService();
    }

    getRevenueStats = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                code: 'UNAUTHORIZED'
            });
        }
        if(req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden',
                code: 'FORBIDDEN'
            });
        }
        const period = parseInt(req.query.period as string) || 30;
        const [error, data] = await catchError(this.service.getRevenueStats(period));

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch revenue stats',
                code: 'REPORT_ERROR'
            });
        }

        return res.status(200).json({ success: true, message: 'Revenue stats retrieved', data });
    };

    getActiveUsersStats = async (req: AuthenticatedRequest, res: Response) => {
        const period = parseInt(req.query.period as string) || 30;
        const [error, data] = await catchError(this.service.getActiveUsersStats(period));

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch active users stats',
                code: 'REPORT_ERROR'
            });
        }

        return res.status(200).json({ success: true, message: 'Active users stats retrieved', data });
    };

    getInventoryHealthStats = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                code: 'UNAUTHORIZED'
            });
        }
        if(req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden',
                code: 'FORBIDDEN'
            });
        }
        const [error, data] = await catchError(this.service.getInventoryHealthStats());

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch inventory health stats',
                code: 'REPORT_ERROR'
            });
        }

        return res.status(200).json({ success: true, message: 'Inventory health stats retrieved', data });
    };

    getBookingPerformanceStats = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                code: 'UNAUTHORIZED'
            });
        }
        if(req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden',
                code: 'FORBIDDEN'
            });
        }
        const period = parseInt(req.query.period as string) || 30;
        const [error, data] = await catchError(this.service.getBookingPerformanceStats(period));

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch booking performance stats',
                code: 'REPORT_ERROR'
            });
        }

        return res.status(200).json({ success: true, message: 'Booking performance stats retrieved', data });
    };

    getReportsCharts = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                code: 'UNAUTHORIZED'
            });
        }
        if(req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden',
                code: 'FORBIDDEN'
            });
        }
        const period = parseInt(req.query.period as string) || 30;
        const [error, data] = await catchError(this.service.getReportsCharts(period));

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch reports charts',
                code: 'REPORT_ERROR'
            });
        }

        return res.status(200).json({ success: true, message: 'Reports charts retrieved', data });
    };
}