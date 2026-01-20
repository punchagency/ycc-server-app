import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AIService } from '../service/ai.service';
import catchError from '../utils/catchError';

export class AIController {
    static async chat(req: AuthenticatedRequest, res: Response) {
        const { message, sessionId } = req.body;

        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const userId = req.user?._id;

        const [error, result] = await catchError(
            AIService.chat({ message, userId, sessionId })
        );

        if (error) {
            res.status(500).json({ error: 'Failed to process chat request' });
            return;
        }

        res.json({
            success: true,
            data: result,
            authenticated: !!userId
        });
    }

    static async reindexContext(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'admin') {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        const [error] = await catchError(
            AIService.indexAIContext(true)
        );

        if (error) {
            res.status(500).json({ error: 'Failed to reindex context' });
            return;
        }

        res.json({
            success: true,
            message: 'AI context reindexed successfully'
        });
    }
}
