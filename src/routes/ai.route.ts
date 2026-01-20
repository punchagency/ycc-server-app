import { Router } from 'express';
import { AIController } from '../controller/ai.controller';
import { AIStreamController } from '../controller/ai-stream.controller';
import { optionalAuth, authenticateToken } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

const aiChatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req: any) => req.user ? 100 : 20,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/chat', optionalAuth, aiChatLimiter, AIController.chat);
router.post('/chat/stream', optionalAuth, aiChatLimiter, AIStreamController.chatStream);
router.post('/reindex', authenticateToken, AIController.reindexContext);

export default router;
