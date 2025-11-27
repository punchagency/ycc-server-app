import {
  getUserStats as getUserStatsService,
  getPlatformTrends as getPlatformTrendsService,
  getLeaderboards as getLeaderboardsService,
} from '../service/adminDashboard.service';

/**
 * GET /api/admin/dashboard/user-stats
 * Returns total crew users, suppliers, and service providers
 */
export const getUserStats = async (_req: any, res: any) => {
  try {
    const stats = await getUserStatsService();
    res.status(200).json(stats);
  } catch (error: any) {
    console.error('Error in getUserStats:', error);
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch user stats'
    });
  }
};

/**
 * GET /api/admin/dashboard/platform-trends
 * Returns chart data for orders, bookings, invoices, and user growth
 * Query parameters:
 * - days: Number of days to look back (default: 30)
 */
export const getPlatformTrends = async (req: any, res: any) => {
  try {
    // Parse days parameter from query string
    const days = parseInt(req.query.days) || 30;

    if (days < 1 || days > 365) {
      return res.status(400).json({
        status: false,
        message: 'Days parameter must be between 1 and 365'
      });
    }

    const trends = await getPlatformTrendsService(days);
    res.status(200).json(trends);
  } catch (error: any) {
    console.error('Error in getPlatformTrends:', error);
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch platform trends'
    });
  }
};

/**
 * GET /api/admin/dashboard/leaderboards
 * Returns leaderboard data for top users, suppliers, and service providers
 */
export const getLeaderboards = async (_req: any, res: any) => {
  try {
    const leaderboards = await getLeaderboardsService();
    res.status(200).json(leaderboards);
  } catch (error: any) {
    console.error('Error in getLeaderboards:', error);
    res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch leaderboards'
    });
  }
};
