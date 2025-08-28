import { Router } from 'express';
import { queries } from '@spot-exchange/database';
import { SendMessageSchema } from '@spot-exchange/shared';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get messages for an opportunity
router.get('/:opportunityId/messages', async (req: AuthRequest, res) => {
  try {
    const { opportunityId } = req.params;

    // First verify user has access to the opportunity
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

    if (opportunity.tenant_id !== req.user!.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const { data, error } = await queries.getMessagesForOpportunity(opportunityId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch messages',
        },
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch messages',
      },
    });
  }
});

// Send a message
router.post('/:opportunityId/messages', async (req: AuthRequest, res) => {
  try {
    const { opportunityId } = req.params;
    const messageData = SendMessageSchema.parse(req.body);

    // First verify user has access to the opportunity
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

    if (opportunity.tenant_id !== req.user!.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const { data, error } = await queries.sendMessage({
      opportunity_id: opportunityId,
      sender_id: req.user!.id,
      message: messageData.message,
      attachments: messageData.attachmentIds ? 
        messageData.attachmentIds.map(id => ({ id, name: '', url: '', size: 0, mimeType: '' })) : 
        [],
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to send message',
        },
      });
    }

    // Record activity
    await queries.recordActivity({
      opportunity_id: opportunityId,
      user_id: req.user!.id,
      activity_type: 'message_sent',
      details: {
        message: messageData.message,
        attachments: messageData.attachmentIds?.length || 0,
      },
    });

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to send message',
      },
    });
  }
});

// Mark message as read
router.patch('/:messageId/read', async (req: AuthRequest, res) => {
  try {
    const { messageId } = req.params;

    const { data, error } = await queries.markMessageAsRead(messageId, req.user!.id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to mark message as read',
        },
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to mark message as read',
      },
    });
  }
});

// Get activity feed for an opportunity
router.get('/:opportunityId/activity', async (req: AuthRequest, res) => {
  try {
    const { opportunityId } = req.params;

    // First verify user has access to the opportunity
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

    if (opportunity.tenant_id !== req.user!.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const { data, error } = await queries.getActivityForOpportunity(opportunityId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch activity',
        },
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch activity',
      },
    });
  }
});

export default router;