import { Router } from 'express';
import { queries } from '@spot-exchange/database';
import { PlaceBidSchema, LockPriceSchema, generateLockFee } from '@spot-exchange/shared';
import { AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Place a bid on an opportunity
router.post('/:opportunityId/bids', async (req: AuthRequest, res) => {
  try {
    const { opportunityId } = req.params;
    const bidData = PlaceBidSchema.parse(req.body);

    // First verify the opportunity exists and is accessible
    const { data: opportunity, error: oppError } = await queries.getOpportunityById(opportunityId);
    
    if (oppError || !opportunity) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Opportunity not found',
        },
      });
    }

    // Check if opportunity is still accepting bids
    if (opportunity.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Opportunity is not accepting bids',
        },
      });
    }

    // Only carriers can place bids
    if (req.user!.role !== 'carrier') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only carriers can place bids',
        },
      });
    }

    // Check minimum bid amount if set
    if (opportunity.minimum_rate && bidData.amount < opportunity.minimum_rate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BID_TOO_LOW',
          message: `Bid must be at least $${opportunity.minimum_rate}`,
        },
      });
    }

    const { data, error } = await queries.placeBid({
      opportunity_id: opportunityId,
      carrier_id: req.user!.id,
      amount: bidData.amount,
      notes: bidData.notes,
      status: 'active',
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to place bid',
        },
      });
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to place bid',
      },
    });
  }
});

// Update a bid
router.put('/:bidId', async (req: AuthRequest, res) => {
  try {
    const { bidId } = req.params;
    const { amount, notes } = req.body;

    // Get the existing bid
    const { data: existingBid, error: bidError } = await queries.getBidsForOpportunity('');
    
    if (bidError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch bid',
        },
      });
    }

    // Only the bid owner can update their bid
    // This will be enforced by RLS policies

    const { data, error } = await queries.updateBid(bidId, {
      amount: amount || undefined,
      notes: notes || undefined,
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update bid',
        },
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Update bid error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update bid',
      },
    });
  }
});

// Withdraw a bid
router.delete('/:bidId', async (req: AuthRequest, res) => {
  try {
    const { bidId } = req.params;

    const { data, error } = await queries.updateBid(bidId, {
      status: 'withdrawn',
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to withdraw bid',
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Bid withdrawn successfully' },
    });
  } catch (error) {
    console.error('Withdraw bid error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to withdraw bid',
      },
    });
  }
});

// Lock bid price
router.post('/:bidId/lock', async (req: AuthRequest, res) => {
  try {
    const { bidId } = req.params;
    const { duration } = LockPriceSchema.parse(req.body);

    // This is a simplified implementation
    // In production, you'd want to check if the bid exists, calculate proper fees, etc.
    
    const lockDurationMs = duration === '24h' ? 24 * 60 * 60 * 1000 : 48 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + lockDurationMs);

    // For now, let's assume we get the bid amount from somewhere
    const bidAmount = 5000; // This should come from the actual bid
    const lockFee = generateLockFee(bidAmount, duration);

    const { data, error } = await queries.updateBid(bidId, {
      status: 'locked',
      locked_until: expiresAt.toISOString(),
      lock_fee: lockFee,
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to lock bid price',
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...data,
        lockFee,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Lock price error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to lock bid price',
      },
    });
  }
});

export default router;