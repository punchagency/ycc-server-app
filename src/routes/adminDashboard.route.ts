import { Router, Response, NextFunction } from 'express';
import {
  getUserStats as getUserStatsController,
  getPlatformTrends as getPlatformTrendsController,
  getLeaderboards as getLeaderboardsController,
} from '../controller/adminDashboard.controller';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Middleware to check if user is admin
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      status: false,
      message: 'Access denied. Admin privileges required.'
    });
    return;
  }
  next();
};

// Admin dashboard routes
router.get('/user-stats', authenticateToken, requireAdmin, getUserStatsController);
router.get('/platform-trends', authenticateToken, requireAdmin, getPlatformTrendsController);
router.get('/leaderboards', authenticateToken, requireAdmin, getLeaderboardsController);

export default router;
