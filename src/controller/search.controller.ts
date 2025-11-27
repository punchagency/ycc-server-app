import { GlobalSearchDTO } from "../dto/search.dto";
import { AuthenticatedRequest } from "../middleware";
import { Response } from "express";
import catchError from "../utils/catchError";
import { SearchService } from "../service/search.service";


export class SearchController {

    static async globalSearch(req: AuthenticatedRequest, res: Response) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return;
        }
        const { query, type, status, sortBy, order }: GlobalSearchDTO = req.query;

        const [error, result] = await catchError(
            SearchService.globalSearch({ userId: req.user._id, userRole: req.user.role, query, type, status, sortBy, order })
        );
        if (error) {
            res.status(500).json({ success: false, message: 'Failed to perform global search' });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Global search performed successfully',
            data: result
        });
    }
}