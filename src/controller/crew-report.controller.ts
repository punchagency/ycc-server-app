import { Response } from 'express';
import { CrewReportService } from '../service/crew-report.service';
import catchError from '../utils/catchError';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class CrewReportController {
    private service: CrewReportService;

    constructor() {
        this.service = new CrewReportService();
    }

    getDashboardSummary = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                code: 'UNAUTHORIZED'
            });
        }
        const [error, data] = await catchError(
            this.service.getDashboardSummary(req.user!._id.toString(), req.query)
        );

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Error generating dashboard summary',
                code: 'REPORT_ERROR'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Dashboard summary generated successfully',
            data
        });
    };

    generateReport = async (req: AuthenticatedRequest, res: Response) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                code: 'UNAUTHORIZED'
            });
        }
        const [error, data] = await catchError(
            this.service.generateReport(req.user!._id.toString(), req.body)
        );

        if (error) {
            return res.status(error.message === 'Invalid file type' ? 400 : 500).json({
                success: false,
                message: error.message || 'Error generating report',
                code: error.message === 'Invalid file type' ? 'VALIDATION_ERROR' : 'REPORT_ERROR'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Report generated successfully',
            data
        });
    };
}