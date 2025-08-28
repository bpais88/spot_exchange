import { Router } from 'express';
import { getSupabaseClient } from '@spot-exchange/database';
import { AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Get carrier analytics
router.get('/carrier/:carrierId', async (req: AuthRequest, res) => {
  try {
    const { carrierId } = req.params;
    const supabase = getSupabaseClient();

    // Only allow carriers to view their own analytics or admins/account managers to view all
    if (req.user!.role === 'carrier' && req.user!.id !== carrierId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    // Get bid statistics
    const { data: bidStats, error: bidError } = await supabase
      .from('bids')
      .select('status, amount')
      .eq('carrier_id', carrierId);

    if (bidError) {
      throw bidError;
    }

    // Calculate metrics
    const totalBids = bidStats.length;
    const activeBids = bidStats.filter(b => b.status === 'active').length;
    const acceptedBids = bidStats.filter(b => b.status === 'accepted').length;
    const winRate = totalBids > 0 ? (acceptedBids / totalBids) * 100 : 0;
    const averageBidAmount = totalBids > 0 ? 
      bidStats.reduce((sum, bid) => sum + bid.amount, 0) / totalBids : 0;

    res.json({
      success: true,
      data: {
        totalBids,
        activeBids,
        acceptedBids,
        winRate: Math.round(winRate * 100) / 100,
        averageBidAmount: Math.round(averageBidAmount * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Get carrier analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch analytics',
      },
    });
  }
});

// Get opportunity analytics (account managers and admins only)
router.get('/opportunities', requireRole('account_manager', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const supabase = getSupabaseClient();

    // Get opportunities for the tenant
    const { data: opportunities, error: oppError } = await supabase
      .from('opportunities')
      .select('status, current_best_bid, minimum_rate, created_at')
      .eq('tenant_id', req.user!.tenantId);

    if (oppError) {
      throw oppError;
    }

    // Calculate metrics
    const totalOpportunities = opportunities.length;
    const activeOpportunities = opportunities.filter(o => o.status === 'active').length;
    const completedOpportunities = opportunities.filter(o => o.status === 'completed').length;
    const averageTimeToComplete = 0; // This would require more complex calculation

    const opportunitiesWithBids = opportunities.filter(o => o.current_best_bid).length;
    const bidFillRate = totalOpportunities > 0 ? (opportunitiesWithBids / totalOpportunities) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalOpportunities,
        activeOpportunities,
        completedOpportunities,
        bidFillRate: Math.round(bidFillRate * 100) / 100,
        averageTimeToComplete,
      },
    });
  } catch (error) {
    console.error('Get opportunity analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch analytics',
      },
    });
  }
});

// Get market insights
router.get('/market-insights', async (req: AuthRequest, res) => {
  try {
    const supabase = getSupabaseClient();

    // Get market data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentBids, error: bidError } = await supabase
      .from('bids')
      .select('amount, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'accepted');

    if (bidError) {
      throw bidError;
    }

    // Calculate market insights
    const totalAcceptedBids = recentBids.length;
    const averageRate = totalAcceptedBids > 0 ?
      recentBids.reduce((sum, bid) => sum + bid.amount, 0) / totalAcceptedBids : 0;

    // Group by week for trend analysis
    const weeklyData = recentBids.reduce((acc, bid) => {
      const week = new Date(bid.created_at).getWeek(); // You'd need to implement getWeek()
      if (!acc[week]) acc[week] = [];
      acc[week].push(bid.amount);
      return acc;
    }, {} as Record<number, number[]>);

    res.json({
      success: true,
      data: {
        averageMarketRate: Math.round(averageRate * 100) / 100,
        totalAcceptedBids,
        trend: 'stable', // This would be calculated based on weekly data
        weeklyData: Object.entries(weeklyData).map(([week, amounts]) => ({
          week: parseInt(week),
          averageRate: amounts.reduce((s, a) => s + a, 0) / amounts.length,
          volume: amounts.length,
        })),
      },
    });
  } catch (error) {
    console.error('Get market insights error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch market insights',
      },
    });
  }
});

export default router;